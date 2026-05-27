"""Smoke test — run with: python test_integration.py"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from config import load_profile, list_profiles
from capture import ScreenCapture


def test_list_profiles():
    profiles = list_profiles()
    assert len(profiles) == 3, f"Expected 3 profiles, got {len(profiles)}"
    assert "slay-the-spire" in profiles
    assert "default-funny" in profiles
    assert "default-tech" in profiles
    print("  PASS test_list_profiles")


def test_load_profile():
    profile = load_profile("default-funny")
    assert profile["name"] == "通用 - 抽象乐子人"
    assert len(profile["system_prompt"]) > 50
    assert profile["max_per_batch"] == 3
    print("  PASS test_load_profile")


def test_capture():
    cap = ScreenCapture()
    jpeg_bytes = cap.capture()
    assert jpeg_bytes is not None, "Screen capture returned None"
    assert len(jpeg_bytes) > 100, f"JPEG too small: {len(jpeg_bytes)} bytes"
    print(f"  PASS test_capture ({len(jpeg_bytes)} bytes, one frame)")


def test_frame_diff():
    cap = ScreenCapture()
    frame1 = cap.capture()
    frame2 = cap.capture()
    changed = cap.has_changed(frame1)
    changed2 = cap.has_changed(frame2)
    assert isinstance(changed, bool)
    assert isinstance(changed2, bool)
    print(f"  PASS test_frame_diff (frame1 changed={changed}, frame2 changed={changed2})")


if __name__ == "__main__":
    print("Running integration smoke tests...\n")
    test_list_profiles()
    test_load_profile()
    test_capture()
    test_frame_diff()
    print("\nAll smoke tests passed.")
