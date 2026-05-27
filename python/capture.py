import io
from mss import mss
from PIL import Image, ImageChops


class ScreenCapture:
    def __init__(self, fps=2, jpeg_quality=60, diff_threshold=0.03):
        self.fps = fps
        self.interval = 1.0 / fps
        self.jpeg_quality = jpeg_quality
        self.diff_threshold = diff_threshold
        self._sct = mss()
        self._prev_frame = None

    def capture(self):
        """Capture screen and return JPEG bytes. Returns None on failure."""
        try:
            monitor = self._sct.monitors[1]
            sct_img = self._sct.grab(monitor)
            pil_img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")

            buf = io.BytesIO()
            pil_img.save(buf, format="JPEG", quality=self.jpeg_quality)
            return buf.getvalue()
        except Exception:
            return None

    def get_pil_image(self, jpeg_bytes):
        """Decode JPEG bytes back to PIL Image for diff comparison."""
        return Image.open(io.BytesIO(jpeg_bytes))

    def has_changed(self, current_jpeg):
        """Compare current frame against previous. True if significant change."""
        current = self.get_pil_image(current_jpeg)
        if self._prev_frame is None:
            self._prev_frame = current
            return True

        thumb_size = (64, 36)
        prev = self._prev_frame.resize(thumb_size)
        curr = current.resize(thumb_size)

        diff = ImageChops.difference(prev, curr)
        changed_pixels = sum(
            1 for p in diff.getdata()
            if sum(p) > 30
        )
        total_pixels = thumb_size[0] * thumb_size[1]
        ratio = changed_pixels / total_pixels

        self._prev_frame = current
        return ratio >= self.diff_threshold
