"""Offline UI route tests: no credentials, desktop, calendar or relay writes."""
import importlib.util
from copy import deepcopy
from pathlib import Path
import pytest
from test_handoff import handoff_args
from penguin.group_share import existing_proposal_text
from test_hermes_integration import SOURCE, state

pytestmark = pytest.mark.skipif(not SOURCE, reason='Requires official Hermes source for plugin routes')

@pytest.fixture
def client(state):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    spec=importlib.util.spec_from_file_location('penguin_offline_ui_api',Path(__file__).parents[1]/'dashboard/plugin_api.py')
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    app=FastAPI();app.include_router(mod.router,prefix='/api/plugins/penguin')
    return TestClient(app)

def group_body(platform='discord'):
    s=handoff_args()['selection']
    target={'platform':'discord','guild_id':'123456789012345678','channel_id':'234567890123456789'} if platform=='discord' else {'platform':'buzz',**handoff_args()['buzz']}
    return {'selection':s,'copied_proposal':existing_proposal_text(s),'target':target}

def calendar_body():
    a=handoff_args();a.pop('buzz');a['google']['calendar_id']='fictional@group.calendar.google.com';return a

@pytest.mark.parametrize('platform',['discord','buzz'])
def test_real_share_route_uses_existing_copy_not_helper_summary(client,state,platform):
    b=group_body(platform);r=client.post('/api/plugins/penguin/handoff/share',json=b).json()
    assert r['ok'] and r['result']['content']==b['copied_proposal']
    assert not r['result']['sent'] and not r['result']['destination']['verified']
    assert r['result']['attachment'] is None and not state.path.exists()

@pytest.mark.parametrize('key,value',[('approved',True),('exported_png','data:image/png;base64,fake'),('bot_token','not-a-secret'),('send',True)])
def test_share_route_rejects_extra_approval_credentials_or_files(client,key,value):
    b=group_body();b[key]=value
    assert not client.post('/api/plugins/penguin/handoff/share',json=b).json()['ok']

def test_share_route_rejects_stale_text(client):
    b=group_body();b['selection']['local_time']='2026-11-16T22:00'
    assert not client.post('/api/plugins/penguin/handoff/share',json=b).json()['ok']

def test_calendar_route_is_unbound_not_real_identity_or_provenance(client,state):
    r=client.post('/api/plugins/penguin/handoff/calendar',json=calendar_body()).json()
    assert r['ok'];p=r['result']
    assert not p['executed'] and not p['approved'] and not p['calendar_provenance_verified']
    assert not p['google']['identity_verified'] and not p['live_transport_available']
    assert p['scope_proposal']==['https://www.googleapis.com/auth/calendar.app.created']
    assert p['google']['params']['sendUpdates']=='all' and 'buzz' not in p
    assert not p['google']['body']['guestsCanInviteOthers'] and not p['google']['body']['guestsCanSeeOtherGuests']
    assert not state.path.exists()

@pytest.mark.parametrize('change',[lambda a:a['google'].update(calendar_id='primary'),lambda a:a['google'].update(send_updates='none'),lambda a:a.update(token='not-a-token'),lambda a:a.update(buzz=handoff_args()['buzz']),lambda a:a.update(approved=True)])
def test_calendar_route_rejects_scope_creep_or_silent_invite(client,change):
    b=calendar_body();change(b)
    assert not client.post('/api/plugins/penguin/handoff/calendar',json=b).json()['ok']

def test_changed_calendar_payload_changes_review_fingerprint(client):
    a=calendar_body();r1=client.post('/api/plugins/penguin/handoff/calendar',json=a).json()['result']
    a['google']['attendees'][0]['email']='other@example.com'
    r2=client.post('/api/plugins/penguin/handoff/calendar',json=a).json()['result']
    assert r1['review_fingerprint']!=r2['review_fingerprint']

def test_outside_work_hours_is_warning_not_fake_consent(client):
    b=calendar_body();b['selection']['local_time']='2026-11-16T23:30'
    r=client.post('/api/plugins/penguin/handoff/calendar',json=b).json()['result']
    assert not r['availability']['work_hours_fit'] and r['availability']['participant_confirmation']=='not_collected'
    assert not r['executed']

def test_no_send_or_auth_routes_exist(client):
    for route in ['handoff/send','handoff/calendar/send','handoff/share/send','oauth','auth','connect']:
        assert client.post('/api/plugins/penguin/'+route,json={}).status_code==404


def test_slack_ui_route_returns_minimal_text_adapter_plan(client,state):
    b=group_body();b['target']={'platform':'slack','workspace_id':'T0123456789','channel_id':'C0123456789'}
    r=client.post('/api/plugins/penguin/handoff/share',json=b).json()
    assert r['ok'];p=r['result']
    assert p['mode']=='offline_slack_delivery_plan' and p['required_scopes']==['chat:write']
    assert p['steps'][0]['arguments']['text']==b['copied_proposal']
    assert not p['sent'] and not p['approved'] and not state.path.exists()


def test_share_route_rejects_non_object_destination_cleanly(client):
    b=group_body();b['target']='not-a-target'
    r=client.post('/api/plugins/penguin/handoff/share',json=b)
    assert r.status_code==200 and not r.json()['ok']


def test_slack_ui_route_binds_image_metadata_without_image_upload(client):
    b=group_body();b['target']={'platform':'slack','workspace_id':'T0123456789','channel_id':'C0123456789'}
    b['export_manifest']={'selection':deepcopy(b['selection']),'sha256':'a'*64,'bytes':10000,'width':1000,'height':300}
    r=client.post('/api/plugins/penguin/handoff/share',json=b).json();assert r['ok'];p=r['result']
    assert p['required_scopes']==['files:write'] and not p['share_draft']['attachment']['bytes_received_by_gateway']
    b['export_manifest']['sha256']='b'*64
    q=client.post('/api/plugins/penguin/handoff/share',json=b).json()['result']
    assert p['plan_digest']!=q['plan_digest']


def test_other_platform_does_not_silently_ignore_image_metadata(client):
    b=group_body();b['export_manifest']={'selection':deepcopy(b['selection']),'sha256':'a'*64,'bytes':10000,'width':1000,'height':300}
    assert not client.post('/api/plugins/penguin/handoff/share',json=b).json()['ok']
