"""Rehearse provider replies without authentication, network or real sends."""
from copy import deepcopy
from dataclasses import replace
import json

import pytest

from penguin.calendar_only import APP_CREATED, plan_calendar_insert
from penguin.delivery_safety import (DeliverySafetyError, FixtureDeliveryJournal,
                                    new_fixture_operation, validate_calendar_receipt)
from penguin.slack_draft import plan_slack_delivery
from test_calendar_only import OPERATION, fixture_binding, plan as calendar_plan, request_args
from test_slack_draft import args as slack_args, manifest_args


def event_response(plan=None):
    p = calendar_plan() if plan is None else plan
    return {**deepcopy(p['request']['body']), 'status': 'confirmed',
            'organizer': {'email': p['fixture_binding']['calendar_id']},
            'htmlLink': 'https://calendar.google.com/calendar/event?eid=fixture-only'}


def text_response(plan=None):
    p = plan_slack_delivery(**slack_args()) if plan is None else plan
    return {'ok': True, 'channel': p['destination']['channel_id'], 'ts': '1794060001.000001',
            'message': {'ts': '1794060001.000001', 'thread_ts': p['destination'].get('thread_ts'),
                        'text': p['share_draft']['content']}}


def journal(provider='slack', *, image=False):
    p = calendar_plan() if provider == 'calendar' else plan_slack_delivery(**(manifest_args() if image else slack_args()))
    j = FixtureDeliveryJournal()
    s = j.create(provider, p, operation_id=OPERATION)
    j.review(OPERATION, expected_plan_snapshot_digest=s['plan_snapshot_digest'])
    return j, p


def begin_image_to(j, p, step):
    j.begin(OPERATION)
    if step == 'obtain_upload':
        return
    j.result(OPERATION, outcome='accepted', response={'ok': True, 'file_id': 'F0123456789',
              'upload_url': 'https://files.slack.com/upload/v1/fixture?bearer=DO-NOT-KEEP'})
    j.begin(OPERATION)
    if step == 'upload_reviewed_bytes':
        return
    image = p['share_draft']['attachment']
    j.result(OPERATION, outcome='accepted', response={'status_code': 200, 'sha256': image['sha256'], 'bytes': image['bytes']})
    j.begin(OPERATION)


@pytest.mark.parametrize('provider', ['slack', 'calendar'])
def test_success_is_only_a_fixture_never_delivery_or_consent(provider):
    j, p = journal(provider)
    j.begin(OPERATION)
    result = j.result(OPERATION, outcome='accepted', response=event_response(p) if provider == 'calendar' else text_response(p))
    assert result['status'] == 'fixture_provider_accepted'
    assert not result['authorized_to_send'] and not result['actual_delivery_verified']
    assert not result['live_transport_available'] and result['network_calls'] == 0
    assert not result['durably_persisted']
    with pytest.raises(DeliverySafetyError): j.begin(OPERATION)
    with pytest.raises(DeliverySafetyError): j.result(OPERATION, outcome='accepted', response={})


@pytest.mark.parametrize('provider', ['slack', 'calendar'])
def test_duplicate_operation_and_payload_change_cannot_restart(provider):
    j, p = journal(provider)
    with pytest.raises(DeliverySafetyError, match='already exists'): j.create(provider, p, operation_id=OPERATION)
    changed = deepcopy(p)
    changed['extra'] = 'new payload'
    with pytest.raises(DeliverySafetyError, match='already exists'): j.create(provider, changed, operation_id=OPERATION)
    j.begin(OPERATION)
    with pytest.raises(DeliverySafetyError): j.begin(OPERATION)


@pytest.mark.parametrize('provider', ['slack', 'calendar'])
@pytest.mark.parametrize('outcome,status', [('unknown', 'needs_reconciliation'), ('conflict', 'needs_reconciliation'),
                                           ('rejected', 'stopped_for_review'), ('rate_limited', 'stopped_for_review')])
def test_uncertain_rejected_and_rate_limited_results_never_retry(provider, outcome, status):
    j, _ = journal(provider)
    j.begin(OPERATION)
    s = j.result(OPERATION, outcome=outcome, response={'token': 'MUST-NOT-RETAIN', 'error': 'synthetic'})
    assert s['status'] == status and 'MUST-NOT-RETAIN' not in json.dumps(s)
    with pytest.raises(DeliverySafetyError): j.begin(OPERATION)


@pytest.mark.parametrize('response', [None, [], 'invalid JSON', {'ok': False}, {'ok': True},
    {**text_response(), 'channel': 'C1123456789'}, {**text_response(), 'ts': 'missing'},
    {**text_response(), 'message': {'text': 'wrong'}}])
