"""Pure, OFFLINE delivery rehearsal and receipt checks.

There is no HTTP client, credential source, SDK, filesystem journal or sender.
Calling these functions consumes synthetic provider replies, not a provider.
The test-only review never grants authority to transmit. A future live adapter
must separately implement authenticated bindings, real approval and a durable
operation journal. This reducer makes its failure/retry rules executable now.
"""
from copy import deepcopy
from datetime import datetime
from hashlib import sha256
import json
import re
from urllib.parse import parse_qsl, urlsplit
from uuid import UUID


class DeliverySafetyError(ValueError):
    pass


def _hash(value):
    return sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _canonical_uuid(value):
    try:
        if str(UUID(value)) != value:
            raise ValueError("Noncanonical UUID")
    except (ValueError, TypeError, AttributeError) as exc:
        raise DeliverySafetyError("A canonical fixture operation UUID is required.") from exc
    return value


def _plan(provider, plan):
    if not isinstance(plan, dict):
        raise DeliverySafetyError("An existing offline plan is required.")
    p = deepcopy(plan)
    if provider == "slack":
        digest = p.pop("plan_digest", None)
        if (p.get("mode") != "offline_slack_delivery_plan" or digest != _hash(p)
                or p.get("sent") is not False or p.get("approved") is not False
                or p.get("live_transport_available") is not False):
            raise DeliverySafetyError("Slack plan changed or is not an offline fixture.")
        p["plan_digest"] = digest
        expected = ["post_text"] if p["share_draft"]["attachment"] is None else ["obtain_upload", "upload_reviewed_bytes", "complete_upload"]
        if [s.get("id") for s in p["steps"]] != expected:
            raise DeliverySafetyError("Unsupported Slack step sequence.")
        return p, expected
    if provider == "calendar":
        digest = p.pop("plan_digest", None)
        if (p.get("mode") != "offline_fixture_plan" or p.get("executed") is not False
                or p.get("approved") is not False or p.get("live_transport_available") is not False
                or p.get("request_digest") != _hash(p.get("request")) or digest != _hash(p)):
            raise DeliverySafetyError("Calendar plan changed or is not an offline fixture.")
        p["plan_digest"] = digest
        request = p["request"]
        if (request.get("method") != "POST" or request.get("origin") != "https://www.googleapis.com"
                or request.get("params") != {"sendUpdates": "all"}):
            raise DeliverySafetyError("Unsupported Calendar operation.")
        return p, ["insert_event"]
    raise DeliverySafetyError("Only existing Slack and Calendar plans are rehearsed.")


def _seal(state):
    state.pop("state_digest", None)
    state["state_digest"] = _hash(state)
    return state


def _read(state):
    if not isinstance(state, dict):
        raise DeliverySafetyError("Missing fixture state.")
    s = deepcopy(state)
    digest = s.pop("state_digest", None)
    if digest != _hash(s) or s.get("mode") != "offline_delivery_rehearsal":
        raise DeliverySafetyError("Fixture state changed outside the reducer.")
    if s.get("live_transport_available") is not False or s.get("authorized_to_send") is not False:
        raise DeliverySafetyError("A rehearsal cannot become a live authorization.")
    _plan(s["provider"], s["plan"])
    return s


def new_fixture_operation(provider, plan, *, operation_id):
    """Pin one payload. No ID denotes a real external operation or permission."""
    p, steps = _plan(provider, plan)
    _canonical_uuid(operation_id)
    if provider == "calendar" and p["request"]["body"].get("id") != "penguin" + UUID(operation_id).hex:
        raise DeliverySafetyError("Journal operation must match the deterministic Calendar event ID.")
    return _seal({
        "mode": "offline_delivery_rehearsal", "provider": provider,
        "operation_id": operation_id, "plan": p,
        "plan_snapshot_digest": _hash(p), "steps": steps, "next_step": 0,
        "status": "needs_fixture_review", "pending_step": None,
        "attempted_steps": [], "fixture_artifacts": {}, "history": [],
        "live_transport_available": False, "authorized_to_send": False,
        "network_calls": 0, "actual_delivery_verified": False,
        "durably_persisted": False,
    })


def acknowledge_fixture_review(state, *, expected_plan_snapshot_digest):
    s = _read(state)
    if s["status"] != "needs_fixture_review" or expected_plan_snapshot_digest != s["plan_snapshot_digest"]:
        raise DeliverySafetyError("Review the exact current fixture payload once.")
    s["status"] = "ready_for_fixture_attempt"
    s["history"].append({"kind": "fixture_review_only", "authorized_to_send": False})
    return _seal(s)


def begin_fixture_attempt(state):
    """Record a simulated attempt *before* consuming a reply, never send it."""
    s = _read(state)
    if s["status"] != "ready_for_fixture_attempt":
        raise DeliverySafetyError("No retry or send is allowed from this state.")
    step = s["steps"][s["next_step"]]
    if step in s["attempted_steps"]:
        raise DeliverySafetyError("Duplicate fixture attempt rejected.")
    s["attempted_steps"].append(step)
    s["pending_step"] = step
    s["status"] = "awaiting_fixture_result"
    s["history"].append({"kind": "fixture_attempt", "step": step})
    return _seal(s)


