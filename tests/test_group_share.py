from copy import deepcopy
import json
from pathlib import Path
import subprocess

import pytest

from penguin.core import InputError, preview
from penguin.group_share import SharePlanError, existing_proposal_text, plan_existing_card_share, selection_fingerprint, send_existing_card
from test_handoff import handoff_args


def selection(): return handoff_args()["selection"]
def discord(): return {"platform":"discord","guild_id":"123456789012345678","channel_id":"234567890123456789","thread_id":"345678901234567890"}
def buzz(): return {"platform":"buzz","relay_url":"https://fictional.communities.buzz.xyz","channel_id":"9c90a727-38c2-4abe-a8f1-71871eedc0ea","thread_root_id":"a"*64}
def args():
    s=selection()
    return dict(selection=s,copied_proposal=existing_proposal_text(s),target=discord(),expected_selection_fingerprint=selection_fingerprint(s))


def test_exact_copy_matches_existing_javascript_proposal_function():
    # Executes only the existing small pure function, not the app or any browser.
    src=(Path(__file__).parents[1]/"desktop/plugin.js").read_text()
    function=src[src.index("function proposal(slot)"):src.index("function clockMinutes")]
    for time in ["2026-11-16T21:00","2026-11-16T23:30"]:
        s=selection();s["local_time"]=time
        script=function+"\nconst slot="+json.dumps(preview(s))+";process.stdout.write(proposal(slot)+(slot.all_available?'':'\\nNote: this time is outside at least one member’s work hours.'));"
        result=subprocess.run(["node","-e",script],capture_output=True,text=True,check=True)
        assert result.stdout == existing_proposal_text(s)


@pytest.mark.parametrize("target", [discord(),buzz()])
def test_existing_text_is_preserved_for_both_group_adapters_without_sending(target):
    a=args();a["target"]=target;r=plan_existing_card_share(**a)
    assert r["content"]==a["copied_proposal"] and not r["new_card_design"]
    assert not r["approved"] and not r["sent"] and not r["live_transport_available"]
    assert r["message_id"] is None and r["permalink"] is None
    assert not r["destination"]["verified"] and r["requires_organizer_review"]
    assert r["attachment"] is None and any("export the existing" in x for x in r["requires_before_send"])
    assert "neither reads nor tallies" in r["discussion"]


def test_discord_does_not_ping_everyone_or_users():
    assert plan_existing_card_share(**args())["mention_policy"]=={"parse":[],"replied_user":False}


def test_exported_existing_card_bytes_bound_to_selection_and_review_not_uploaded():
    a=args();a.update(exported_png=b"\x89PNG\r\n\x1a\nfixture-only-not-a-real-image",export_selection_fingerprint=a["expected_selection_fingerprint"])
    before=deepcopy(a);r=plan_existing_card_share(**a)
    assert a==before and not r["sent"]
    assert r["attachment"]["source_component"]=="existing SendOff"
    assert not r["attachment"]["visual_provenance_verified"]
    assert r["attachment"]["filename"]=="penguin-meeting-proposal.png"
    a["exported_png"]+=b"changed"
    assert plan_existing_card_share(**a)["review_digest"] != r["review_digest"]


@pytest.mark.parametrize("change", [lambda a:a["selection"].update(local_time="2026-11-16T21:15"),lambda a:a.update(copied_proposal="Different proposal"),lambda a:a.update(expected_selection_fingerprint="stale")])
def test_stale_time_or_text_rejected(change):
    a=args();change(a)
    with pytest.raises(SharePlanError): plan_existing_card_share(**a)


def test_stale_or_invalid_image_rejected():
    for data,fp in [(b"\x89PNG\r\n\x1a\nfixture","old"),(b"not-png",selection_fingerprint(selection())),(b"\x89PNG\r\n\x1a\n"+b"x"*(8*1024*1024),selection_fingerprint(selection()))]:
        a=args();a.update(exported_png=data,export_selection_fingerprint=fp)
        with pytest.raises(SharePlanError): plan_existing_card_share(**a)


@pytest.mark.parametrize("bad", [{"platform":"slack"},{"platform":"discord","guild_id":"Nous","channel_id":"general"},{"platform":"buzz","relay_url":"https://fictional.communities.buzz.xyz","channel_id":"general"}])
def test_target_requires_identifiers_not_display_names(bad):
    a=args();a["target"]=bad
    with pytest.raises((SharePlanError,InputError)): plan_existing_card_share(**a)


def test_changed_channel_changes_review_digest():
    a=args();r=plan_existing_card_share(**a)
    a["target"]["thread_id"]="456789012345678901"
    assert plan_existing_card_share(**a)["review_digest"] != r["review_digest"]


def test_no_credential_or_approval_fields_accepted_in_destination():
    for field in ["bot_token","private_key","approved"]:
        a=args();a["target"][field]="not accepted"
        with pytest.raises(InputError): plan_existing_card_share(**a)


def test_send_is_disabled_even_with_approval_boolean():
    with pytest.raises(SharePlanError,match="not implemented"):
        send_existing_card(plan_existing_card_share(**args()),approved=True)
