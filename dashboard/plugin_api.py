"""Plugin-owned routes used by the opt-in native Hermes Desktop page.

Hermes imports backend entry points as standalone modules. Load only our own
pure engine from the installed package; do not alter sys.path or host modules.
"""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from base64 import b64encode
import json
from functools import lru_cache

from fastapi import APIRouter
from hermes_cli.plugins_state import PluginState

_spec = spec_from_file_location("penguin_engine", Path(__file__).resolve().parents[1] / "core.py")
_engine = module_from_spec(_spec)
_spec.loader.exec_module(_engine)
router = APIRouter()


@router.get("/art")
@lru_cache(maxsize=1)
def art():
    """One fixed bundled illustration, through the host's scoped REST bridge."""
    data = (Path(__file__).resolve().parents[1] / "assets/penguin-polar-station.png").read_bytes()
    return {"src": "data:image/png;base64," + b64encode(data).decode("ascii")}


_KIT = {"background": "control-room.webp", "banner": "commander-banner.webp",
        "medal": "commendation-medal.webp", "stamp": "approved-stamp.webp"}


@router.get("/art/kit")
@lru_cache(maxsize=1)
def art_kit():
    """Fixed bundled control-room artwork (background, dispatch frame, medal, stamp)."""
    base = Path(__file__).resolve().parents[1] / "assets/kit"
    return {key: "data:image/webp;base64," + b64encode((base / name).read_bytes()).decode("ascii")
            for key, name in _KIT.items()}


@router.get("/audio-lab/music")
@lru_cache(maxsize=1)
def audio_lab_music():
    """Bundled soundtrack: fixed MiniMax 'Polar Frequency' copy; no arbitrary paths."""
    data = (Path(__file__).resolve().parents[1] / "assets/audio-lab/polar-frequency.mp3").read_bytes()
    return {"base64": b64encode(data).decode("ascii")}


@router.get("/audio-lab/features")
@lru_cache(maxsize=1)
def audio_lab_features():
    """Features analysed offline from the same track (25 fps bands, onsets, beat grid)."""
    return json.loads((Path(__file__).resolve().parents[1] / "assets/audio-lab/polar-frequency.features.json").read_text())


@router.post("/preview")
def preview(body: dict):
    return _engine.execute("preview", body)


@router.post("/convert")
def convert(body: dict):
    return _engine.execute("convert", body)


@router.post("/overlap")
def overlap(body: dict):
    return _engine.execute("overlap", body, PluginState("penguin"))


@router.post("/teams/save")
def save_team(body: dict):
    return _engine.execute("save_team", body, PluginState("penguin"))


@router.post("/teams/get")
def get_team(body: dict):
    return _engine.execute("get_team", body, PluginState("penguin"))


@router.post("/handoff/prepare")
def prepare_handoff(body: dict):
    """Review-only proposal. This route cannot send, connect, or create events."""
    return _engine.execute("prepare_handoff", body)


@lru_cache(maxsize=1)
def _share_review_module():
    """Import only our own pure package under a path-specific namespace.

    No host sys.path changes, plugin installation, network or identity state.
    """
    import hashlib
    import importlib
    import sys
    root = Path(__file__).resolve().parents[1]
    name = "_penguin_offline_review_" + hashlib.sha256(str(root).encode()).hexdigest()[:16]
    if name not in sys.modules:
        spec = spec_from_file_location(name, root / "__init__.py", submodule_search_locations=[str(root)])
        package = module_from_spec(spec)
        sys.modules[name] = package
        spec.loader.exec_module(package)
    return importlib.import_module(name + ".group_share")


@router.post("/handoff/share")
def prepare_existing_share(body: dict):
    """Existing card TEXT review only. No file upload or group transport."""
    try:
        _engine.keys(body, ("selection", "copied_proposal", "target", "export_manifest"), ("selection", "copied_proposal", "target"))
        module = _share_review_module()
        if isinstance(body["target"], dict) and body["target"].get("platform") == "slack":
            import importlib
            adapter = importlib.import_module(module.__package__ + ".slack_draft")
            result = adapter.plan_slack_delivery(**body, expected_selection_fingerprint=module.selection_fingerprint(body["selection"]))
        else:
            if "export_manifest" in body:
                raise ValueError("Image metadata review is currently supported only by the offline Slack adapter.")
            result = module.plan_existing_card_share(**body, expected_selection_fingerprint=module.selection_fingerprint(body["selection"]))
        return {"ok": True, "result": result}
    except ValueError as exc:
        return {"ok": False, "error": {"code": "invalid_share_review", "message": str(exc)}}


@router.post("/handoff/calendar")
def prepare_calendar_review(body: dict):
    """Unbound UI review, never a credential binding or calendar write."""
    try:
        _engine.keys(body, ("selection", "title", "google"), ("selection", "title", "google"))
        result = _engine.prepare_handoff(body)
        if result["google"]["params"]["calendarId"] == "primary":
            raise ValueError("This prototype only plans an app-created secondary calendar, not primary.")
        if result["google"]["params"]["sendUpdates"] != "all":
            raise ValueError("This invitation review requires explicit all-attendee notification intent.")
        result["google"]["body"].update({"guestsCanInviteOthers": False, "guestsCanModify": False, "guestsCanSeeOtherGuests": False})
        result.update({"mode": "unbound_offline_calendar_review", "live_transport_available": False,
            "calendar_provenance_verified": False, "approved": False,
            "scope_proposal": ["https://www.googleapis.com/auth/calendar.app.created"],
            "next_step": "No OAuth grant exists here. Verify identity, granted scopes and app-created calendar before a separate final invitation approval."})
        # Recompute after adding review-only restrictions. This digest is not approval.
        import hashlib
        result.pop("review_fingerprint", None)
        result["review_fingerprint"] = hashlib.sha256(json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        return {"ok": True, "result": result}
    except ValueError as exc:
        return {"ok": False, "error": {"code": "invalid_calendar_review", "message": str(exc)}}
