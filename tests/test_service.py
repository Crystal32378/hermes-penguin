import json
from concurrent.futures import ThreadPoolExecutor

from penguin import register
from penguin.core import execute
from penguin.schemas import SCHEMAS
from test_core import member


class State:
    def __init__(self):
        self.values = {}

    def get(self, key):
        return self.values.get(key)

    def set(self, key, value):
        self.values[key] = json.loads(json.dumps(value))


def team():
    return {"name": "Fictional", "members": [member()]}


def test_save_load_replace_and_overlap():
    state = State()
    assert execute("save_team", {"team_id": "demo", "team": team()}, state)["ok"]
    assert execute("get_team", {"team_id": "demo"}, state)["result"]["team"] == team()
    result = execute("overlap", {"team_id": "demo", "reference_zone": "UTC", "start_date": "2026-11-16", "duration_minutes": 60}, state)
    assert result["result"]["slots"][0]["start_utc"] == "2026-11-16T09:00Z"
    changed = {"name": "Replacement", "members": [member(start="13:00")]}
    assert execute("save_team", {"team_id": "demo", "team": changed}, state)["ok"]
    assert execute("get_team", {"team_id": "demo"}, state)["result"]["team"] == changed


def test_invalid_save_preserves_existing_state():
    state = State()
    execute("save_team", {"team_id": "demo", "team": team()}, state)
    for bad in [None, {}, {"name": "Wrong", "members": []}]:
        assert not execute("save_team", {"team_id": "demo", "team": bad}, state)["ok"]
    assert execute("get_team", {"team_id": "demo"}, state)["result"]["team"] == team()


def test_missing_unknown_and_invalid_id():
    assert execute("get_team", {"team_id": "absent"}, State())["error"]["code"] == "team_not_found"
    assert execute("get_team", {"team_id": "../private"}, State())["error"]["code"] == "invalid_team_id"
    assert execute("made_up", {})["error"]["code"] == "unknown_action"


def test_corrupt_storage_is_preserved_and_path_not_leaked():
    class Broken:
        def get(self, key):
            raise RuntimeError("Corrupt /private/user/state.json")
    result = execute("get_team", {"team_id": "demo"}, Broken())
    assert result["error"]["code"] == "storage_error"
    assert "/private/" not in json.dumps(result)


def test_registered_tools_match_schemas_with_json_results():
    class Context:
        state = State()
        def __init__(self): self.tools = {}
        def register_tool(self, **kw): self.tools[kw["name"]] = kw
    ctx = Context()
    register(ctx)
    assert set(ctx.tools) == {s["name"] for s in SCHEMAS.values()}
    result = json.loads(ctx.tools["penguin_convert"]["handler"]({"local_time": "2026-11-01T01:30", "source_zone": "America/New_York", "target_zones": ["UTC"]}, task_id="synthetic"))
    assert result["error"]["code"] == "ambiguous_local_time"


def test_registration_does_not_read_state():
    class Context:
        @property
        def state(self): raise AssertionError("State accessed during registration")
        def register_tool(self, **kwargs): pass
    register(Context())
