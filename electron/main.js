const { app, BrowserWindow, ipcMain, protocol } = require("electron");
const path = require("path");
const { existsSync } = require("fs");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

let mainWin = null;

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

    // Intercept file protocol to remap absolute paths to dist folder
    mainWin.webContents.session.protocol.interceptFileProtocol(
      "file",
      (request, callback) => {
        let url = request.url.replace(/^file:\/\//, "");
        url = decodeURIComponent(url);

        if (existsSync(url)) {
          return callback(url);
        }

        // Strip Windows drive letter and remap to dist
        const stripped = url.replace(/^\/[A-Za-z]:/, "").replace(/^\//, "");
        const distFile = path.join(__dirname, "../dist", stripped);

        if (existsSync(distFile)) {
          return callback(distFile);
        }

        callback(url);
      }
    );
  }
}

ipcMain.on("window-minimize", () => mainWin?.minimize());
ipcMain.on("window-maximize", () => {
  if (mainWin?.isMaximized()) mainWin.unmaximize();
  else mainWin?.maximize();
});
ipcMain.on("window-close", () => mainWin?.close());

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});