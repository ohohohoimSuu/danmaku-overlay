import json
import asyncio
import websockets


class DanmakuWSServer:
    def __init__(self, danmaku_queue, host="127.0.0.1", port=9527):
        self.queue = danmaku_queue
        self.host = host
        self.port = port
        self._clients = set()
        self._server = None

    async def start(self):
        """Start WebSocket server. Runs until cancelled."""
        self._server = await websockets.serve(
            self._handler, self.host, self.port
        )
        await self._broadcast_loop()

    async def _handler(self, websocket):
        """Handle a new client connection."""
        self._clients.add(websocket)
        try:
            async for message in websocket:
                data = json.loads(message)
                if data.get("type") == "danmaku_done":
                    track = data.get("track", 0)
                    self.queue.release_track(track)
        finally:
            self._clients.discard(websocket)

    async def _broadcast_loop(self):
        """Continuously pop danmaku from queue and broadcast to clients."""
        while True:
            result = self.queue.pop()
            if result is not None:
                text, track = result
                if self._clients:
                    msg = json.dumps({
                        "type": "danmaku",
                        "text": text,
                        "track": track,
                    })
                    await asyncio.gather(
                        *[ws.send(msg) for ws in self._clients],
                        return_exceptions=True,
                    )
            await asyncio.sleep(0.1)

    async def stop(self):
        if self._server:
            self._server.close()
            await self._server.wait_closed()

    def broadcast_status(self, text):
        """Send a status message to all clients (e.g. '观众掉线...')."""
        if self._clients:
            msg = json.dumps({"type": "status", "text": text})
            asyncio.create_task(
                asyncio.gather(
                    *[ws.send(msg) for ws in self._clients],
                    return_exceptions=True,
                )
            )
