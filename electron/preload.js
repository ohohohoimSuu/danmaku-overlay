const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Overlay controls
  onTogglePause: (callback) =>
    ipcRenderer.on("toggle-pause", (_event, paused) => callback(paused)),

  // Profiles
  listProfiles: () => ipcRenderer.invoke("profiles:list"),
  loadProfile: (name) => ipcRenderer.invoke("profiles:load", name),
  saveProfile: (name, data) => ipcRenderer.invoke("profiles:save", name, data),

  // Stats
  getStats: () => ipcRenderer.invoke("stats:get"),

  // API config
  loadApiConfig: () => ipcRenderer.invoke("api-config:load"),
  saveApiConfig: (config) => ipcRenderer.invoke("api-config:save", config),

  // Display config
  loadDisplayConfig: () => ipcRenderer.invoke("display-config:load"),
  saveDisplayConfig: (config) => ipcRenderer.invoke("display-config:save", config),
});
