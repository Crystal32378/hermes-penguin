from datetime import datetime, timezone
import json
from pathlib import Path

import pytest

from penguin.core import InputError, convert, execute, local_view, metadata, overlap, zone


def conversion(time, source="America/New_York", targets=None, **extra):
    return convert({"local_time": time, "source_zone": source, "target_zones": targets or ["Asia/Taipei"], **extra})


def member(name="A", zone="UTC", start="09:00", end="17:00", days=None):
    return {"name": name, "zone": zone, "windows": [{"start": start, "end": end, "weekdays": list(range(7)) if days is None else days}]}


def search(members, day="2026-11-16", reference="UTC", duration=60, **extra):
    return overlap({"team": {"name": "Synthetic", "members": members}, "start_date": day,
                    "reference_zone": reference, "duration_minutes": duration, **extra})


def test_taipei_evening_is_new_york_morning():
    result = conversion("2026-11-16T21:00", "Asia/Taipei", ["America/New_York", "Europe/London"])
    assert result["utc"] == "2026-11-16T13:00Z"
    assert [x["local"] for x in result["targets"]] == ["2026-11-16T08:00-05:00", "2026-11-16T13:00+00:00"]


@pytest.mark.parametrize("time,source", [("2026-03-08T02:30", "America/New_York"), ("2026-10-04T02:15", "Australia/Lord_Howe"), ("2011-12-30T12:00", "Pacific/Apia")])
def test_nonexistent_local_times(time, source):
    with pytest.raises(InputError, match="does not exist"):
        conversion(time, source)


def test_ambiguous_hour_requires_explicit_choice():
    with pytest.raises(InputError) as caught:
        conversion("2026-11-01T01:30")
    assert caught.value.code == "ambiguous_local_time"
    assert [x["utc"] for x in caught.value.details["candidates"]] == ["2026-11-01T05:30Z", "2026-11-01T06:30Z"]
    assert conversion("2026-11-01T01:30", ambiguity="earlier")["source"]["fold"] == 0
    assert conversion("2026-11-01T01:30", ambiguity="later")["source"]["fold"] == 1


@pytest.mark.parametrize("time,source,expected", [
    ("2026-10-27T09:00", "Asia/Kolkata", "2026-10-27T03:30Z"),
    ("2026-10-27T09:00", "Asia/Kathmandu", "2026-10-27T03:15Z"),
    ("2026-10-27T09:00", "America/Mexico_City", "2026-10-27T15:00Z"),
    ("2026-10-27T09:00", "America/Cancun", "2026-10-27T14:00Z"),
    ("2026-01-01T00:15", "Pacific/Kiritimati", "2025-12-31T10:15Z"),
])
def test_offsets_and_date_rollover(time, source, expected):
    assert conversion(time, source)["utc"] == expected


@pytest.mark.parametrize("bad", ["Mars/Olympus", "EST", "../UTC", "/etc/passwd", "", None, [], {}])
def test_invalid_zones(bad):
    with pytest.raises(InputError):
        conversion("2026-11-16T21:00", bad)


@pytest.mark.parametrize("bad", ["2026-02-30T12:00", "2026-11-16T24:00", "2026-11-16T21:00Z", "2026-11-16T21:00:00", "1999-11-16T12:00", "2101-01-01T00:00", None])
def test_invalid_datetimes(bad):
    with pytest.raises(InputError):
        conversion(bad)


def test_reference_date_and_whole_meeting():
    result = search([member("A", "Asia/Taipei", "20:00", "23:00"), member("B", "America/New_York", "08:00", "11:00")], reference="Asia/Taipei", duration=90)
    assert result["common_windows"][0]["start_utc"] == "2026-11-16T13:00Z"
    assert result["common_windows"][0]["end_utc"] == "2026-11-16T15:00Z"
    assert result["total_slots"] == 3
    assert result["slots"][-1]["end_utc"] == "2026-11-16T15:00Z"


def test_duration_excludes_partial_fit():
    result = search([member(start="09:00", end="09:45")], duration=60)
    assert result["slots"] == []
    assert result["common_windows"][0]["fits_duration"] is False


def test_no_overlap_and_equal_hours():
    assert search([member("A"), member("B", start="18:00", end="20:00")])["slots"] == []
    assert search([member(start="09:00", end="09:00")])["common_windows"] == []


def test_overnight_shift_uses_start_weekday():
    m = member(start="22:00", end="06:00", days=[4])
    saturday = search([m], day="2026-10-31")
    assert saturday["common_windows"][0]["start_utc"] == "2026-10-31T00:00Z"
    assert saturday["common_windows"][0]["end_utc"] == "2026-10-31T06:00Z"
    assert search([m], day="2026-11-02")["slots"] == []


def test_spring_gap_measures_elapsed_time():
    result = search([member(zone="America/New_York", start="01:00", end="04:00")], day="2026-03-08", reference="America/New_York", duration=180)
    assert result["common_windows"][0]["elapsed_minutes"] == 120
    assert result["slots"] == []


def test_fall_fold_measures_elapsed_time():
    result = search([member(zone="America/New_York", start="01:00", end="02:00")], day="2026-11-01", reference="America/New_York", duration=120)
    assert result["slots"][0]["start_utc"] == "2026-11-01T05:00Z"
    assert result["slots"][0]["end_utc"] == "2026-11-01T07:00Z"
    assert result["slots"][0]["elapsed_minutes"] == 120


