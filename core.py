"""Deterministic, minute-precision scheduling using one pinned IANA database.

Adapted from the private Team time window's wall-time and overnight-shift
semantics. UTC minutes, not local datetime arithmetic, measure elapsed time.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
import re
from zoneinfo import ZoneInfo

UTC = timezone.utc
MINUTE = timedelta(minutes=1)
TZDATA_VERSION = "2026.6"
IANA_VERSION = "2026f"
TZDB = Path(__file__).resolve().parent / "tzdb"


class InputError(ValueError):
    def __init__(self, code, message, **details):
        super().__init__(message)
        self.code, self.details = code, details


def metadata():
    return {"tzdata_version": TZDATA_VERSION, "iana_version": IANA_VERSION, "source": "bundled",
            "precision": "minute", "algorithm_version": "1"}


@lru_cache(maxsize=1)
def zone_names():
    return frozenset((TZDB / "zones").read_text().splitlines())


def zone(name):
    # Membership is checked before touching a path; abbreviations and traversal fail.
    if not isinstance(name, str) or (name != "UTC" and "/" not in name) or name not in zone_names():
        raise InputError("invalid_zone", "Use an IANA zone, e.g. Asia/Taipei or America/New_York.")
    return _load_zone(name)


@lru_cache(maxsize=256)
def _load_zone(name):
    with (TZDB / "zoneinfo").joinpath(*name.split("/")).open("rb") as handle:
        return ZoneInfo.from_file(handle, key=name)


def integer(value, label, low, high):
    if type(value) is not int or not low <= value <= high:
        raise InputError("invalid_input", f"{label} must be an integer from {low} to {high}.")
    return value


def text(value, label, limit=80):
    if not isinstance(value, str) or not value.strip() or len(value) > limit or any(ord(c) < 32 for c in value):
        raise InputError("invalid_input", f"{label} must be nonempty text of at most {limit} characters, without controls.")
    return value.strip()


def keys(obj, allowed, required=()):
    if not isinstance(obj, dict) or set(obj) - set(allowed) or set(required) - set(obj):
        raise InputError("invalid_input", "Missing, unknown, or incorrectly shaped fields.")


def parse_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise InputError("invalid_date", "Use YYYY-MM-DD, between 2000 and 2100.")
    try:
        result = date.fromisoformat(value)
    except ValueError as exc:
        raise InputError("invalid_date", "This calendar date does not exist.") from exc
    if not 2000 <= result.year <= 2100:
        raise InputError("invalid_date", "Supported dates are 2000-01-01 through 2100-12-31.")
    return result


def minutes(value):
    if not isinstance(value, str) or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value):
        raise InputError("invalid_time", "Use HH:MM in 24-hour format (00:00 to 23:59).")
    return int(value[:2]) * 60 + int(value[3:])


def parse_local(value):
    if not isinstance(value, str) or len(value) != 16 or value[10] != "T":
        raise InputError("invalid_time", "Use local_time YYYY-MM-DDTHH:MM without a UTC offset.")
    day, minute = parse_date(value[:10]), minutes(value[11:])
    return datetime.combine(day, datetime.min.time()) + minute * MINUTE


def utc_string(value):
    return value.astimezone(UTC).isoformat(timespec="minutes").replace("+00:00", "Z")


def local_view(instant, name):
    local = instant.astimezone(zone(name))
    return {"zone": name, "local": local.isoformat(timespec="minutes"),
            "date": local.date().isoformat(), "weekday": ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")[local.weekday()],
            "offset_minutes": int(local.utcoffset().total_seconds() // 60),
            "abbreviation": local.tzname(), "fold": local.fold,
            "is_dst": bool(local.dst())}


def resolve_local(local, name):
    tz = zone(name)
    candidates = set()
    for fold in (0, 1):
        instant = local.replace(tzinfo=tz, fold=fold).astimezone(UTC)
        if instant.astimezone(tz).replace(tzinfo=None) == local:
            candidates.add(instant)
    return sorted(candidates)


def convert(args):
    keys(args, ("local_time", "source_zone", "target_zones", "ambiguity"),
         ("local_time", "source_zone", "target_zones"))
    local = parse_local(args["local_time"])
    name = args["source_zone"]
    targets = args["target_zones"]
    if not isinstance(targets, list) or not 1 <= len(targets) <= 30:
        raise InputError("invalid_input", "Provide 1 to 30 target_zones.")
    for target in targets:
        zone(target)
    choice = args.get("ambiguity", "reject")
    if choice not in ("reject", "earlier", "later"):
        raise InputError("invalid_input", "ambiguity must be reject, earlier, or later.")
    candidates = resolve_local(local, name)
    if not candidates:
        raise InputError("nonexistent_local_time", "This wall time does not exist because the clock jumps forward. Choose another local time.")
    if len(candidates) == 2 and choice == "reject":
        raise InputError("ambiguous_local_time", "This wall time occurs twice. Ask which occurrence is intended; retry with earlier or later.",
                         candidates=[{"utc": utc_string(t), **local_view(t, name)} for t in candidates])
    instant = candidates[-1] if choice == "later" else candidates[0]
    return {"utc": utc_string(instant), "source": local_view(instant, name),
            "targets": [local_view(instant, target) for target in targets],
            "ambiguous": len(candidates) == 2, "resolution": choice if len(candidates) == 2 else "unique",
            "database": metadata()}


def validate_team(team):
    keys(team, ("name", "members"), ("name", "members"))
    name = text(team["name"], "Team name")
    members = team["members"]
    if not isinstance(members, list) or not 1 <= len(members) <= 30:
        raise InputError("invalid_input", "A team needs 1 to 30 members.")
    clean, names = [], set()
    for member in members:
        keys(member, ("name", "zone", "windows"), ("name", "zone", "windows"))
        label = text(member["name"], "Member name")
        if label in names:
            raise InputError("invalid_input", "Member names must be unique within a team.")
        names.add(label)
        zone(member["zone"])
        windows = member["windows"]
        if not isinstance(windows, list) or len(windows) > 8:
            raise InputError("invalid_input", "Each member may have 0 to 8 work windows.")
        normalized = []
        for window in windows:
            keys(window, ("start", "end", "weekdays"), ("start", "end", "weekdays"))
            minutes(window["start"])
            minutes(window["end"])
            days = window["weekdays"]
            if not isinstance(days, list) or len(days) > 7:
                raise InputError("invalid_input", "weekdays must be a list: Monday=0 through Sunday=6.")
            for day in days:
                integer(day, "weekday", 0, 6)
            normalized.append({"start": window["start"], "end": window["end"], "weekdays": sorted(set(days))})
        clean.append({"name": label, "zone": member["zone"], "windows": normalized})
    return {"name": name, "members": clean}


def working(local, windows):
    minute = local.hour * 60 + local.minute
    for start, end, weekdays in windows:
        if start == end:
            continue
        shift_day = local.date()
        if start > end and minute < end:
            shift_day -= timedelta(days=1)
        within = start <= minute < end if start < end else minute >= start or minute < end
        if within and shift_day.weekday() in weekdays:
            return True
    return False


def interval_view(start, end, members):
    return {"start_utc": utc_string(start), "end_utc": utc_string(end),
            "elapsed_minutes": int((end - start) / MINUTE),
            "members": [{"name": member["name"], "start": local_view(start, member["zone"]),
                         "end": local_view(end, member["zone"])} for member in members]}


def overlap(args):
    keys(args, ("team", "reference_zone", "start_date", "days", "duration_minutes", "step_minutes", "max_slots"),
         ("team", "reference_zone", "start_date", "duration_minutes"))
    team = validate_team(args["team"])
    reference = zone(args["reference_zone"])
    first = parse_date(args["start_date"])
    days = integer(args.get("days", 1), "days", 1, 14)
    last = first + timedelta(days=days)
    if (last - timedelta(days=1)).year > 2100:
        raise InputError("invalid_date", "The search must end by 2100-12-31.")
    duration = integer(args["duration_minutes"], "duration_minutes", 1, 480)
    step = integer(args.get("step_minutes", 15), "step_minutes", 1, 120)
    limit = integer(args.get("max_slots", 5), "max_slots", 1, 20)
    compiled = [(zone(m["zone"]), [(minutes(w["start"]), minutes(w["end"]), set(w["weekdays"]))
                                  for w in m["windows"]]) for m in team["members"]]
    # Filter dates by their actual local representation. Even skipped/23h/25h
    # days and midnight transitions work, without resolving a fictitious midnight.
    cursor = datetime.combine(first, datetime.min.time(), UTC) - timedelta(days=1)
    stop = datetime.combine(last, datetime.min.time(), UTC) + timedelta(days=1)
    runs, run_start = [], None
    while cursor < stop:
        active = first <= cursor.astimezone(reference).date() < last and all(
            working(cursor.astimezone(tz), windows) for tz, windows in compiled)
        if active and run_start is None:
            run_start = cursor
        elif not active and run_start is not None:
            runs.append((run_start, cursor))
            run_start = None
        cursor += MINUTE
    slots, total = [], 0
    for start, end in runs:
        count = max(0, int(((end - start) / MINUTE - duration) // step) + 1)
        total += count
        for i in range(min(count, limit - len(slots))):
            candidate = start + i * step * MINUTE
            slots.append({**interval_view(candidate, candidate + duration * MINUTE, team["members"]),
                          "reference_start": local_view(candidate, args["reference_zone"])})
    windows = [{**interval_view(s, e, team["members"]), "fits_duration": (e - s) / MINUTE >= duration}
               for s, e in runs[:128]]
    return {"team_name": team["name"], "reference_zone": args["reference_zone"],
            "start_date": first.isoformat(), "end_date_exclusive": last.isoformat(),
            "duration_minutes": duration, "common_windows": windows,
            "windows_truncated": len(runs) > 128, "slots": slots, "total_slots": total,
            "slots_truncated": total > len(slots), "step_minutes": step,
            "ordering": "earliest UTC first; step starts at each common window",
            "availability_policy": "wall-clock windows; both repeated-hour occurrences count; gaps contain no instants; overnight weekdays use shift start date; end exclusive",
            "database": metadata()}


def preview(args):
    """Desktop slider preview: the same engine checks the full selected meeting."""
    keys(args, ("team", "reference_zone", "local_time", "duration_minutes", "ambiguity"),
         ("team", "reference_zone", "local_time", "duration_minutes"))
    team = validate_team(args["team"])
    duration = integer(args["duration_minutes"], "duration_minutes", 1, 480)
    converted = convert({"local_time": args["local_time"], "source_zone": args["reference_zone"],
                         "target_zones": [m["zone"] for m in team["members"]], "ambiguity": args.get("ambiguity", "reject")})
    start = datetime.fromisoformat(converted["utc"].replace("Z", "+00:00"))
    result = interval_view(start, start + duration * MINUTE, team["members"])
    for view, member in zip(result["members"], team["members"]):
        tz = zone(member["zone"])
        windows = [(minutes(w["start"]), minutes(w["end"]), set(w["weekdays"])) for w in member["windows"]]
        view["unavailable_minutes"] = sum(not working((start + i * MINUTE).astimezone(tz), windows) for i in range(duration))
        view["available"] = view["unavailable_minutes"] == 0
    return {**result, "all_available": all(m["available"] for m in result["members"]),
            "reference_start": converted["source"], "database": metadata()}


# This review-only boundary does not import network, process, or credential APIs.
def _handoff_email(value):
    value = text(value, "email", 254)
    if not re.fullmatch(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}", value):
        raise InputError("invalid_email", "Supply an explicit conventional email address; do not infer one.")
    local, domain = value.rsplit("@", 1)
    if len(local) > 64 or local.startswith(".") or local.endswith(".") or ".." in value or any(not label or len(label) > 63 or label.startswith("-") or label.endswith("-") for label in domain.split(".")):
        raise InputError("invalid_email", "Supply an explicit conventional email address; do not infer one.")
    return local + "@" + domain.lower()


def _handoff_relay(value):
    from urllib.parse import urlsplit
    value = text(value, "relay_url", 512)
    try:
        parsed = urlsplit(value)
        host = parsed.hostname or ""
        if (parsed.scheme != "https" or parsed.username or parsed.password or
                parsed.path not in ("", "/") or parsed.query or parsed.fragment or
                parsed.port not in (None, 443) or not re.fullmatch(r"[a-z0-9.-]+", host) or
                "." not in host or host.endswith((".localhost", ".local")) or
                all(c.isdigit() or c == "." for c in host) or ".." in host):
            raise ValueError("Use a public HTTPS community origin.")
    except ValueError as exc:
        raise InputError("invalid_relay", "Use a public HTTPS community origin without credentials, path, query, or fragment.") from exc
    return "https://" + host


def prepare_handoff(args):
    """Prepare Buzz and Google payloads only. A draft is never consent or delivery.

    No credentials, state, subprocesses, network or UI access. Recompute the exact
    slot so a caller cannot smuggle stale/edited UTC times into an event payload.
    """
    import hashlib
    import json
    from uuid import UUID
    keys(args, ("selection", "title", "description", "google", "buzz"),
         ("selection", "title", "google"))
    slot = preview(args["selection"])
    team = validate_team(args["selection"]["team"])
    title = text(args["title"], "title", 160)
    description = text(args["description"], "description", 2000) if "description" in args else "Meeting proposed with Penguin."

    google = args["google"]
    keys(google, ("account_email", "calendar_id", "attendees", "send_updates"),
         ("account_email", "calendar_id", "attendees", "send_updates"))
    account = _handoff_email(google["account_email"])
    calendar_id = text(google["calendar_id"], "calendar_id", 254)
    if calendar_id != "primary":
        calendar_id = _handoff_email(calendar_id)
    if google["send_updates"] not in ("all", "none"):
        raise InputError("invalid_input", "send_updates must explicitly be all or none.")
    people = google["attendees"]
    if not isinstance(people, list) or len(people) != len(team["members"]):
        raise InputError("invalid_attendees", "Provide an explicit email mapping for every selected team member.")
    mapping, seen_emails = {}, set()
    for person in people:
        keys(person, ("member_name", "email"), ("member_name", "email"))
        name = text(person["member_name"], "member_name")
        email = _handoff_email(person["email"])
        if name in mapping or email.casefold() in seen_emails:
            raise InputError("invalid_attendees", "Member names and email addresses must be unique.")
        mapping[name] = email
        seen_emails.add(email.casefold())
    if set(mapping) != {m["name"] for m in team["members"]}:
        raise InputError("invalid_attendees", "Email mapping must exactly match the selected team members.")

    relay = channel_id = thread_root = None
    if "buzz" in args:
        buzz = args["buzz"]
        keys(buzz, ("relay_url", "channel_id", "thread_root_id"), ("relay_url", "channel_id"))
        relay = _handoff_relay(buzz["relay_url"])
        channel_id = text(buzz["channel_id"], "channel_id", 36)
        try:
            if str(UUID(channel_id)) != channel_id.lower():
                raise ValueError("Noncanonical UUID")
        except ValueError as exc:
            raise InputError("invalid_channel", "Supply the exact Buzz channel UUID, not a display name.") from exc
        thread_root = buzz.get("thread_root_id")
        if thread_root is not None and (not isinstance(thread_root, str) or not re.fullmatch(r"[a-f0-9]{64}", thread_root)):
            raise InputError("invalid_thread", "thread_root_id must be a verified 64-character lowercase hex event id.")

    # No attendee addresses or member names are included in the Buzz message.
    # Its target and all content are still subject to explicit owner review.
    content = (f"Penguin meeting proposal: {title}\n"
               f"{slot['start_utc']} to {slot['end_utc']} ({slot['elapsed_minutes']} minutes).\n"
               "Please confirm whether this time works for you. "
               "Work-hour fit is not calendar availability. No event or invitation has been created.")
    event = {"summary": title, "description": description,
             "start": {"dateTime": slot["start_utc"].replace("Z", ":00Z"), "timeZone": "UTC"},
             "end": {"dateTime": slot["end_utc"].replace("Z", ":00Z"), "timeZone": "UTC"},
             "attendees": [{"email": mapping[m["name"]], "responseStatus": "needsAction"} for m in team["members"]]}
    result = {
        "schema_version": 1, "status": "draft_only", "executed": False,
        "approval_required": True, "consent_recorded": False,
        "availability": {"work_hours_fit": slot["all_available"], "calendar_busy_checked": False,
                         "participant_confirmation": "not_collected", "selection": slot},
        "google": {"account_email": account, "identity_verified": False,
                   "method": "calendar.events.insert", "params": {"calendarId": calendar_id, "sendUpdates": google["send_updates"]},
                   "body": event, "event_id": None, "html_link": None},
        "warnings": ["DRAFT ONLY: nothing sent, booked, authenticated, or configured.",
                     "Names, work hours and draft fields do not prove identity, availability, or consent.",
                     "Verify the Google account, calendar access and live conflicts before an approved booking."]}
    if "buzz" in args:
        result["buzz"] = {"relay_url": relay, "channel_id": channel_id.lower(), "thread_root_id": thread_root,
                          "target_verified": False, "content": content, "event_id": None, "deep_link": None}
        result["warnings"].append("Verify Buzz community/channel/thread and allowed public keys before any collaboration.")
    if not slot["all_available"]:
        result["warnings"].append("The entire selected meeting does not fit every member's work hours.")
    if google["send_updates"] == "none":
        result["warnings"].append("sendUpdates=none: invitation notification emails are disabled; this is not guaranteed private from attendees or their calendars.")
    # Fingerprint binds the review data, not authorization. It is NOT a signature,
    # provider idempotency key, authentication assertion, or delivery receipt.
    encoded = json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    result["review_fingerprint"] = hashlib.sha256(encoded).hexdigest()
    return result


PLUGIN_ID = "penguin"


def team_key(team_id):
    if not isinstance(team_id, str) or not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,39}", team_id):
        raise InputError("invalid_team_id", "team_id must be 1–40 lowercase letters, digits, underscores or hyphens.")
    return "team:" + team_id


def execute(action, args, state=None):
    """Read bundled rules only; persistence is delegated to Hermes, with no network."""
    try:
        if not isinstance(args, dict):
            raise InputError("invalid_input", "Arguments must be an object.")
        if action == "convert":
            result = convert(args)
        elif action == "preview":
            result = preview(args)
        elif action == "prepare_handoff":
            result = prepare_handoff(args)
        elif action == "overlap":
            payload = dict(args)
            if "team_id" in payload:
                if "team" in payload:
                    raise InputError("invalid_input", "Provide either team or team_id, not both.")
                payload["team"] = load_team(payload.pop("team_id"), state)
            result = overlap(payload)
        elif action == "save_team":
            keys(args, ("team_id", "team"), ("team_id", "team"))
            key = team_key(args["team_id"])
            team = validate_team(args["team"])
            if state is None:
                raise InputError("storage_unavailable", "Hermes plugin state is unavailable.")
            state.set(key, {"schema_version": 1, "team": team})
            result = {"team_id": args["team_id"], "team": team, "saved": True, "database": metadata()}
        elif action == "get_team":
            keys(args, ("team_id",), ("team_id",))
            result = {"team_id": args["team_id"], "team": load_team(args["team_id"], state)}
        else:
            raise InputError("unknown_action", "Unsupported Penguin action.")
        return {"ok": True, "result": result}
    except InputError as exc:
        return {"ok": False, "error": {"code": exc.code, "message": str(exc), **exc.details}}
    except (OSError, RuntimeError, ValueError):
        # Host details and paths are deliberately excluded from model-visible errors.
        return {"ok": False, "error": {"code": "storage_error", "message": "Hermes could not read or write plugin state. Existing data was not reset."}}


def load_team(team_id, state):
    key = team_key(team_id)
    if state is None:
        raise InputError("storage_unavailable", "Hermes plugin state is unavailable.")
    saved = state.get(key)
    if saved is None:
        raise InputError("team_not_found", "No saved team with that id in this Hermes profile.")
    if not isinstance(saved, dict) or saved.get("schema_version") != 1 or "team" not in saved:
        raise InputError("unsupported_team", "Saved team format is unsupported. Existing data was not reset.")
    return validate_team(saved["team"])