def _instant(value):
    if not isinstance(value, dict) or not isinstance(value.get("dateTime"), str):
        raise DeliverySafetyError("Calendar receipt needs timed start and end, not an all-day event.")
    try:
        d = datetime.fromisoformat(value["dateTime"].replace("Z", "+00:00"))
    except ValueError as exc:
        raise DeliverySafetyError("Invalid event date/time.") from exc
    if d.tzinfo is None or d.utcoffset() is None:
        raise DeliverySafetyError("Calendar receipt must include a UTC offset.")
    return d


def validate_calendar_receipt(plan, response):
    """Conservative exact-event reconciliation; does not verify email delivery."""
    p, _ = _plan("calendar", plan)
    if not isinstance(response, dict):
        raise DeliverySafetyError("Calendar result is not an event resource.")
    b = p["request"]["body"]
    if (response.get("id") != b["id"] or response.get("status") != "confirmed"
            or response.get("summary") != b["summary"]
            or response.get("description", "") != b.get("description", "")
            or response.get("recurrence") or response.get("recurringEventId")):
        raise DeliverySafetyError("Calendar event differs from the reviewed single event.")
    if _instant(response.get("start")) != _instant(b["start"]) or _instant(response.get("end")) != _instant(b["end"]):
        raise DeliverySafetyError("Calendar event time differs from the reviewed slot.")
    attendees = response.get("attendees")
    if not isinstance(attendees, list) or response.get("attendeesOmitted") is True:
        raise DeliverySafetyError("Full exact attendee set is needed to reconcile this operation.")
    emails = [a.get("email", "").casefold() for a in attendees if isinstance(a, dict) and isinstance(a.get("email"), str)]
    expected = [a["email"].casefold() for a in b["attendees"]]
    if len(emails) != len(attendees) or len(emails) != len(set(emails)) or sorted(emails) != sorted(expected):
        raise DeliverySafetyError("Calendar attendee set differs from review.")
    for flag in ("guestsCanInviteOthers", "guestsCanModify", "guestsCanSeeOtherGuests"):
        if response.get(flag) is not False:
            raise DeliverySafetyError("Calendar guest privacy flags were not confirmed.")
    organizer = response.get("organizer")
    if not isinstance(organizer, dict) or organizer.get("email") != p["fixture_binding"]["calendar_id"]:
        raise DeliverySafetyError("Calendar organizer must match the pinned secondary calendar; investigate any difference.")
    link = response.get("htmlLink")
    if link is not None:
        try:
            u = urlsplit(link) if isinstance(link, str) else None
            query = parse_qsl(u.query, keep_blank_values=True, strict_parsing=True) if u else []
            valid = (u is not None and u.scheme == "https" and u.hostname == "calendar.google.com"
                     and not u.username and not u.password and u.port in (None, 443) and not u.fragment
                     and u.path in ("/calendar/event", "/calendar/r/event")
                     and len(query) == 1 and query[0][0] == "eid" and re.fullmatch(r"[A-Za-z0-9_-]+", query[0][1]))
        except ValueError:
            valid = False
        if not valid:
            raise DeliverySafetyError("Unexpected Calendar result link.")
    # Shape checking cannot prove the URL represents this event. Never retain or
    # present the raw provider URL as a verified event link.
    return {"event_id": b["id"], "provider_link": None, "provider_link_verified": False,
            "event_matches_review": True,
            "invite_emails_delivered": None, "attendee_acceptance_verified": False}


def _slack_result(s, response):
    step, p = s["pending_step"], s["plan"]
    if not isinstance(response, dict):
        raise DeliverySafetyError("Missing Slack fixture result.")
    if step == "upload_reviewed_bytes":
        # A local fixture result represents verified bytes and an HTTP success.
        # It is not a proof of real bytes, a decoded image or any remote upload.
        image = p["share_draft"]["attachment"]
        if (response.get("status_code") != 200 or response.get("sha256") != image["sha256"]
                or response.get("bytes") != image["bytes"]):
            raise DeliverySafetyError("Upload fixture does not match reviewed image bytes.")
        return {}
    if response.get("ok") is not True:
        raise DeliverySafetyError("Slack did not return ok=true.")
    if step == "post_text":
        message = response.get("message", {})
        if (response.get("channel") != p["destination"]["channel_id"]
                or not isinstance(response.get("ts"), str) or not re.fullmatch(r"[0-9]{10,16}\.[0-9]{6}", response["ts"])
                or not isinstance(message, dict) or message.get("text") != p["share_draft"]["content"]
                or message.get("ts") != response["ts"]
                or message.get("thread_ts") != p["destination"].get("thread_ts")):
            raise DeliverySafetyError("Slack message receipt does not match the reviewed channel/thread/text.")
        return {"message_ts": response["ts"], "permalink": None, "user_read_verified": False}
    if step == "obtain_upload":
        file_id, link = response.get("file_id"), response.get("upload_url")
        if not isinstance(file_id, str) or not re.fullmatch(r"F[A-Z0-9]{8,20}", file_id) or not isinstance(link, str):
            raise DeliverySafetyError("Incomplete Slack upload slot.")
        try:
            u = urlsplit(link)
            valid = (u.scheme == "https" and u.hostname == "files.slack.com" and u.port in (None, 443)
                     and not u.username and not u.password and not u.fragment and u.path.startswith("/upload/v1/"))
        except ValueError:
            valid = False
        if not valid:
            raise DeliverySafetyError("Unexpected Slack upload destination; do not follow redirects.")
        # Do not keep a bearer upload URL in the history/artifacts.
        return {"file_id": file_id, "provider_upload_url_shape_checked": True}
    if step == "complete_upload":
        files = response.get("files")
        if (not isinstance(files, list) or len(files) != 1 or not isinstance(files[0], dict)
                or files[0].get("id") != s["fixture_artifacts"].get("file_id")):
            raise DeliverySafetyError("Completed file does not match the reviewed upload slot.")
        return {"upload_completion_accepted": True, "channel_share_verified": False,
                "permalink": None, "needs_manual_channel_verification": True}
    raise DeliverySafetyError("Unknown Slack step.")