def test_fold_cannot_bridge_unavailable_minutes():
    result = search([member(zone="America/New_York", start="01:30", end="02:30")], day="2026-11-01", reference="America/New_York", duration=90)
    assert [w["elapsed_minutes"] for w in result["common_windows"]] == [30, 60]
    assert result["slots"] == []


def test_lord_howe_half_hour_transition():
    result = search([member(zone="Australia/Lord_Howe", start="01:00", end="03:00")], day="2026-04-05", reference="Australia/Lord_Howe", duration=150)
    assert result["common_windows"][0]["elapsed_minutes"] == 150
    assert len(result["slots"]) == 1


def test_skipped_reference_day():
    assert search([member(zone="Pacific/Apia")], day="2011-12-30", reference="Pacific/Apia")["common_windows"] == []


def test_midnight_gap_reference_day():
    result = search([member(zone="America/Sao_Paulo", start="00:00", end="04:00")], day="2018-11-04", reference="America/Sao_Paulo")
    assert result["common_windows"][0]["elapsed_minutes"] == 180
    assert result["slots"][0]["members"][0]["start"]["local"] == "2018-11-04T01:00-02:00"


def test_multiple_windows_merge_adjacency_not_breaks():
    m = member()
    m["windows"] = [{"start": a, "end": b, "weekdays": [0]} for a, b in [("09:00", "10:00"), ("10:00", "11:00"), ("12:00", "13:00")]]
    result = search([m], duration=120)
    assert [w["elapsed_minutes"] for w in result["common_windows"]] == [120, 60]
    assert result["total_slots"] == 1


def test_date_line_member_dates_are_explicit():
    result = search([member("East", "Pacific/Kiritimati", "09:00", "12:00"), member("West", "Pacific/Honolulu", "09:00", "12:00")], reference="Pacific/Kiritimati")
    views = result["slots"][0]["members"]
    assert views[0]["start"]["date"] == "2026-11-16"
    assert views[1]["start"]["date"] == "2026-11-15"


def test_reproducible_independent_of_system_zone(monkeypatch):
    before = conversion("2026-11-16T21:00", "Asia/Taipei")
    monkeypatch.setenv("TZ", "Pacific/Honolulu")
    monkeypatch.setenv("PYTHONTZPATH", "/unavailable")
    assert before == conversion("2026-11-16T21:00", "Asia/Taipei")
    assert metadata()["tzdata_version"] == "2026.6"


def test_output_is_bounded_and_flags_truncation():
    result = search([member()], days=14, duration=1, step_minutes=1, max_slots=3)
    assert len(result["slots"]) == 3
    assert result["slots_truncated"] is True
    assert result["total_slots"] == 14 * 480


@pytest.mark.parametrize("kwargs", [{"days": 0}, {"days": 15}, {"duration_minutes": True}, {"step_minutes": 0}, {"max_slots": 21}, {"unknown": 1}])
def test_bounded_invalid_inputs(kwargs):
    args = {"team": {"name": "A", "members": [member()]}, "reference_zone": "UTC", "start_date": "2026-11-16", "duration_minutes": 60, **kwargs}
    assert execute("overlap", args)["ok"] is False


def test_fictional_demo_fixture():
    team = json.loads((Path(__file__).parents[1] / "examples/aurora-team.json").read_text())
    result = overlap({"team": team, "reference_zone": "Asia/Taipei", "start_date": "2026-11-16", "duration_minutes": 60})
    assert result["slots"][0]["start_utc"] == "2026-11-16T13:00Z"


def test_four_person_preview_matches_overlap():
    from penguin.core import preview
    team = json.loads((Path(__file__).parents[1] / "examples/aurora-team.json").read_text())
    result = preview({"team": team, "reference_zone": "Asia/Taipei", "local_time": "2026-11-16T21:00", "duration_minutes": 60})
    assert result["all_available"]
    assert [m["start"]["local"][11:16] for m in result["members"]] == ["21:00", "08:00", "13:00", "05:00"]


def test_preview_tests_entire_meeting():
    from penguin.core import preview
    result = preview({"team": {"name": "A", "members": [member(start="09:00", end="09:30")]}, "reference_zone": "UTC", "local_time": "2026-11-16T09:00", "duration_minutes": 60})
    assert not result["all_available"]
    assert result["members"][0]["unavailable_minutes"] == 30


def test_preview_rejects_dst_gap_and_fold():
    payload = {"team": {"name": "A", "members": [member()]}, "reference_zone": "America/New_York", "duration_minutes": 60}
    assert execute("preview", {**payload, "local_time": "2026-03-08T02:30"})["error"]["code"] == "nonexistent_local_time"
    assert execute("preview", {**payload, "local_time": "2026-11-01T01:30"})["error"]["code"] == "ambiguous_local_time"


def test_bundled_tzdb_matches_provenance_hashes():
    import hashlib
    root = Path(__file__).parents[1] / "tzdb"
    manifest = json.loads((root / "provenance.json").read_text())
    assert manifest["iana_version"] == metadata()["iana_version"]
    for rel, digest in manifest["files"].items():
        assert hashlib.sha256((root / rel).read_bytes()).hexdigest() == digest


def test_engine_works_without_any_site_packages():
    import subprocess
    import sys
    script = "import importlib.util; s=importlib.util.spec_from_file_location('engine', __import__('sys').argv[1]); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(m.convert({'local_time':'2026-11-16T21:00','source_zone':'Asia/Taipei','target_zones':['UTC']})['utc'])"
    result = subprocess.run([sys.executable, "-S", "-c", script, str(Path(__file__).parents[1] / "core.py")], capture_output=True, text=True, check=True)
    assert result.stdout.strip() == "2026-11-16T13:00Z"