def test_false_or_mismatched_slack_success_needs_reconciliation(response):
    j, _ = journal()
    j.begin(OPERATION)
    assert j.result(OPERATION, outcome='accepted', response=response)['status'] == 'needs_reconciliation'
    with pytest.raises(DeliverySafetyError): j.begin(OPERATION)


def test_slack_wrong_thread_is_not_success():
    j, p = journal(); j.begin(OPERATION)
    r = text_response(p); r['message']['thread_ts'] = '1794060009.000009'
    assert j.result(OPERATION, outcome='accepted', response=r)['status'] == 'needs_reconciliation'


@pytest.mark.parametrize('step', ['obtain_upload', 'upload_reviewed_bytes', 'complete_upload'])
def test_partial_upload_retains_exact_last_stage_and_does_not_restart(step):
    j, p = journal(image=True)
    begin_image_to(j, p, step)
    s = j.result(OPERATION, outcome='unknown')
    assert s['status'] == 'needs_reconciliation' and s['attempted_steps'][-1] == step
    assert ('file_id' in s['fixture_artifacts']) == (step != 'obtain_upload')
    assert s['fixture_artifacts'].get('file_id') in (None, 'F0123456789')
    with pytest.raises(DeliverySafetyError): j.begin(OPERATION)


@pytest.mark.parametrize('url', ['http://files.slack.com/upload/v1/fixture',
    'https://files.slack.com.evil.example/upload/v1/a', 'https://evil.example/upload/v1/a',
    'https://files.slack.com@evil.example/upload/v1/a', 'https://user@files.slack.com/upload/v1/a',
    'https://files.slack.com:444/upload/v1/a', 'https://files.slack.com/not-upload',
    'https://files.slack.com/upload/v1/a#fragment', 'https://files.slack.com:bad/upload/v1/a'])
def test_upload_destination_is_fixed_and_unexpected_url_is_not_followed(url):
    j, p = journal(image=True); j.begin(OPERATION)
    assert j.result(OPERATION, outcome='accepted', response={'ok': True, 'file_id': 'F0123456789', 'upload_url': url})['status'] == 'needs_reconciliation'


def test_image_completion_is_not_claimed_channel_delivery_and_bearer_is_not_retained():
    j, p = journal(image=True); begin_image_to(j, p, 'complete_upload')
    s = j.result(OPERATION, outcome='accepted', response={'ok': True, 'files': [{'id': 'F0123456789'}]})
    assert s['status'] == 'fixture_provider_accepted'
    assert s['fixture_artifacts']['upload_completion_accepted']
    assert not s['fixture_artifacts']['channel_share_verified']
    assert s['fixture_artifacts']['needs_manual_channel_verification']
    assert s['fixture_artifacts']['permalink'] is None
    assert 'DO-NOT-KEEP' not in json.dumps(s) and 'upload_url' not in json.dumps(s['history'])


def test_upload_hash_and_completed_file_id_must_match_review():
    for step, response in [('upload_reviewed_bytes', {'status_code': 200, 'sha256': 'b'*64, 'bytes': 10000}),
                           ('complete_upload', {'ok': True, 'files': [{'id': 'F1123456789'}]})]:
        j, p = journal(image=True); begin_image_to(j, p, step)
        assert j.result(OPERATION, outcome='accepted', response=response)['status'] == 'needs_reconciliation'


@pytest.mark.parametrize('change', [lambda r:r.update(id='other'), lambda r:r.update(status='cancelled'),
    lambda r:r.update(summary='changed'), lambda r:r.update(description='changed'),
    lambda r:r.update(recurrence=['RRULE:FREQ=DAILY']), lambda r:r.update(attendeesOmitted=True),
    lambda r:r.update(attendees=[]), lambda r:r['attendees'].append({'email':'extra@example.com'}),
    lambda r:r['attendees'].append(deepcopy(r['attendees'][0])),
    lambda r:r['start'].update(dateTime='2026-11-16T13:01:00Z'),
    lambda r:r['end'].update(dateTime='2026-11-16T14:01:00Z'),
    lambda r:r['start'].update(dateTime='2026-11-16T13:00:00'),
    lambda r:r.update(start={'date':'2026-11-16'}),
    lambda r:r.update(guestsCanInviteOthers=True), lambda r:r.pop('guestsCanSeeOtherGuests')])
def test_calendar_response_must_match_exact_review(change):
    j,p=journal('calendar');j.begin(OPERATION);r=event_response(p);change(r)
    assert j.result(OPERATION,outcome='accepted',response=r)['status']=='needs_reconciliation'


@pytest.mark.parametrize('organizer',[None,{}, {'email':'unexpected@example.com'},{'self':True}])
def test_calendar_organizer_must_match_pinned_calendar(organizer):
    p=calendar_plan();r=event_response(p);r['organizer']=organizer
    with pytest.raises(DeliverySafetyError,match='organizer'):validate_calendar_receipt(p,r)


