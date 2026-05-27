import json
import os
from pathlib import Path

PROFILES_DIR = Path(__file__).parent / "profiles"
DEFAULT_PROFILE = "default-funny"


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
    """Get MiMo API key from environment or .env file."""
    key = os.environ.get("MIMO_API_KEY", "")
    if key:
        return key
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("MIMO_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def get_api_base():
    """Get MiMo API base URL from environment or default."""
    return os.environ.get("MIMO_API_BASE", "https://api.xiaomi.com/v1")
