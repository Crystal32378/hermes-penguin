import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("penguin", ROOT / "__init__.py", submodule_search_locations=[str(ROOT)])
penguin = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = penguin
spec.loader.exec_module(penguin)
