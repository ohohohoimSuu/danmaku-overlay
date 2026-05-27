import json
import base64
import httpx

SYSTEM_PROMPT_WRAPPER = """{system_prompt}

以下是当前游戏画面的截图。请分析画面并根据上述规则生成弹幕。
只输出JSON，不要输出其他内容。"""


class MimoClient:
    def __init__(self, api_key, api_base="https://api.xiaomi.com/v1"):
        self.api_key = api_key
        self.api_base = api_base.rstrip("/")
        self._client = httpx.Client(timeout=30.0)
        self.consecutive_failures = 0

    def analyze(self, jpeg_bytes, profile):
        """Send image to MiMo V2.5, return list of danmaku strings."""
        image_b64 = base64.b64encode(jpeg_bytes).decode("utf-8")
        system_text = SYSTEM_PROMPT_WRAPPER.format(
            system_prompt=profile["system_prompt"]
        )

        messages = [
            {
                "role": "system",
                "content": system_text,
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_b64}",
                            "detail": "auto",
                        },
                    },
                    {
                        "type": "text",
                        "text": "分析这个游戏画面，生成弹幕。",
                    },
                ],
            },
        ]

        try:
            response = self._client.post(
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "mimo-v2.5",
                    "messages": messages,
                    "temperature": profile.get("temperature", 0.9),
                    "max_tokens": 256,
                },
            )
            response.raise_for_status()
            data = response.json()
            self.consecutive_failures = 0
            return self._parse_response(data)

        except Exception:
            self.consecutive_failures += 1
            return []

    def _parse_response(self, data):
        """Extract danmaku list from API response."""
        try:
            content = data["choices"][0]["message"]["content"]
            # Strip markdown code fences if present
            content = content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
                if content.endswith("```"):
                    content = content[:-3]

            parsed = json.loads(content)
            return parsed.get("danmaku", [])
        except (KeyError, json.JSONDecodeError, IndexError):
            # Fallback: treat entire content as one danmaku
            try:
                text = data["choices"][0]["message"]["content"]
                return [text.strip()] if text.strip() else []
            except (KeyError, IndexError):
                return []

    def should_throttle(self):
        """Return True if we've had too many consecutive failures."""
        return self.consecutive_failures >= 3
