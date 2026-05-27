const TRACK_COUNT = 5;
const SPEED_MIN = 8;
const SPEED_MAX = 12;

const container = document.getElementById("danmaku-container");
const statusBar = document.getElementById("status-bar");

let ws = null;
let paused = false;

function connectWS() {
  ws = new WebSocket("ws://127.0.0.1:9527");

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "danmaku") {
      spawnDanmaku(data.text, data.track);
    } else if (data.type === "status") {
      statusBar.textContent = data.text;
    }
  };

  ws.onclose = () => {
    setTimeout(connectWS, 2000);
  };

  ws.onerror = () => {
    ws.close();
  };
}

function spawnDanmaku(text, trackIndex) {
  if (paused) return;

  const el = document.createElement("div");
  el.className = `danmaku-item danmaku-color-${trackIndex % 5}`;
  el.textContent = text;

  const trackHeight = window.innerHeight / TRACK_COUNT;
  const top = trackIndex * trackHeight + (trackHeight - 30) * Math.random();
  el.style.top = `${top}px`;
  el.style.left = "100%";

  const duration = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
  el.style.animationDuration = `${duration}s`;

  container.appendChild(el);

  el.addEventListener("animationend", () => {
    el.remove();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "danmaku_done", track: trackIndex }));
    }
  });
}

if (window.electronAPI) {
  window.electronAPI.onTogglePause((isPaused) => {
    paused = isPaused;
  });
}

connectWS();
