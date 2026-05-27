const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onTogglePause: (callback) =>
    ipcRenderer.on("toggle-pause", (_event, paused) => callback(paused)),
});
