import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "@shared/ipc";
import { APP_CHANNELS } from "@shared/ipc";

console.log("[preload] loaded");

const api: DesktopApi = {
  listMonths: (tsvFolder) => {
    console.log("[preload] invoke listMonths", tsvFolder);
    return ipcRenderer.invoke(APP_CHANNELS.LIST_MONTHS, tsvFolder);
  },
  generateOutputs: (request) => {
    console.log("[preload] invoke generateOutputs", request.options.month, request.targets.join(","));
    return ipcRenderer.invoke(APP_CHANNELS.GENERATE_OUTPUTS, request);
  },
  selectOutputFolder: () => {
    console.log("[preload] invoke selectOutputFolder");
    return ipcRenderer.invoke(APP_CHANNELS.SELECT_OUTPUT_FOLDER);
  },
  getDefaultOutputFolder: () => {
    console.log("[preload] invoke getDefaultOutputFolder");
    return ipcRenderer.invoke(APP_CHANNELS.GET_DEFAULT_OUTPUT_FOLDER);
  },
  showInFolder: (filePath) => {
    console.log("[preload] invoke showInFolder", filePath);
    return ipcRenderer.invoke(APP_CHANNELS.SHOW_IN_FOLDER, { filePath });
  }
};

contextBridge.exposeInMainWorld("appApi", api);
console.log("[preload] appApi exposed");