@pytest.mark.parametrize('link', ['http://calendar.google.com/calendar/event', 'https://evil.example/e',
    'https://calendar.google.com.evil.example/e', 'https://user@calendar.google.com/e',
    'https://calendar.google.com:bad/e','https://calendar.google.com/other?secret=do-not-retain',
    'https://calendar.google.com/calendar/event?eid=fixture&secret=do-not-retain',
    'https://calendar.google.com/calendar/event?eid=fixture&eid=other',
    'https://calendar.google.com/calendar/event?eid=fixture#private', 1])
def test_calendar_response_links_are_not_blindly_accepted(link):
    p=calendar_plan();r=event_response(p);r['htmlLink']=link
    with pytest.raises(DeliverySafetyError):validate_calendar_receipt(p,r)


def test_valid_shape_provider_link_is_not_retained_as_verified_event_link():
    p=calendar_plan();r=event_response(p)
    receipt=validate_calendar_receipt(p,r)
    assert receipt['provider_link'] is None and not receipt['provider_link_verified']
    assert r['htmlLink'] not in json.dumps(receipt)


def test_calendar_409_or_timeout_requires_exact_readback_and_never_resends():
    for outcome in ['conflict','unknown']:
        j,p=journal('calendar');j.begin(OPERATION);j.result(OPERATION,outcome=outcome)
        wrong=event_response(p);wrong['summary']='other event'
        with pytest.raises(DeliverySafetyError):j.reconcile_calendar(OPERATION,event_response=wrong)
        assert j.get(OPERATION)['status']=='needs_reconciliation'
        r=event_response(p)
        # Different offset, same instant is valid.
        r['start']['dateTime']='2026-11-16T21:00:00+08:00'
        s=j.reconcile_calendar(OPERATION,event_response=r)
        assert s['status']=='fixture_provider_accepted' and len(s['attempted_steps'])==1
        assert s['fixture_artifacts']['invite_emails_delivered'] is None
        assert not s['fixture_artifacts']['attendee_acceptance_verified']
        with pytest.raises(DeliverySafetyError):j.begin(OPERATION)


def test_calendar_approval_digest_binds_identity_client_actor_and_scopes():
    a=request_args();p=calendar_plan()
    other=replace(fixture_binding(),oauth_client_id='other-client',created_by_client_id='other-client')
    q=plan_calendar_insert(a,other,[APP_CREATED],actor_subject='subject-fixture',operation_id=OPERATION)
    assert p['request_digest']==q['request_digest'] and p['plan_digest']!=q['plan_digest']
    j=FixtureDeliveryJournal();s=j.create('calendar',q,operation_id=OPERATION)
    prior=new_fixture_operation('calendar',p,operation_id=OPERATION)
    with pytest.raises(DeliverySafetyError):j.review(OPERATION,expected_plan_snapshot_digest=prior['plan_snapshot_digest'])
    assert s['status']=='needs_fixture_review'


def test_calendar_journal_id_matches_provider_event_id():
    with pytest.raises(DeliverySafetyError,match='deterministic'):new_fixture_operation('calendar',calendar_plan(),operation_id='00000000-0000-4000-8000-000000000000')


def test_no_result_before_attempt_and_no_stale_mutation_of_current_state():
    j,p=journal()
    with pytest.raises(DeliverySafetyError):j.result(OPERATION,outcome='accepted',response=text_response(p))
    returned=j.get(OPERATION);returned['plan']['destination']['channel_id']='C1123456789'
    assert j.get(OPERATION)['plan']['destination']==p['destination']
    tampered=deepcopy(p);tampered['share_draft']['content']='malicious change'
    with pytest.raises(DeliverySafetyError):new_fixture_operation('slack',tampered,operation_id=OPERATION)


def test_no_file_process_network_or_live_sender_can_be_reached(monkeypatch):
    import builtins,socket,subprocess
    from penguin.slack_draft import send_slack_delivery
    from penguin.calendar_only import send_calendar_insert
    j,p=journal();response=text_response(p)
    def fail(*a,**k):raise AssertionError('Unexpected external I/O')
    monkeypatch.setattr(builtins,'open',fail);monkeypatch.setattr(socket,'create_connection',fail);monkeypatch.setattr(subprocess,'run',fail)
    j.begin(OPERATION);s=j.result(OPERATION,outcome='accepted',response=response)
    for send in [send_slack_delivery,send_calendar_insert]:
        with pytest.raises(ValueError):send(s,approved=True,token='fake')
    assert s['network_calls']==0 and not s['authorized_to_send']
