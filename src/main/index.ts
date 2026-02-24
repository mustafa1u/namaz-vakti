import { app, BrowserWindow } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc-handlers";

let mainWindow: BrowserWindow | null = null;

function resolveAppIconPath(): string | undefined {
  const iconNames = process.platform === "win32"
    ? ["app.ico", "app.png"]
    : ["app.png"];
  const bases = [
    app.getAppPath(),
    process.cwd(),
    join(process.cwd(), "desktop-app"),
    join(__dirname, ".."),
    join(__dirname, "../.."),
    join(__dirname, "../../..")
  ];
  const candidates = bases.flatMap((base) => iconNames.map((name) => join(base, "build/icons", name)));
  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) {
    console.log(`[main] icon lookup failed. appPath=${app.getAppPath()} cwd=${process.cwd()} __dirname=${__dirname}`);
  }
  return resolved;
}

function createMainWindow(): void {
  const preloadCandidates = [
    join(__dirname, "../preload/index.mjs"),
    join(__dirname, "../preload/index.js"),
    join(__dirname, "../preload/index.cjs")
  ];
  const preloadPath = preloadCandidates.find((candidate) => existsSync(candidate)) ?? preloadCandidates[0]!;

  console.log("[main] creating window");
  console.log(`[main] preload path: ${preloadPath}`);
  console.log(`[main] preload exists: ${existsSync(preloadPath)}`);
  const iconPath = resolveAppIconPath();
  console.log(`[main] icon path: ${iconPath ?? "<none>"}`);

  mainWindow = new BrowserWindow({
    width: 1160,
    height: 860,
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.on("console-message", (_event, level, message) => {
    console.log(`[renderer:${level}] ${message}`);
  });
  mainWindow.webContents.on("did-fail-load", (_event, code, desc) => {
    console.error(`[main] renderer failed to load: ${code} ${desc}`);
  });
  mainWindow.webContents.on("preload-error", (_event, preloadPathValue, error) => {
    console.error(`[main] preload error at ${preloadPathValue}: ${error}`);
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  if (process.env.ELECTRON_RENDERER_URL) {
    console.log(`[main] loading renderer url: ${process.env.ELECTRON_RENDERER_URL}`);
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    const htmlPath = join(__dirname, "../renderer/index.html");
    console.log(`[main] loading renderer file: ${htmlPath}`);
    mainWindow.loadFile(htmlPath);
  }

  registerIpcHandlers(() => mainWindow);
}

app.whenReady().then(() => {
  if (process.platform === "darwin" && app.dock) {
    const dockIconPath = join(app.getAppPath(), "build/icons/app.png");
    if (existsSync(dockIconPath)) {
      app.dock.setIcon(dockIconPath);
    }
  }
  createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
