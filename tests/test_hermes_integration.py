"""Run with HERMES_SOURCE pointing at an official Hermes checkout.

These tests use the real public state API and actual FastAPI route handlers,
with temporary homes; they never read the user's active Hermes profile.
"""
from concurrent.futures import ThreadPoolExecutor
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

import pytest

SOURCE = os.environ.get("HERMES_SOURCE")
# Hermes' own runner deliberately cleans environment variables. In the private
# development bundle, the separately checked-out reference has this location.
if not SOURCE:
    candidate = Path(__file__).resolve().parents[2] / "reference/hermes-agent"
    if (candidate / "hermes_cli/plugins_state.py").is_file():
        SOURCE = str(candidate)
pytestmark = pytest.mark.skipif(not SOURCE, reason="Set HERMES_SOURCE to run real Hermes integration checks")
if SOURCE:
    sys.path.insert(0, SOURCE)


@pytest.fixture
def state(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    from hermes_cli.plugins_state import PluginState
    return PluginState("penguin")


def fixture_team():
    return json.loads((Path(__file__).parents[1] / "examples/aurora-team.json").read_text())


def test_real_state_survives_new_process(state):
    from penguin.core import execute
    assert execute("save_team", {"team_id": "aurora", "team": fixture_team()}, state)["ok"]
    env = {**os.environ, "PYTHONPATH": SOURCE}
    result = subprocess.run([sys.executable, "-c", "from hermes_cli.plugins_state import PluginState; import json; print(json.dumps(PluginState('penguin').get('team:aurora')))"], env=env, capture_output=True, text=True, check=True)
    assert json.loads(result.stdout)["team"] == fixture_team()
    assert state.path.stat().st_mode & 0o777 == 0o600


def test_real_state_is_profile_scoped(state, tmp_path):
    from hermes_constants import set_hermes_home_override, reset_hermes_home_override
    from penguin.core import execute
    assert execute("save_team", {"team_id": "aurora", "team": fixture_team()}, state)["ok"]
    token = set_hermes_home_override(tmp_path / "other")
    try:
        assert execute("get_team", {"team_id": "aurora"}, state)["error"]["code"] == "team_not_found"
    finally:
        reset_hermes_home_override(token)
    assert execute("get_team", {"team_id": "aurora"}, state)["ok"]


def test_parallel_saves_preserve_distinct_teams(state):
    from penguin.core import execute
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda i: execute("save_team", {"team_id": f"team-{i}", "team": fixture_team()}, state), range(24)))
    assert all(r["ok"] for r in results)
    assert all(state.get(f"team:team-{i}") for i in range(24))


def test_corrupt_real_state_preserved(state):
    from penguin.core import execute
    state.data_dir.mkdir(parents=True)
    state.path.write_text("broken json")
    assert execute("save_team", {"team_id": "aurora", "team": fixture_team()}, state)["error"]["code"] == "storage_error"
    assert state.path.read_text() == "broken json"


def test_real_backend_shares_tool_state_and_returns_errors(state):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from penguin.core import execute
    spec = importlib.util.spec_from_file_location("penguin_test_api", Path(__file__).parents[1] / "dashboard/plugin_api.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    app = FastAPI()
    app.include_router(mod.router, prefix="/api/plugins/penguin")
    client = TestClient(app)
    from base64 import b64decode
    illustration = client.get("/api/plugins/penguin/art").json()["src"]
    assert illustration.startswith("data:image/png;base64,")
    assert b64decode(illustration.split(",", 1)[1]) == (Path(__file__).parents[1] / "assets/penguin-polar-station.png").read_bytes()
    kit = client.get("/api/plugins/penguin/art/kit").json()
    expected_art = {"background": "control-room.webp", "banner": "commander-banner.webp",
                    "medal": "commendation-medal.webp", "stamp": "approved-stamp.webp"}
    assert set(kit) == set(expected_art)
    for key, filename in expected_art.items():
        assert kit[key].startswith("data:image/webp;base64,")
        assert b64decode(kit[key].split(",", 1)[1]) == (Path(__file__).parents[1] / "assets/kit" / filename).read_bytes()
    assert client.get("/api/plugins/penguin/art/kit").json() == kit
    saved = client.post("/api/plugins/penguin/teams/save", json={"team_id": "aurora", "team": fixture_team()}).json()
    assert saved["ok"]
    assert execute("get_team", {"team_id": "aurora"}, state)["result"]["team"] == fixture_team()
    result = client.post("/api/plugins/penguin/overlap", json={"team_id": "aurora", "reference_zone": "Asia/Taipei", "start_date": "2026-11-16", "duration_minutes": 60}).json()
    assert result["result"]["slots"][0]["start_utc"] == "2026-11-16T13:00Z"
    error = client.post("/api/plugins/penguin/convert", json={"local_time": "2026-03-08T02:30", "source_zone": "America/New_York", "target_zones": ["Asia/Taipei"]}).json()
    assert error["error"]["code"] == "nonexistent_local_time"


def test_private_music_routes_are_fixed_and_byte_exact(state):
    from base64 import b64decode
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    root = Path(__file__).parents[1]
    spec = importlib.util.spec_from_file_location("penguin_audio_test_api", root / "dashboard/plugin_api.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    app = FastAPI()
    app.include_router(mod.router, prefix="/api/plugins/penguin")
    client = TestClient(app)
    assert b64decode(client.get("/api/plugins/penguin/audio-lab/music").json()["base64"]) == (root / "assets/audio-lab/polar-frequency.mp3").read_bytes()
    assert client.get("/api/plugins/penguin/audio-lab/features").json() == json.loads((root / "assets/audio-lab/polar-frequency.features.json").read_text())
    assert client.get("/api/plugins/penguin/audio-lab/briefing").status_code == 404
    assert not (root / "assets/audio-lab/briefing.mp3").exists()
    assert client.get("/api/plugins/penguin/audio-lab/unknown.mp3").status_code == 404
