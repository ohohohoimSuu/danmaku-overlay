import time
import difflib
from collections import deque


class DanmakuQueue:
    def __init__(self, max_recent=10, max_on_screen=8, track_count=20):
        self._queue = deque()
        self._recent = deque(maxlen=max_recent)
        self.max_on_screen = max_on_screen
        self.track_count = track_count
        # Each entry is the timestamp when the track becomes free (0 = free now).
        self._tracks = [0.0] * track_count

    def _active_count(self):
        """Count tracks that are currently occupied (now < free_time)."""
        now = time.time()
        return sum(1 for ft in self._tracks if now < ft)

    def push(self, danmaku_list):
        """Add danmaku to queue after dedup."""
        for text in danmaku_list:
            text = text.strip()
            if not text:
                continue
            if self._is_duplicate(text):
                continue
            self._recent.append(text)
            self._queue.append(text)

    def _is_duplicate(self, text):
        """Check if text is too similar to recent danmaku."""
        for recent in self._recent:
            ratio = difflib.SequenceMatcher(None, text, recent).ratio()
            if ratio > 0.7:
                return True
        return False

    def pop(self):
        """Get next danmaku if a track is free. Returns (text, track_index) or None."""
        if not self._queue:
            return None

        now = time.time()
        if self._active_count() >= self.max_on_screen:
            return None

        for i, free_time in enumerate(self._tracks):
            if now >= free_time and self._queue:
                text = self._queue.popleft()
                # Track is occupied for ~10 seconds (scroll + 2s gap)
                self._tracks[i] = now + 10.0
                return (text, i)
        return None

    def release_track(self, track_index):
        """Called when a danmaku finishes scrolling off screen.

        Immediately frees the track so it can be reused without waiting
        for the 10-second timeout.
        """
        if 0 <= track_index < len(self._tracks):
            self._tracks[track_index] = 0.0

    def has_pending(self):
        return len(self._queue) > 0
