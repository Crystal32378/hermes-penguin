"""Synthetic fixtures only: no calendar, relay, credentials, or desktop access."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path

import pytest

from penguin.core import execute
from penguin.service import handler
from test_core import member
from test_hermes_integration import SOURCE, state


def handoff_args():
    return {
        "selection": {"team": {"name": "Fictional", "members": [
            member("A", "Asia/Taipei", "20:00", "23:00"),
            member("B", "America/New_York", "08:00", "11:00")]},
            "reference_zone": "Asia/Taipei", "local_time": "2026-11-16T21:00", "duration_minutes": 60},
        "title": "Fictional planning session",
        "google": {"account_email": "owner@example.com", "calendar_id": "primary", "send_updates": "all",
                   "attendees": [{"member_name": "A", "email": "a@example.com"}, {"member_name": "B", "email": "b@example.com"}]},
        "buzz": {"relay_url": "https://fictional.communities.buzz.xyz", "channel_id": "9c90a727-38c2-4abe-a8f1-71871eedc0ea"}}


def draft(args=None):
    result = execute("prepare_handoff", handoff_args() if args is None else args)
    assert result["ok"], result
    return result["result"]


def test_both_destinations_are_draft_only_and_exact_time():
    r = draft()
    assert r["status"] == "draft_only" and not r["executed"] and not r["consent_recorded"]
    assert r["approval_required"] and not r["google"]["identity_verified"] and not r["buzz"]["target_verified"]
    assert r["google"]["body"]["start"] == {"dateTime": "2026-11-16T13:00:00Z", "timeZone": "UTC"}
    assert r["google"]["body"]["end"]["dateTime"] == "2026-11-16T14:00:00Z"
    assert r["google"]["params"] == {"calendarId": "primary", "sendUpdates": "all"}
    assert [m["responseStatus"] for m in r["google"]["body"]["attendees"]] == ["needsAction", "needsAction"]
    assert not r["availability"]["calendar_busy_checked"]
    assert r["availability"]["participant_confirmation"] == "not_collected"
    assert r["google"]["event_id"] is None and r["buzz"]["event_id"] is None
    assert r["google"]["html_link"] is None and r["buzz"]["deep_link"] is None


def test_buzz_draft_does_not_leak_attendee_addresses_or_google_description():
    a = handoff_args()
    a["description"] = "Calendar-only notes"
    r = draft(a)
    assert "@example.com" not in r["buzz"]["content"]
    assert "Calendar-only notes" not in r["buzz"]["content"]
    assert "No event or invitation has been created" in r["buzz"]["content"]


def test_deterministic_fingerprint_changes_with_selection_destination_or_content():
    a = handoff_args()
    before = deepcopy(a)
    r = draft(a)
    assert a == before
    assert r["review_fingerprint"] == draft(a)["review_fingerprint"]
    for change in [lambda x: x.update(title="Different title"),
                   lambda x: x["selection"].update(local_time="2026-11-16T21:15"),
                   lambda x: x["google"].update(send_updates="none"),
                   lambda x: x["buzz"].update(relay_url="https://other.communities.buzz.xyz")]:
        other = deepcopy(a)
        change(other)
        assert draft(other)["review_fingerprint"] != r["review_fingerprint"]


def test_draft_never_touches_state_credentials_network_or_processes(monkeypatch):
    import socket
    import subprocess
    import builtins
    def forbidden(*a, **k):
        raise AssertionError("External side effect attempted")
    # Warm the fixed bundled tzdb reads before blocking all file/process/network I/O.
    draft()
    monkeypatch.setattr(socket, "create_connection", forbidden)
    monkeypatch.setattr(subprocess, "run", forbidden)
    monkeypatch.setattr(builtins, "open", forbidden)
    class Context:
        @property
        def state(self):
            forbidden()
    r = json.loads(handler("prepare_handoff", Context())(handoff_args()))
    assert r["ok"] and r["result"]["executed"] is False


@pytest.mark.parametrize("email", ["guess", "x@example.com\nBcc: victim@example.com", "a..b@example.com", "a@-bad.example", "x@local", "x@example..com", "名@example.com"])
def test_bad_emails_fail_closed(email):
    a = handoff_args()
    a["google"]["attendees"][0]["email"] = email
    assert not execute("prepare_handoff", a)["ok"]


@pytest.mark.parametrize("edit", [
    lambda x: x["google"]["attendees"].pop(),
    lambda x: x["google"]["attendees"][0].update(member_name="Unknown"),
    lambda x: x["google"]["attendees"][1].update(email="A@example.com"),
    lambda x: x["google"]["attendees"][1].update(member_name="A"),
    lambda x: x["google"].pop("send_updates"),
    lambda x: x["google"].update(send_updates="externalOnly"),
    lambda x: x["google"].update(token="not-accepted"),
    lambda x: x["selection"].update(start_utc="2026-11-16T00:00Z"),
    lambda x: x.update(approved=True),
])
def test_no_inferred_identities_or_smuggled_authorization(edit):
    a = handoff_args()
    edit(a)
    assert not execute("prepare_handoff", a)["ok"]


@pytest.mark.parametrize("relay", ["http://public.example", "https://localhost", "https://127.0.0.1", "https://host.local", "https://user:secret@host.example", "https://host.example/path", "https://host.example?secret=x", "https://host.example:abc", "https://host.example:8000"])
def test_relay_must_be_explicit_https_community_origin(relay):
    a = handoff_args()
    a["buzz"]["relay_url"] = relay
    assert execute("prepare_handoff", a)["error"]["code"] == "invalid_relay"


def test_thread_id_and_channel_are_validated_not_trusted():
    a = handoff_args()
    a["buzz"]["channel_id"] = "general"
    assert execute("prepare_handoff", a)["error"]["code"] == "invalid_channel"
    a = handoff_args()
    a["buzz"]["thread_root_id"] = "a" * 64
    r = draft(a)
    assert r["buzz"]["thread_root_id"] == "a" * 64 and not r["buzz"]["target_verified"]
    a["buzz"]["thread_root_id"] = "unverified-url"
    assert execute("prepare_handoff", a)["error"]["code"] == "invalid_thread"


def test_work_hours_failures_do_not_become_booking_success():
    a = handoff_args()
    a["selection"]["local_time"] = "2026-11-16T23:30"
    r = draft(a)
    assert not r["availability"]["work_hours_fit"] and not r["executed"]
    assert any("does not fit" in w for w in r["warnings"])


def test_none_means_no_notification_not_private_booking():
    a = handoff_args()
    a["google"]["send_updates"] = "none"
    assert any("not guaranteed private" in w for w in draft(a)["warnings"])


def test_dst_ambiguity_rejected_until_explicit_choice_and_elapsed_duration_preserved():
    a = handoff_args()
    a["selection"].update(reference_zone="America/New_York", local_time="2026-11-01T01:30", duration_minutes=120)
    assert execute("prepare_handoff", a)["error"]["code"] == "ambiguous_local_time"
    a["selection"]["ambiguity"] = "earlier"
    first = draft(a)
    a["selection"]["ambiguity"] = "later"
    second = draft(a)
    assert first["google"]["body"]["start"]["dateTime"] == "2026-11-01T05:30:00Z"
    assert first["google"]["body"]["end"]["dateTime"] == "2026-11-01T07:30:00Z"
    assert second["google"]["body"]["start"]["dateTime"] == "2026-11-01T06:30:00Z"


def test_utc_date_rollover():
    a = handoff_args()
    a["selection"].update(reference_zone="Pacific/Kiritimati", local_time="2026-01-01T00:15")
    assert draft(a)["google"]["body"]["start"]["dateTime"] == "2025-12-31T10:15:00Z"


@pytest.mark.skipif(not SOURCE, reason="Set HERMES_SOURCE to run real Hermes integration checks")
def test_real_plugin_route_matches_pure_tool_without_state(state):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    spec = importlib.util.spec_from_file_location("penguin_handoff_test_api", Path(__file__).parents[1] / "dashboard/plugin_api.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    app = FastAPI()
    app.include_router(mod.router, prefix="/api/plugins/penguin")
    client = TestClient(app)
    r = client.post("/api/plugins/penguin/handoff/prepare", json=handoff_args())
    assert r.status_code == 200
    assert r.json() == execute("prepare_handoff", handoff_args())
    assert not state.path.exists()
