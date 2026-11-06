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
