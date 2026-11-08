"""No credentials, OAuth, browser, network, or real accounts are used."""
from copy import deepcopy
from dataclasses import replace
import json

import pytest

from penguin.calendar_only import APP_CREATED, CalendarPolicyError, FixtureCalendarBinding, check_calendar_only_scopes, plan_calendar_insert, send_calendar_insert
from test_handoff import handoff_args

OPERATION = "879156aa-e88c-4b51-aa1d-7a0e47de366e"
SECONDARY = "fictional-only@group.calendar.google.com"


def fixture_binding():
    return FixtureCalendarBinding("subject-fixture", "owner@example.com", "client-fixture", SECONDARY, "client-fixture", "subject-fixture")


def request_args():
    a = handoff_args()
    a["google"]["calendar_id"] = SECONDARY
    return a


def plan(args=None, binding=None, scopes=None, actor="subject-fixture", operation=OPERATION):
    return plan_calendar_insert(request_args() if args is None else args, fixture_binding() if binding is None else binding,
                                [APP_CREATED] if scopes is None else scopes, actor_subject=actor, operation_id=operation)


def test_no_inbox_or_broad_calendar_permission_in_requested_policy():
    from penguin.calendar_only import REQUESTED_CALENDAR_SCOPES
    assert REQUESTED_CALENDAR_SCOPES == (APP_CREATED,)
    assert check_calendar_only_scopes([APP_CREATED]) == (APP_CREATED,)
    assert set(check_calendar_only_scopes([APP_CREATED, "openid", "email"])) == {APP_CREATED, "openid", "email"}


@pytest.mark.parametrize("extra", ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.modify", "https://mail.google.com/", "https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.events.owned", "https://www.googleapis.com/auth/calendar.events.readonly", "https://www.googleapis.com/auth/calendar.calendarlist", "https://www.googleapis.com/auth/calendar.acls", "https://www.googleapis.com/auth/calendar.freebusy", "https://www.googleapis.com/auth/contacts.readonly", "https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/documents", "future.unknown"])
def test_broad_or_unrequested_granted_scope_rejected(extra):
    with pytest.raises(CalendarPolicyError):
        plan(scopes=[APP_CREATED, extra])


@pytest.mark.parametrize("scopes", [[], None, "https://www.googleapis.com/auth/calendar.app.created", ["email"], [APP_CREATED + " "], [APP_CREATED, None]])
def test_missing_or_invalid_granted_metadata_rejected(scopes):
    with pytest.raises(CalendarPolicyError):
        check_calendar_only_scopes(scopes)


def test_only_pinned_secondary_calendar_allowed():
    for target in ["primary", "other@group.calendar.google.com", "owner@example.com"]:
        a = request_args()
        a["google"]["calendar_id"] = target
        with pytest.raises(CalendarPolicyError):
            plan(a)


def test_binding_cannot_select_primary_or_other_oauth_client_or_owner():
    for bad in [replace(fixture_binding(), calendar_id="primary"), replace(fixture_binding(), created_by_client_id="other-client"), replace(fixture_binding(), owner_subject="different-owner")]:
        with pytest.raises(CalendarPolicyError):
            plan(binding=bad)
    with pytest.raises(CalendarPolicyError):
        plan(binding={"calendar_id": SECONDARY, "approved": True})


def test_cannot_switch_account_or_claim_actor_by_display_name():
    a = request_args()
    a["google"]["account_email"] = "someone-else@example.com"
    with pytest.raises(CalendarPolicyError):
        plan(a)
    for actor in ["Owner", "owner@example.com", "different-subject", None]:
        with pytest.raises(CalendarPolicyError):
            plan(actor=actor)


def test_plan_has_fixed_google_origin_method_destination_no_secrets_and_private_guest_list():
    p = plan()
    assert p["request"]["method"] == "POST"
    assert p["request"]["origin"] == "https://www.googleapis.com"
    assert p["request"]["path"] == "/calendar/v3/calendars/fictional-only%40group.calendar.google.com/events"
    assert p["request"]["params"] == {"sendUpdates": "all"}
    b = p["request"]["body"]
    assert not b["guestsCanInviteOthers"] and not b["guestsCanModify"] and not b["guestsCanSeeOtherGuests"]
    assert b["id"] == "penguin879156aae88c4b51aa1d7a0e47de366e"
    assert all(a["responseStatus"] == "needsAction" for a in b["attendees"])
    assert p["mode"] == "offline_fixture_plan" and not p["executed"] and not p["approved"]
    assert not p["live_transport_available"] and not p["credentials_accessed"]
    assert not p["review"]["calendar_conflicts_checked"] and not p["review"]["participant_agreement_verified"]
    assert "Authorization" not in p["request"] and "token" not in p["request"]


def test_payload_changes_invalidate_review_digest_without_changing_operation_id():
    a = request_args()
    before = deepcopy(a)
    first = plan(a)
    assert a == before
    a["title"] = "New meeting title"
    second = plan(a)
    assert first["request_digest"] != second["request_digest"]
    assert first["request"]["body"]["id"] == second["request"]["body"]["id"]
    assert first["request_digest"] == plan()["request_digest"]


@pytest.mark.parametrize("operation", ["", "not-uuid", OPERATION.upper(), None])
def test_canonical_operation_uuid_required(operation):
    with pytest.raises(CalendarPolicyError):
        plan(operation=operation)


def test_no_silent_booking_and_work_hour_exception_is_visible():
    for field, value in [("send_updates", "none")]:
        a = request_args()
        a["google"][field] = value
        with pytest.raises(CalendarPolicyError):
            plan(a)
    a = request_args()
    a["selection"]["local_time"] = "2026-11-16T23:30"
    p = plan(a)
    assert not p["review"]["work_hours_fit"]
    assert p["review"]["work_hours_warning"]
    assert not p["approved"] and not p["executed"]


def test_unsupported_fields_cannot_expand_google_operations():
    from penguin.core import InputError
    for field in ["method", "access_token", "scopes", "endpoint", "approved"]:
        a = request_args()
        a["google"][field] = "untrusted"
        with pytest.raises(InputError):
            plan(a)


def test_no_file_process_or_network_access_and_send_is_hard_disabled(monkeypatch):
    import builtins
    import socket
    import subprocess
    # Warm the fixed bundled tzdb only; no runtime credential APIs exist here.
    plan()
    def blocked(*a, **k):
        raise AssertionError("External I/O attempted")
    monkeypatch.setattr(builtins, "open", blocked)
    monkeypatch.setattr(socket, "create_connection", blocked)
    monkeypatch.setattr(subprocess, "run", blocked)
    assert not plan()["executed"]
    with pytest.raises(CalendarPolicyError, match="not implemented"):
        send_calendar_insert(plan(), approved=True)


def test_calendar_review_does_not_require_a_buzz_connection():
    a = request_args()
    a.pop("buzz")
    assert plan(a)["mode"] == "offline_fixture_plan"
