const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  minimize:   () => ipcRenderer.send("window-minimize"),
  maximize:   () => ipcRenderer.send("window-maximize"),
  close:      () => ipcRenderer.send("window-close"),
  widget:     () => ipcRenderer.send("window-widget"),
  unwidget:   () => ipcRenderer.send("window-unwidget"),
  widgetDrag: (dx, dy) => ipcRenderer.send("widget-drag", { dx, dy }),
});