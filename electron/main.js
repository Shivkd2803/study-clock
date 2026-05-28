const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const { existsSync } = require("fs");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

let mainWin   = null;
let widgetWin = null;

// ── App state stored in main process memory ───────────────────────────────────
// Widget window requests this on load via "get-widget-state" IPC
let widgetState = { videoUrl: null };

function createWindow() {
  mainWin = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: false,
    transparent: true,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  const distPath = path.join(__dirname, "../dist/index.html");
  const isDev = !existsSync(distPath);

  if (isDev) {
    mainWin.loadURL("http://localhost:5173");
  } else {
    mainWin.loadFile(distPath);
    mainWin.webContents.session.protocol.interceptFileProtocol(
      "file",
      (request, callback) => {
        let url = request.url.replace(/^file:\/\//, "");
        url = decodeURIComponent(url);
        if (existsSync(url)) return callback(url);
        const stripped = url.replace(/^\/[A-Za-z]:/, "").replace(/^\//, "");
        const distFile = path.join(__dirname, "../dist", stripped);
        if (existsSync(distFile)) return callback(distFile);
        callback(url);
      }
    );
  }

  mainWin.on("closed", () => {
    mainWin = null;
    if (widgetWin) { widgetWin.close(); widgetWin = null; }
  });
}

// ── Widget window ─────────────────────────────────────────────────────────────
function createWidgetWindow(cb) {
  if (widgetWin) { widgetWin.focus(); cb?.(); return; }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const W = 360, H = 200;

  widgetWin = new BrowserWindow({
    width: W, height: H,
    x: width - W - 24, y: height - H - 24,
    frame: false, transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true, resizable: false,
    skipTaskbar: true, hasShadow: true,
    visibleOnAllWorkspaces: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  widgetWin.setAlwaysOnTop(true, "floating");
  widgetWin.setVisibleOnAllWorkspaces(true);

  const distPath = path.join(__dirname, "../dist/index.html");
  const isDev = !existsSync(distPath);

  if (isDev) {
    widgetWin.loadURL("http://localhost:5173/#/widget");
  } else {
    widgetWin.loadFile(distPath, { hash: "/widget" });
  }

  widgetWin.once("ready-to-show", () => {
    widgetWin.show();
    cb?.();
  });

  widgetWin.on("closed", () => {
    widgetWin = null;
    if (mainWin) mainWin.show();
  });
}

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.on("window-minimize", () => mainWin?.minimize());
ipcMain.on("window-maximize", () => {
  if (mainWin?.isMaximized()) mainWin.unmaximize();
  else mainWin?.maximize();
});
ipcMain.on("window-close", () => mainWin?.close());

// Main window saves current video URL whenever background changes
ipcMain.on("set-widget-state", (_, state) => {
  widgetState = { ...widgetState, ...state };
  // If widget is already open, push the update to it live
  if (widgetWin) widgetWin.webContents.send("widget-state", widgetState);
});

// Widget window requests state on load — synchronous reply
ipcMain.on("get-widget-state", (event) => {
  event.returnValue = widgetState;
});

// Open widget window
ipcMain.on("window-widget", (_, state) => {
  if (state) widgetState = { ...widgetState, ...state };
  createWidgetWindow(() => {
    if (mainWin) mainWin.hide();
  });
});

// Close widget and restore main
ipcMain.on("window-unwidget", () => {
  if (widgetWin) { widgetWin.close(); widgetWin = null; }
  if (mainWin) mainWin.show();
});

// Quit entire app — triggered by widget close button
ipcMain.on("window-quit", () => {
  if (widgetWin) { widgetWin.destroy(); widgetWin = null; }
  if (mainWin)  { mainWin.destroy();  mainWin  = null; }
  app.quit();
});

// Widget dragging
ipcMain.on("widget-drag", (_, { dx, dy }) => {
  if (!widgetWin) return;
  const [x, y] = widgetWin.getPosition();
  widgetWin.setPosition(x + dx, y + dy);
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });