const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  minimize:       () => ipcRenderer.send("window-minimize"),
  maximize:       () => ipcRenderer.send("window-maximize"),
  close:          () => ipcRenderer.send("window-close"),
  widget:         (state) => ipcRenderer.send("window-widget", state),
  unwidget:       () => ipcRenderer.send("window-unwidget"),
  widgetDrag:     (dx, dy) => ipcRenderer.send("widget-drag", { dx, dy }),
  // Main app calls this whenever background changes
  setWidgetState: (state) => ipcRenderer.send("set-widget-state", state),
  // Widget window calls this synchronously on load to get current state
  getWidgetState: () => ipcRenderer.sendSync("get-widget-state"),
  // Live updates pushed from main process to widget
  onWidgetState:  (cb) => ipcRenderer.on("widget-state", (_, state) => cb(state)),
});