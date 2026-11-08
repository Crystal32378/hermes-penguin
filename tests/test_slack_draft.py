"""Synthetic Slack plans only. No token, installation, upload or send."""
from copy import deepcopy
import json
import pytest
from penguin.core import InputError
from penguin.group_share import SharePlanError,existing_proposal_text,selection_fingerprint
from penguin.slack_draft import plan_slack_delivery,record_fixture_review,send_slack_delivery
from test_handoff import handoff_args


def args():
    s=handoff_args()['selection']
    return {'selection':s,'copied_proposal':existing_proposal_text(s),'target':{'platform':'slack','workspace_id':'T0123456789','channel_id':'C0123456789','thread_ts':'1794060000.000001'},'expected_selection_fingerprint':selection_fingerprint(s)}

def image_args():
    a=args();a.update(exported_png=b'\x89PNG\r\n\x1a\nmock-only-not-rendered',export_selection_fingerprint=a['expected_selection_fingerprint']);return a


def test_text_plan_preserves_existing_caption_and_disables_all_delivery():
    a=args();p=plan_slack_delivery(**a)
    assert p['required_scopes']==['chat:write'] and p['feature_scope_proposal']==['chat:write','files:write']
    assert not p['sent'] and not p['approved'] and not p['live_transport_available']
    assert not p['credentials_accessed'] and not p['actual_grants_verified'] and not p['channel_membership_verified']
    assert p['message_ts'] is None and p['permalink'] is None
    assert len(p['steps'])==1 and p['steps'][0]['method']=='chat.postMessage'
    body=p['steps'][0]['arguments'];assert body['text']==a['copied_proposal']
    assert body['channel']=='C0123456789' and body['thread_ts']=='1794060000.000001'
    assert body['parse']=='none' and not body['mrkdwn'] and not body['link_names']
    assert not body['unfurl_links'] and not body['unfurl_media']


def test_image_uses_three_phase_external_upload_plan_and_same_caption_once():
    a=image_args();before=deepcopy(a);p=plan_slack_delivery(**a)
    assert a==before and p['required_scopes']==['files:write']
    assert [s.get('method',s.get('operation')) for s in p['steps']]==['files.getUploadURLExternal','upload_exact_reviewed_bytes','files.completeUploadExternal']
    assert all(not s['executed'] for s in p['steps'])
    assert p['steps'][0]['arguments']['length']==len(a['exported_png'])
    assert not p['steps'][1]['provider_upload_url_available'] and not p['steps'][2]['provider_file_id_available']
    complete=p['steps'][2]['arguments_template']
    assert complete['initial_comment']==a['copied_proposal'] and complete['channel_id']=='C0123456789'
    assert 'id_from_step' in complete['files'][0] and 'id' not in complete['files'][0]
    assert not p['share_draft']['attachment']['visual_provenance_verified']
    assert 'files.upload"' not in json.dumps(p)


@pytest.mark.parametrize('target',[{'platform':'slack','workspace_id':'T0123456789','channel_id':'D0123456789'},{'platform':'slack','workspace_id':'T0123456789','channel_id':'general'},{'platform':'slack','workspace_id':'penguintest','channel_id':'C0123456789'},{'platform':'slack','workspace_id':'T0123456789','channel_id':'C0123456789','thread_ts':'not-a-time'}])
def test_only_exact_workspace_and_group_channel_ids_allowed(target):
    a=args();a['target']=target
    with pytest.raises((InputError,SharePlanError)):plan_slack_delivery(**a)


@pytest.mark.parametrize('name',['<!channel>','<@U0123456789>','@here','@everyone','<#C0123456789>'])
def test_active_mentions_rejected_without_silently_rewriting_card(name):
    a=args();a['selection']['team']['members'][0]['name']=name
    a['copied_proposal']=existing_proposal_text(a['selection']);a['expected_selection_fingerprint']=selection_fingerprint(a['selection'])
    with pytest.raises(SharePlanError,match='mention'):plan_slack_delivery(**a)


def test_matching_review_fixture_still_never_grants_send():
    p=plan_slack_delivery(**args())
    receipt=record_fixture_review(p,expected_plan_digest=p['plan_digest'],expected_destination=p['destination'],expected_caption=p['share_draft']['content'])
    assert receipt['acknowledged_for_test'] and not receipt['authorized_to_send'] and not receipt['sent']
    with pytest.raises(SharePlanError,match='not implemented'):send_slack_delivery(p,receipt=receipt,approved=True)


@pytest.mark.parametrize('change',[lambda p:p['destination'].update(channel_id='C1123456789'),lambda p:p['steps'][0]['arguments'].update(text='different'),lambda p:p['share_draft'].update(content='different'),lambda p:p.update(approved=True)])
def test_review_rejects_any_mutated_payload(change):
    p=plan_slack_delivery(**args());old=deepcopy(p);change(p)
    with pytest.raises(SharePlanError,match='changed'):record_fixture_review(p,expected_plan_digest=old['plan_digest'],expected_destination=old['destination'],expected_caption=old['share_draft']['content'])


def test_changed_attachment_invalidates_prior_review():
    a=image_args();p=plan_slack_delivery(**a);a['exported_png']+=b'new';new=plan_slack_delivery(**a)
    with pytest.raises(SharePlanError):record_fixture_review(new,expected_plan_digest=p['plan_digest'],expected_destination=p['destination'],expected_caption=p['share_draft']['content'])


def test_wrong_review_channel_or_caption_rejected_even_if_digest_matches():
    p=plan_slack_delivery(**args())
    with pytest.raises(SharePlanError):record_fixture_review(p,expected_plan_digest=p['plan_digest'],expected_destination={**p['destination'],'channel_id':'C1123456789'},expected_caption=p['share_draft']['content'])
    with pytest.raises(SharePlanError):record_fixture_review(p,expected_plan_digest=p['plan_digest'],expected_destination=p['destination'],expected_caption='other')


def test_neither_token_nor_upload_url_is_accepted_in_target():
    for field in ['bot_token','access_token','upload_url','approved']:
        a=args();a['target'][field]='mock'
        with pytest.raises(InputError):plan_slack_delivery(**a)


def test_plan_and_review_do_not_touch_network_files_or_processes(monkeypatch):
    import builtins,socket,subprocess
    a=args();p=plan_slack_delivery(**a)
    def fail(*args,**kwargs):raise AssertionError('Unexpected side effect')
    monkeypatch.setattr(builtins,'open',fail);monkeypatch.setattr(socket,'create_connection',fail);monkeypatch.setattr(subprocess,'run',fail)
    again=plan_slack_delivery(**a);assert again==p
    record_fixture_review(p,expected_plan_digest=p['plan_digest'],expected_destination=p['destination'],expected_caption=p['share_draft']['content'])


def manifest_args():
    a=args();a['export_manifest']={'selection':deepcopy(a['selection']),'sha256':'a'*64,'bytes':10000,'width':1000,'height':300};return a


def test_metadata_only_image_plan_binds_caption_target_and_image_without_receiving_bytes():
    a=manifest_args();p=plan_slack_delivery(**a)
    image=p['share_draft']['attachment']
    assert image['candidate_metadata_only'] and not image['bytes_received_by_gateway'] and not image['bytes_integrity_verified']
    assert p['required_scopes']==['files:write'] and p['steps'][2]['arguments_template']['initial_comment']==a['copied_proposal']
    assert image['sha256']=='a'*64 and image['selection_fingerprint']==a['expected_selection_fingerprint']
    receipt=record_fixture_review(p,expected_plan_digest=p['plan_digest'],expected_destination=p['destination'],expected_caption=p['share_draft']['content'])
    assert not receipt['authorized_to_send']
    a['export_manifest']['sha256']='b'*64;changed=plan_slack_delivery(**a)
    assert changed['plan_digest']!=p['plan_digest']
    with pytest.raises(SharePlanError):record_fixture_review(changed,expected_plan_digest=p['plan_digest'],expected_destination=p['destination'],expected_caption=p['share_draft']['content'])


@pytest.mark.parametrize('change',[lambda m:m['selection'].update(local_time='2026-11-16T22:00'),lambda m:m.update(sha256='not-a-hash'),lambda m:m.update(bytes=8),lambda m:m.update(bytes=9*1024*1024),lambda m:m.update(width=True),lambda m:m.update(height=5000),lambda m:m.update(url='https://example.com/image.png')])
def test_image_manifest_is_bounded_and_cannot_introduce_file_or_network_source(change):
    a=manifest_args();change(a['export_manifest'])
    with pytest.raises((InputError,SharePlanError)):plan_slack_delivery(**a)


def test_two_image_sources_are_rejected():
    a=image_args();a['export_manifest']=manifest_args()['export_manifest']
    with pytest.raises(SharePlanError,match='not both'):plan_slack_delivery(**a)
