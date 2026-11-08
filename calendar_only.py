"""Offline, fixture-backed policy for a future Calendar-only transport.

This module cannot authenticate, read credentials, open files, contact Google,
create calendars, or send invitations. Every result is an UNAPPROVED plan.
Provenance objects below are test fixtures, NOT authenticated OAuth evidence.
Do not expose their construction to an agent and mistake it for authorization.
"""
from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import json
from urllib.parse import quote
from uuid import UUID

from .core import prepare_handoff

APP_CREATED = "https://www.googleapis.com/auth/calendar.app.created"
IDENTITY_SCOPES = frozenset({"openid", "email", "https://www.googleapis.com/auth/userinfo.email"})
REQUESTED_CALENDAR_SCOPES = (APP_CREATED,)


class CalendarPolicyError(ValueError):
    """A request is outside the offline prototype's narrowly bounded policy."""


def check_calendar_only_scopes(granted_scopes):
    """Check actual granted metadata, not requested scopes. Never read a token.

    Identity/email-address scopes are not Gmail inbox scopes. Any broad Calendar,
    Gmail, Drive, Docs, Contacts, Sheets, or future unknown scope fails closed.
    Free/busy is intentionally not included in this first writer prototype.
    """
    if not isinstance(granted_scopes, (tuple, list, set, frozenset)) or not granted_scopes:
        raise CalendarPolicyError("Explicit granted-scope metadata is required.")
    if any(not isinstance(s, str) or not s or s != s.strip() for s in granted_scopes):
        raise CalendarPolicyError("Invalid granted-scope metadata.")
    granted = frozenset(granted_scopes)
    if APP_CREATED not in granted:
        raise CalendarPolicyError("calendar.app.created is required; no broad-scope fallback.")
    if granted - {APP_CREATED} - IDENTITY_SCOPES:
        raise CalendarPolicyError("Unexpected or broad access scope: refuse this grant.")
    return tuple(sorted(granted))


@dataclass(frozen=True)
class FixtureCalendarBinding:
    """Fictional provisioning evidence. Real provider validation is NOT built.

    A future production boundary must supply immutable, server-owned data from
    validated OAuth identity and a recorded app-created calendar response.
    An email claim, calendar ID suffix, or caller boolean is not enough.
    """
    account_subject: str
    account_email: str
    oauth_client_id: str
    calendar_id: str
    created_by_client_id: str
    owner_subject: str

    def validate(self):
        fields = (self.account_subject, self.account_email, self.oauth_client_id,
                  self.calendar_id, self.created_by_client_id, self.owner_subject)
        if any(not isinstance(v, str) or not v or v != v.strip() for v in fields):
            raise CalendarPolicyError("Incomplete fixture binding.")
        if self.calendar_id == "primary" or "@" not in self.calendar_id or any(c in self.calendar_id for c in "/?#\n\r"):
            raise CalendarPolicyError("Only a pinned secondary calendar identifier may be planned.")
        if self.created_by_client_id != self.oauth_client_id:
            raise CalendarPolicyError("Calendar was not created by the bound OAuth client.")
        if self.owner_subject != self.account_subject:
            raise CalendarPolicyError("The bound account must own this prototype's calendar.")


def plan_calendar_insert(args, binding, granted_scopes, *, actor_subject, operation_id):
    """Build one unapproved, offline insert plan. No network transport exists.

    OAuth scopes restrict provider access; a pinned calendar ID separately
    narrows application behavior. A different calendar/account/client/actor,
    or an expanded grant, requires a new reviewed binding, never a fallback.
    """
    if not isinstance(binding, FixtureCalendarBinding):
        raise CalendarPolicyError("Only explicit fixture bindings are supported offline.")
    binding.validate()
    scopes = check_calendar_only_scopes(granted_scopes)
    if actor_subject != binding.owner_subject:
        raise CalendarPolicyError("Only the configured owner can prepare this booking review.")
    try:
        operation = UUID(operation_id)
        if str(operation) != operation_id:
            raise ValueError("Noncanonical operation ID")
    except (ValueError, TypeError, AttributeError) as exc:
        raise CalendarPolicyError("An explicit canonical operation UUID is required.") from exc

    # Uses the deterministic engine and the same reviewed member mappings.
    handoff = prepare_handoff(args)
    google = handoff["google"]
    if google["account_email"].casefold() != binding.account_email.casefold():
        raise CalendarPolicyError("Draft account does not match the bound account.")
    if google["params"]["calendarId"] != binding.calendar_id:
        raise CalendarPolicyError("Draft calendar does not match the pinned calendar.")
    if google["params"]["sendUpdates"] != "all":
        raise CalendarPolicyError("Invitation prototype requires explicit all-guest notifications; it cannot silently book.")

    body = google["body"]
    # Restrict guest capabilities; these flags must be visible in final review.
    body.update({"guestsCanInviteOthers": False, "guestsCanModify": False,
                 "guestsCanSeeOtherGuests": False, "id": "penguin" + operation.hex})
    request = {"method": "POST", "origin": "https://www.googleapis.com",
               "path": "/calendar/v3/calendars/" + quote(binding.calendar_id, safe="") + "/events",
               "params": {"sendUpdates": "all"}, "body": body}
    serialized = json.dumps(request, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    result = {
        "mode": "offline_fixture_plan", "executed": False, "approved": False,
        "live_transport_available": False, "credentials_accessed": False,
        "request": request, "request_digest": sha256(serialized.encode()).hexdigest(),
        "fixture_binding": {"mode": "fixture_only", "provider_verified": False,
                            "account_subject": binding.account_subject,
                            "account_email": binding.account_email,
                            "oauth_client_id": binding.oauth_client_id,
                            "calendar_id": binding.calendar_id,
                            "created_by_client_id": binding.created_by_client_id,
                            "owner_subject": binding.owner_subject,
                            "actor_subject": actor_subject,
                            "granted_scopes": list(scopes)},
        "review": {"account_email": binding.account_email, "calendar_id": binding.calendar_id,
                   "attendees": [p["email"] for p in body["attendees"]],
                   "guest_list_visible_to_guests": False, "invite_notifications": "all",
                   "calendar_conflicts_checked": False, "participant_agreement_verified": False,
                   "work_hours_fit": handoff["availability"]["work_hours_fit"],
                   "work_hours_warning": None if handoff["availability"]["work_hours_fit"] else "Outside saved work hours: organizer must review the externally agreed exception.",
                   "actor_subject": actor_subject, "granted_scopes": list(scopes)},
        "required_before_live": [
            "Replace fixture identity/provenance with validated, server-owned OAuth evidence.",
            "Confirm this managed account has Calendar enabled and permits this OAuth client.",
            "Check actual granted scopes; reject combined broad grants from previous consent.",
            "Live negative test: primary and unrelated calendars must be inaccessible.",
            "Review participants, exact time, externally agreed exceptions and the owner's confirmation; do not claim calendar conflicts were checked.",
            "Store an approval bound to the exact payload and operation; a draft is not approval.",
            "Use a durable operation journal; reconcile uncertain outcomes before retries.",
        ]}
    # HTTP request identity is not enough: approval must also bind the exact
    # account/client/actor/calendar provenance/scope context. Fixture only here.
    result["plan_digest"] = sha256(json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return result


def send_calendar_insert(*args, **kwargs):
    """Deliberate hard stop. A caller cannot turn a fixture plan into a live call."""
    raise CalendarPolicyError("Live Calendar transport is not implemented or authorized in this prototype.")
