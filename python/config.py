import json
import os
import sys
from pathlib import Path


def _get_base_dir():
    if getattr(sys, 'frozen', False):
        # Prefer external profiles dir next to the exe (so users can edit them),
        # fall back to bundled ones inside the exe.
        external = Path(sys.executable).parent / "profiles"
        if external.exists():
            return Path(sys.executable).parent
        return Path(sys._MEIPASS)
    return Path(__file__).parent


PROFILES_DIR = _get_base_dir() / "profiles"
DEFAULT_PROFILE = "default-funny"


def _get_api_config_path():
    """Return path to api-config.json (same dir as profiles)."""
    return _get_base_dir() / "api-config.json"


def list_profiles():
    """Return list of profile names (without .json extension)."""
    if not PROFILES_DIR.exists():
        return []
    return sorted(
        p.stem for p in PROFILES_DIR.glob("*.json")
    )


def load_profile(name=None):
    """Load a profile by name. Falls back to DEFAULT_PROFILE."""
    name = name or DEFAULT_PROFILE
    path = PROFILES_DIR / f"{name}.json"
    if not path.exists():
        print(f"[WARN] Profile '{name}' not found, falling back to '{DEFAULT_PROFILE}'")
        path = PROFILES_DIR / f"{DEFAULT_PROFILE}.json"

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if "system_prompt" not in data:
        raise ValueError(f"Profile '{path.stem}' is missing required field: system_prompt")

    return {
        "name": data.get("name", name),
        "system_prompt": data["system_prompt"],
        "catchphrases": data.get("catchphrases", []),
        "focus_on": data.get("focus_on", []),
        "max_per_batch": data.get("max_per_batch", 3),
        "temperature": data.get("temperature", 0.9),
    }


def get_api_key():
    """Get MiMo API key from environment, .env file, or api-config.json."""
    key = os.environ.get("MIMO_API_KEY", "")
    if key:
        return key
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("MIMO_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    cfg = _load_api_config()
    return cfg.get("api_key", "")


def get_api_base():
    """Get MiMo API base URL from environment or api-config.json."""
    base = os.environ.get("MIMO_API_BASE", "")
    if base:
        return base
    cfg = _load_api_config()
    return cfg.get("api_base", "https://token-plan-cn.xiaomimimo.com/v1")


def get_display_config_path():
    """Return path to display-config.json (same dir as profiles)."""
    return _get_base_dir() / "display-config.json"


def get_display_config():
    """Load display config. Returns defaults if file missing."""
    path = get_display_config_path()
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return {"max_on_screen": 8}


def _load_api_config():
    """Load api-config.json if it exists."""
    path = _get_api_config_path()
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return {}
