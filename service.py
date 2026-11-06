"""Hermes string-result adapter for the shared service."""
import json
from .core import execute


def handler(action, ctx):
    def run(args, **kwargs):
        needs_state = action in ("save_team", "get_team") or (isinstance(args, dict) and "team_id" in args)
        state = ctx.state if needs_state else None
        return json.dumps(execute(action, args, state), ensure_ascii=False, sort_keys=True)
    return run
