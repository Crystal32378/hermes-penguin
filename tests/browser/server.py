"""Disposable loopback harness using the actual plugin API; no personal profile."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import os
import sys
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, os.environ["HERMES_SOURCE"])
_home = TemporaryDirectory(prefix="penguin-browser-")
os.environ["HERMES_HOME"] = _home.name
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from hermes_constants import set_hermes_home_override, reset_hermes_home_override

spec = spec_from_file_location("penguin_browser_api", ROOT / "dashboard/plugin_api.py")
module = module_from_spec(spec)
spec.loader.exec_module(module)
app = FastAPI()

@app.middleware("http")
async def profile_scope(request: Request, call_next):
    profile = request.headers.get("X-Demo-Profile", "demo")
    if profile not in ("demo", "second-demo"):
        profile = "demo"
    token = set_hermes_home_override(Path(_home.name) / profile)
    try:
        return await call_next(request)
    finally:
        reset_hermes_home_override(token)

app.include_router(module.router, prefix="/api/plugins/penguin")
app.mount("/", StaticFiles(directory=os.environ.get("PENGUIN_TEST_BUILD", ROOT / ".test-build"), html=True))
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PENGUIN_TEST_PORT", "8773")))
