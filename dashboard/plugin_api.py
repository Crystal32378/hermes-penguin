"""Plugin-owned routes used by the opt-in native Hermes Desktop page.

Hermes imports backend entry points as standalone modules. Load only our own
pure engine from the installed package; do not alter sys.path or host modules.
"""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from base64 import b64encode
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
