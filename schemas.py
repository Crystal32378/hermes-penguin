"""Tool contracts shared with integration tests."""
def obj(properties, required=()):
    return {"type": "object", "properties": properties, "required": list(required), "additionalProperties": False}


STRING = {"type": "string"}
ZONE = {"type": "string", "description": "Confirmed IANA zone, e.g. Asia/Taipei. Do not guess a zone from a person's name or country."}
WINDOW = obj({"start": STRING, "end": STRING, "weekdays": {"type": "array", "items": {"type": "integer", "minimum": 0, "maximum": 6}, "maxItems": 7}}, ("start", "end", "weekdays"))
MEMBER = obj({"name": STRING, "zone": ZONE, "windows": {"type": "array", "items": WINDOW, "maxItems": 8}}, ("name", "zone", "windows"))
TEAM = obj({"name": STRING, "members": {"type": "array", "items": MEMBER, "minItems": 1, "maxItems": 30}}, ("name", "members"))
TEAM_ID = {"type": "string", "pattern": "^[a-z0-9][a-z0-9_-]{0,39}$"}


def tool(name, description, parameters):
    return {"name": name, "description": description, "parameters": parameters}


SCHEMAS = {
    "convert": tool("penguin_convert", "Convert an explicit local date/time across IANA zones using pinned tzdata. Defaults to rejecting ambiguous or nonexistent times; ask the user before choosing earlier/later. No current-time assumption.",
        obj({"local_time": {"type": "string", "description": "YYYY-MM-DDTHH:MM; 2000–2100; no offset"}, "source_zone": ZONE,
             "target_zones": {"type": "array", "items": ZONE, "minItems": 1, "maxItems": 30},
             "ambiguity": {"type": "string", "enum": ["reject", "earlier", "later"], "default": "reject"}},
            ("local_time", "source_zone", "target_zones"))),
    "overlap": tool("penguin_overlap", "Find windows where the entire meeting fits all members' work hours. Supply team or saved team_id. Dates are in reference_zone. Weekdays: Mon=0; overnight shifts use start day; equal hours unavailable; DST repeated hours both count. Earliest first, no calendars or booking.",
        obj({"team": TEAM, "team_id": TEAM_ID, "reference_zone": ZONE, "start_date": {"type": "string", "description": "YYYY-MM-DD"},
             "days": {"type": "integer", "minimum": 1, "maximum": 14, "default": 1},
             "duration_minutes": {"type": "integer", "minimum": 1, "maximum": 480},
             "step_minutes": {"type": "integer", "minimum": 1, "maximum": 120, "default": 15},
             "max_slots": {"type": "integer", "minimum": 1, "maximum": 20, "default": 5}},
            ("reference_zone", "start_date", "duration_minutes"))),
    "save_team": tool("penguin_save_team", "Save or replace a named team only when the user asks to remember its settings. Stored in this plugin's Hermes profile-local state; same id replaces the full team. No shared sync or calendar events.",
        obj({"team_id": TEAM_ID, "team": TEAM}, ("team_id", "team"))),
    "get_team": tool("penguin_get_team", "Read a previously saved team by exact id from the active Hermes profile.", obj({"team_id": TEAM_ID}, ("team_id",))),
}

# Isolated review prototype: preparation only; no network or external writes.
SCHEMAS["prepare_handoff"] = tool(
    "penguin_prepare_handoff",
    "Prepare a Google Calendar event review from an explicit existing Penguin selection, optionally with a Buzz text draft. No message/event/invitation is sent. No credentials or connectivity are configured. Requires exact account, calendar and member email mappings; Buzz is optional. Work hours do not prove calendar availability. Draft output is not consent. Existing share-card routing is a separate offline module.",
    obj({
        "selection": obj({"team": TEAM, "reference_zone": ZONE, "local_time": STRING,
                          "duration_minutes": {"type": "integer", "minimum": 1, "maximum": 480},
                          "ambiguity": {"type": "string", "enum": ["reject", "earlier", "later"]}},
                         ("team", "reference_zone", "local_time", "duration_minutes")),
        "title": {"type": "string", "maxLength": 160},
        "description": {"type": "string", "maxLength": 2000},
        "google": obj({"account_email": STRING, "calendar_id": STRING,
                       "send_updates": {"type": "string", "enum": ["all", "none"]},
                       "attendees": {"type": "array", "minItems": 1, "maxItems": 30,
                                     "items": obj({"member_name": STRING, "email": STRING}, ("member_name", "email"))}},
                      ("account_email", "calendar_id", "send_updates", "attendees")),
        "buzz": obj({"relay_url": STRING, "channel_id": STRING,
                     "thread_root_id": {"type": "string", "pattern": "^[a-f0-9]{64}$"}},
                    ("relay_url", "channel_id"))
    }, ("selection", "title", "google")))
