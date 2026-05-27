import time
import difflib
from collections import deque


class DanmakuQueue:
    def __init__(self, max_recent=10, max_on_screen=8, track_count=5):
        self._queue = deque()
        self._recent = deque(maxlen=max_recent)
        self.max_on_screen = max_on_screen
        self.track_count = track_count
        self._tracks = [0.0] * track_count  # when each track becomes free
        self._active_count = 0

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
        if self._active_count >= self.max_on_screen:
            return None

        now = time.time()
        for i, free_time in enumerate(self._tracks):
            if now >= free_time and self._queue:
                text = self._queue.popleft()
                # Track is occupied for ~10 seconds (scroll + 2s gap)
                self._tracks[i] = now + 10.0
                self._active_count += 1
                return (text, i)
        return None

    def release_track(self, track_index):
        """Called when a danmaku finishes scrolling off screen."""
        self._active_count = max(0, self._active_count - 1)

    def has_pending(self):
        return len(self._queue) > 0