def record_fixture_result(state, *, outcome, response=None):
    """No ambiguous result is ever converted into a retry or real success.

    Accepted but mismatching responses also need reconciliation. Responses are
    intentionally not retained: they can include bearer URLs or private data.
    Rejections/rate limits stop and need a new deliberate operator decision.
    """
    s = _read(state)
    if s["status"] != "awaiting_fixture_result":
        raise DeliverySafetyError("No pending fixture attempt.")
    if outcome not in ("accepted", "rejected", "rate_limited", "unknown", "conflict"):
        raise DeliverySafetyError("Specify the actual response outcome; never guess success.")
    step = s["pending_step"]
    if outcome == "accepted":
        try:
            artifacts = validate_calendar_receipt(s["plan"], response) if s["provider"] == "calendar" else _slack_result(s, response)
        except (DeliverySafetyError, ValueError, TypeError, KeyError):
            s["status"] = "needs_reconciliation"
            s["history"].append({"kind": "mismatched_fixture_result", "step": step})
        else:
            s["fixture_artifacts"].update(artifacts)
            s["next_step"] += 1
            s["status"] = ("fixture_provider_accepted" if s["next_step"] == len(s["steps"])
                           else "ready_for_fixture_attempt")
            s["history"].append({"kind": "fixture_accepted", "step": step})
    else:
        s["status"] = "needs_reconciliation" if outcome in ("unknown", "conflict") else "stopped_for_review"
        s["history"].append({"kind": "fixture_" + outcome, "step": step})
    s["pending_step"] = None
    return _seal(s)


class FixtureDeliveryJournal:
    """In-memory owner of current fixture state, never a production journal.

    It rejects duplicate operation creation/replayed transitions within this
    process. Restart persistence and real owner/approval checks are NOT built.
    No provider response, token or signed upload URL is retained. The pinned
    draft necessarily contains review data and is discarded with this object.
    """

    def __init__(self):
        self._operations = {}

    def create(self, provider, plan, *, operation_id):
        if operation_id in self._operations:
            raise DeliverySafetyError("Operation ID already exists; read it instead of submitting again.")
        state = new_fixture_operation(provider, plan, operation_id=operation_id)
        self._operations[operation_id] = state
        return deepcopy(state)

    def get(self, operation_id):
        if operation_id not in self._operations:
            raise DeliverySafetyError("Unknown fixture operation.")
        return deepcopy(self._operations[operation_id])

    def _apply(self, operation_id, transition, **kwargs):
        result = transition(self.get(operation_id), **kwargs)
        self._operations[operation_id] = result
        return deepcopy(result)

    def review(self, operation_id, *, expected_plan_snapshot_digest):
        return self._apply(operation_id, acknowledge_fixture_review, expected_plan_snapshot_digest=expected_plan_snapshot_digest)

    def begin(self, operation_id):
        return self._apply(operation_id, begin_fixture_attempt)

    def result(self, operation_id, *, outcome, response=None):
        return self._apply(operation_id, record_fixture_result, outcome=outcome, response=response)

    def reconcile_calendar(self, operation_id, *, event_response):
        return self._apply(operation_id, reconcile_calendar_fixture, event_response=event_response)


def reconcile_calendar_fixture(state, *, event_response):
    """A synthetic exact GET result may reconcile an uncertain insert, no resend.

    A future GET must target the fixed calendar and deterministic event ID, with
    the original authenticated binding. Here there is no GET and no live proof.
    """
    s = _read(state)
    if s["provider"] != "calendar" or s["status"] != "needs_reconciliation":
        raise DeliverySafetyError("Only an uncertain Calendar fixture can be reconciled here.")
    artifacts = validate_calendar_receipt(s["plan"], event_response)
    s["fixture_artifacts"].update(artifacts)
    s["status"] = "fixture_provider_accepted"
    s["next_step"] = len(s["steps"])
    s["history"].append({"kind": "fixture_readback_matched_no_resend"})
    return _seal(s)
