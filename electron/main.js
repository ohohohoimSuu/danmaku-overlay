const { app, BrowserWindow, Tray, Menu, nativeImage, dialog, ipcMain } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let settingsWindow = null;
let tray = null;
let pythonProcess = null;
let latestStats = { danmaku_count: 0, total_tokens: 0, uptime_seconds: 0 };
let currentProfile = null;
let startTime = Date.now();

function getBackendPath() {
  // Prefer bundled exe (no Python install needed)
  const exePath = path.join(process.resourcesPath, "danmaku-backend.exe");
  if (fs.existsSync(exePath)) {
    return { executable: exePath, isExe: true };
  }

  // Fall back to Python source for dev mode
  const pythonDir = app.isPackaged
    ? path.join(process.resourcesPath, "python")
    : path.join(__dirname, "..", "python");
  const mainPy = path.join(pythonDir, "main.py");
  return { executable: mainPy, pythonDir, isExe: false };
}

function findPython() {
  if (process.platform === "win32") {
    const candidates = [
      path.join(process.env.LOCALAPPDATA || "", "Programs/Python/Python312/python.exe"),
      path.join(process.env.LOCALAPPDATA || "", "Programs/Python/Python311/python.exe"),
      path.join(process.env.LOCALAPPDATA || "", "Programs/Python/Python310/python.exe"),
      "C:/Python312/python.exe",
      "C:/Python311/python.exe",
      "C:/Python310/python.exe",
      "python",
    ];
    for (const p of candidates) {
      if (p === "python" || fs.existsSync(p)) return p;
    }
  }
  return process.platform === "win32" ? "python" : "python3";
}

function startPythonBackend(profile) {
  currentProfile = profile;
  latestStats = { danmaku_count: 0, total_tokens: 0, uptime_seconds: 0 };
  startTime = Date.now();
  const backend = getBackendPath();

  if (!fs.existsSync(backend.executable)) {
    dialog.showErrorBox(
      "启动失败",
      `找不到后端:\n${backend.executable}`
    );
    return;
  }

  let proc, args;
  if (backend.isExe) {
    args = profile ? [profile] : [];
    proc = spawn(backend.executable, args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
  } else {
    args = [backend.executable];
    if (profile) args.push(profile);
    proc = spawn(findPython(), args, {
      cwd: backend.pythonDir,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
  }

  pythonProcess = proc;

  pythonProcess.stdout.on("data", (data) => {
    const text = data.toString();
    process.stdout.write(`[backend] ${text}`);
    // Parse stats lines
    const statsMatch = text.match(/\[STATS\] (\{.*?\}) \[UPTIME\] (\d+)/);
    if (statsMatch) {
      try {
        const parsed = JSON.parse(statsMatch[1]);
        latestStats = {
          danmaku_count: parsed.danmaku_count || 0,
          total_tokens: parsed.total_tokens || 0,
          uptime_seconds: parseInt(statsMatch[2]) || 0,
        };
        startTime = Date.now() - (latestStats.uptime_seconds * 1000);
      } catch (_) { /* ignore parse errors */ }
    }
  });

  pythonProcess.stderr.on("data", (data) => {
    process.stderr.write(`[backend] ${data}`);
  });

  pythonProcess.on("error", (err) => {
    if (err.code === "ENOENT") {
      dialog.showErrorBox(
        "未找到 Python",
        "请安装 Python 3.10+ 并将其添加到系统 PATH。\n\nhttps://www.python.org/downloads/"
      );
    }
  });

  pythonProcess.on("close", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[backend] 后端进程异常退出，退出码: ${code}`);
    }
    pythonProcess = null;
  });
}

function stopPythonBackend() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

function createWindow() {
  const { screen } = require("electron");
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

function getProfilesDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "profiles");
  }
  return path.join(__dirname, "..", "python", "profiles");
}

function getApiConfigPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "api-config.json");
  }
  return path.join(__dirname, "..", "python", "api-config.json");
}

function getDisplayConfigPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "display-config.json");
  }
  return path.join(__dirname, "..", "python", "display-config.json");
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 720,
    height: 540,
    resizable: false,
    autoHideMenuBar: true,
    title: "弹幕设置",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWindow.loadFile(path.join(__dirname, "renderer", "settings.html"));
  settingsWindow.on("closed", () => { settingsWindow = null; });
}

function setupIPC() {
  ipcMain.handle("profiles:list", async () => {
    const dir = getProfilesDir();
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  });

  ipcMain.handle("profiles:load", async (_event, name) => {
    const filePath = path.join(getProfilesDir(), `${name}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      return null;
    }
  });

  ipcMain.handle("profiles:save", async (_event, name, data) => {
    if (!data || !data.system_prompt) return false;
    const filePath = path.join(getProfilesDir(), `${name}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("stats:get", async () => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    return { ...latestStats, uptime_seconds: uptime };
  });

  ipcMain.handle("api-config:load", async () => {
    const p = getApiConfigPath();
    if (!fs.existsSync(p)) return {};
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch {
      return {};
    }
  });

  ipcMain.handle("api-config:save", async (_event, config) => {
    const p = getApiConfigPath();
    try {
      fs.writeFileSync(p, JSON.stringify(config, null, 2), "utf-8");
      stopPythonBackend();
      startPythonBackend(currentProfile);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("display-config:load", async () => {
    const p = getDisplayConfigPath();
    if (!fs.existsSync(p)) return { max_on_screen: 8 };
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch {
      return { max_on_screen: 8 };
    }
  });

  ipcMain.handle("display-config:save", async (_event, config) => {
    const p = getDisplayConfigPath();
    try {
      fs.writeFileSync(p, JSON.stringify(config, null, 2), "utf-8");
      stopPythonBackend();
      startPythonBackend(currentProfile);
      return true;
    } catch {
      return false;
    }
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "暂停弹幕",
      type: "checkbox",
      checked: false,
      click: (item) => {
        mainWindow.webContents.send("toggle-pause", item.checked);
      },
    },
    {
      label: "设置",
      click: () => {
        createSettingsWindow();
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Danmaku Overlay");
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  setupIPC();
  createWindow();
  createTray();
  startPythonBackend();

  // Auto-open settings if launched with --settings flag
  if (process.argv.includes("--settings")) {
    createSettingsWindow();
  }
});

app.on("before-quit", () => {
  stopPythonBackend();
});

app.on("window-all-closed", () => {
  app.quit();
});
