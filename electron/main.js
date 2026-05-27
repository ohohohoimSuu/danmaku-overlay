const { app, BrowserWindow, Tray, Menu, nativeImage, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let tray = null;
let pythonProcess = null;

function getPythonDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "python");
  }
  return path.join(__dirname, "..", "python");
}

function getPythonExe() {
  return process.platform === "win32" ? "python" : "python3";
}

function startPythonBackend(profile) {
  const pythonDir = getPythonDir();
  const mainPy = path.join(pythonDir, "main.py");

  if (!fs.existsSync(mainPy)) {
    dialog.showErrorBox(
      "启动失败",
      `找不到 Python 后端:\n${mainPy}\n\n请确保 python/ 目录与程序在同一位置。`
    );
    return;
  }

  const args = [mainPy];
  if (profile) {
    args.push(profile);
  }

  pythonProcess = spawn(getPythonExe(), args, {
    cwd: pythonDir,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });

  pythonProcess.stdout.on("data", (data) => {
    process.stdout.write(`[backend] ${data}`);
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
      console.error(`[backend] Python 进程异常退出，退出码: ${code}`);
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
  createWindow();
  createTray();
  startPythonBackend();
});

app.on("before-quit", () => {
  stopPythonBackend();
});

app.on("window-all-closed", () => {
  app.quit();
});
