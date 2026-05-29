#!/usr/bin/env python3
"""Main entry point for the danmaku overlay.

Captures the desktop, sends frames to MiMo V2.5 API for danmaku generation,
and pushes them to connected Electron overlay clients via WebSocket.

Usage:
    python main.py [profile_name]
    python main.py --list-profiles
"""

import asyncio
import json
import logging
import signal
import sys
import time

from config import load_profile, list_profiles, get_api_key, get_api_base, get_display_config
from capture import ScreenCapture
from mimo_client import MimoClient
from danmaku_queue import DanmakuQueue
from ws_server import DanmakuWSServer

logger = logging.getLogger(__name__)


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    # Handle --list-profiles flag
    if "--list-profiles" in sys.argv:
        profiles = list_profiles()
        if profiles:
            print("Available profiles:")
            for p in profiles:
                print(f"  {p}")
        else:
            print("No profiles found.")
        return

    # Load profile from CLI arg or default
    profile_name = sys.argv[1] if len(sys.argv) > 1 else None
    profile = load_profile(profile_name)
    logger.info("Loaded profile: %s", profile["name"])

    # Check API key
    api_key = get_api_key()
    if not api_key:
        print("ERROR: MIMO_API_KEY is not set.")
        print("  Set it via the environment variable: MIMO_API_KEY")
        print("  Or create a .env file in the danmaku-overlay directory"
              " with: MIMO_API_KEY=your_key")
        sys.exit(1)

    api_base = get_api_base()
    logger.info("API base: %s", api_base)

    # Load display config
    display_cfg = get_display_config()
    max_on_screen = display_cfg.get("max_on_screen", 8)

    # Create components
    capture = ScreenCapture(fps=2)
    queue = DanmakuQueue(max_on_screen=max_on_screen)
    ws_server = DanmakuWSServer(queue)
    client = MimoClient(api_key, api_base)

    # Session stats
    start_time = time.time()
    stats = {"danmaku_count": 0, "total_tokens": 0}

    def print_stats():
        uptime = int(time.time() - start_time)
        print(
            f"[STATS] {json.dumps(stats)} [UPTIME] {uptime}",
            flush=True,
        )

    async def capture_loop():
        """Main capture -> analyze -> push loop."""
        logger.info(
            "Capture loop started (%.1f fps, interval=%.2fs)",
            capture.fps, capture.interval,
        )
        while True:
            try:
                # 1. Capture screen
                jpeg_bytes = capture.capture()
                if jpeg_bytes is None:
                    await asyncio.sleep(capture.interval)
                    continue

                # 2. Check for significant change vs previous frame
                if not capture.has_changed(jpeg_bytes):
                    await asyncio.sleep(capture.interval)
                    continue

                # 3. Send to MiMo API for danmaku generation
                danmaku_list = client.analyze(jpeg_bytes, profile)
                if danmaku_list:
                    queue.push(danmaku_list)
                    stats["danmaku_count"] += len(danmaku_list)
                    logger.info(
                        "Generated %d danmaku: %s",
                        len(danmaku_list), danmaku_list,
                    )

                if client.last_usage:
                    stats["total_tokens"] += client.last_usage.get(
                        "total_tokens", 0
                    )
                print_stats()

                # 4. Handle throttling (too many consecutive failures)
                if client.should_throttle():
                    logger.warning(
                        "Throttling — %d consecutive failures",
                        client.consecutive_failures,
                    )
                    ws_server.broadcast_status(
                        "观众掉线了... 正在重新连接"
                    )
                    await asyncio.sleep(30)

                # 5. Wait for next capture interval
                await asyncio.sleep(capture.interval)

            except asyncio.CancelledError:
                raise
            except Exception:
                logger.error(
                    "Unexpected error in capture loop",
                    exc_info=True,
                )
                await asyncio.sleep(capture.interval)

    async def run():
        # Set up signal handlers for graceful shutdown
        loop = asyncio.get_running_loop()
        stop_event = asyncio.Event()

        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, stop_event.set)
            except (NotImplementedError, ValueError):
                pass

        # Start WS server and capture loop as concurrent asyncio tasks
        ws_task = asyncio.create_task(
            ws_server.start(), name="ws_server"
        )
        cap_task = asyncio.create_task(
            capture_loop(), name="capture"
        )

        logger.info(
            "Danmaku overlay running (profile=%s, ws=%s:%d)."
            " Press Ctrl+C to stop.",
            profile["name"], ws_server.host, ws_server.port,
        )

        # Wait for shutdown signal
        await stop_event.wait()

        logger.info("Shutting down...")

        # Cancel running tasks
        for task in (ws_task, cap_task):
            task.cancel()
        await asyncio.gather(ws_task, cap_task, return_exceptions=True)

        # Clean up resources
        await ws_server.stop()
        client.close()
        logger.info("Shutdown complete.")

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        # Fallback when signal handlers are not available (e.g. some
        # terminal environments on Windows).  asyncio.run() has already
        # cancelled tasks and closed the event loop at this point, so
        # we only need synchronous cleanup.
        logger.info("Interrupted by user")
        client.close()


if __name__ == "__main__":
    main()
