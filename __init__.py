"""Native Hermes plugin entry point; registration performs no I/O."""
from .schemas import SCHEMAS
from .service import handler


def register(ctx):
    for action, schema in SCHEMAS.items():
        ctx.register_tool(name=schema["name"], toolset="penguin_window",
                          schema=schema, handler=handler(action, ctx))
