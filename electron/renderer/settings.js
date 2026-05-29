// ==================== Tab Switching ====================
let statsTimer = null;

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    switchTab(item.dataset.tab);
  });
});

function switchTab(name) {
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === name);
  });
  document.querySelectorAll(".panel").forEach((el) => {
    el.classList.toggle("hidden", el.id !== `panel-${name}`);
  });

  if (statsTimer) { clearInterval(statsTimer); statsTimer = null; }

  if (name === "stats") {
    refreshStats();
    statsTimer = setInterval(refreshStats, 2000);
  } else if (name === "api") {
    loadApiConfig();
  } else if (name === "display") {
    loadDisplayConfig();
  }
}

// ==================== Stats Panel ====================
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTokens(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

async function refreshStats() {
  const stats = await window.electronAPI.getStats();
  document.getElementById("stat-uptime").textContent = formatUptime(stats.uptime_seconds || 0);
  document.getElementById("stat-danmaku").textContent = stats.danmaku_count || 0;
  document.getElementById("stat-tokens").textContent = formatTokens(stats.total_tokens || 0);
}

// ==================== API Panel ====================
async function loadApiConfig() {
  const cfg = await window.electronAPI.loadApiConfig();
  document.getElementById("api-key").value = cfg.api_key || "";
  document.getElementById("api-base").value = cfg.api_base || "";
}

document.getElementById("btn-api-save").addEventListener("click", async () => {
  const config = {
    api_key: document.getElementById("api-key").value.trim(),
    api_base: document.getElementById("api-base").value.trim(),
  };
  if (!config.api_key) {
    showApiMsg("API Key 不能为空", "error");
    return;
  }
  const ok = await window.electronAPI.saveApiConfig(config);
  if (ok) {
    showApiMsg("已保存，后端已重启", "success");
  } else {
    showApiMsg("保存失败", "error");
  }
});

function showApiMsg(msg, cls) {
  const el = document.getElementById("api-msg");
  el.textContent = msg;
  el.className = cls;
  setTimeout(() => { el.textContent = ""; el.className = ""; }, 3000);
}

// ==================== Display Panel ====================
async function loadDisplayConfig() {
  const cfg = await window.electronAPI.loadDisplayConfig();
  const val = cfg.max_on_screen || 8;
  document.getElementById("display-max-on-screen").value = val;
  document.getElementById("display-value").textContent = val;
}

document.getElementById("display-max-on-screen").addEventListener("input", (e) => {
  document.getElementById("display-value").textContent = e.target.value;
});

document.getElementById("btn-display-save").addEventListener("click", async () => {
  const config = {
    max_on_screen: parseInt(document.getElementById("display-max-on-screen").value) || 8,
  };
  const ok = await window.electronAPI.saveDisplayConfig(config);
  if (ok) {
    showDisplayMsg("已保存，后端已重启", "success");
  } else {
    showDisplayMsg("保存失败", "error");
  }
});

function showDisplayMsg(msg, cls) {
  const el = document.getElementById("display-msg");
  el.textContent = msg;
  el.className = cls;
  setTimeout(() => { el.textContent = ""; el.className = ""; }, 3000);
}

// ==================== Profile Panel ====================
let currentProfile = null;
let originalData = null;

const profileList = document.getElementById("profile-list");
const form = document.getElementById("profile-form");
const emptyState = document.getElementById("empty-state");

async function refreshList() {
  const names = await window.electronAPI.listProfiles();
  profileList.innerHTML = "";
  names.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    li.addEventListener("click", () => loadProfile(name));
    profileList.appendChild(li);
  });
}

function setActive(name) {
  profileList.querySelectorAll("li").forEach((li) => {
    li.classList.toggle("active", li.textContent === name);
  });
}

async function loadProfile(name) {
  const data = await window.electronAPI.loadProfile(name);
  if (!data) return;

  currentProfile = name;
  originalData = JSON.parse(JSON.stringify(data));
  setActive(name);

  document.getElementById("field-name").value = data.name || name;
  document.getElementById("field-prompt").value = data.system_prompt || "";
  document.getElementById("field-max").value = data.max_per_batch ?? 3;
  document.getElementById("field-temp").value = data.temperature ?? 0.9;
  document.getElementById("temp-value").textContent = data.temperature ?? 0.9;

  renderTags("catchphrase-tags", data.catchphrases || [], "catchphrase-input");
  renderTags("focus-tags", data.focus_on || [], "focus-input");

  form.style.display = "block";
  emptyState.style.display = "none";
}

// ---- Tag editors ----
function renderTags(containerId, items, inputId) {
  const container = document.getElementById(containerId);
  const input = container.querySelector("input");
  container.querySelectorAll(".tag").forEach((t) => t.remove());
  items.forEach((text) => {
    const tag = createTag(containerId, text, input);
    container.insertBefore(tag, input);
  });
}

function createTag(containerId, text, input) {
  const span = document.createElement("span");
  span.className = "tag";
  span.innerHTML = `${escapeHtml(text)}<span class="remove">&times;</span>`;
  span.querySelector(".remove").addEventListener("click", () => { span.remove(); });
  return span;
}

function getTags(containerId) {
  const tags = [];
  document.getElementById(containerId).querySelectorAll(".tag").forEach((t) => {
    const text = t.textContent.replace("×", "").trim();
    if (text) tags.push(text);
  });
  return tags;
}

function setupTagInput(containerId, inputId) {
  const input = document.getElementById(inputId);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      const container = document.getElementById(containerId);
      const tag = createTag(containerId, val, input);
      container.insertBefore(tag, input);
      input.value = "";
    }
  });
}

// ---- Save / Reset ----
document.getElementById("btn-save").addEventListener("click", async () => {
  if (!currentProfile) return;

  const data = {
    name: document.getElementById("field-name").value,
    system_prompt: document.getElementById("field-prompt").value.trim(),
    catchphrases: getTags("catchphrase-tags"),
    focus_on: getTags("focus-tags"),
    max_per_batch: parseInt(document.getElementById("field-max").value) || 3,
    temperature: parseFloat(document.getElementById("field-temp").value) || 0.9,
  };

  if (!data.system_prompt) {
    showMsg("提示词不能为空！", "error");
    return;
  }

  const ok = await window.electronAPI.saveProfile(currentProfile, data);
  if (ok) {
    originalData = JSON.parse(JSON.stringify(data));
    setActive(currentProfile);
    showMsg("已保存", "success");
  } else {
    showMsg("保存失败", "error");
  }
});

document.getElementById("btn-reset").addEventListener("click", () => {
  if (currentProfile && originalData) {
    loadProfile(currentProfile);
    showMsg("已取消", "");
  }
});

// ---- Temp slider ----
document.getElementById("field-temp").addEventListener("input", (e) => {
  document.getElementById("temp-value").textContent = parseFloat(e.target.value).toFixed(1);
});

function showMsg(msg, cls) {
  const el = document.getElementById("save-msg");
  el.textContent = msg;
  el.className = cls;
  setTimeout(() => { el.textContent = ""; el.className = ""; }, 2000);
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

// ---- Init ----
setupTagInput("catchphrase-tags", "catchphrase-input");
setupTagInput("focus-tags", "focus-input");
refreshList();

// Start stats polling by default (stats tab is active)
refreshStats();
statsTimer = setInterval(refreshStats, 2000);
