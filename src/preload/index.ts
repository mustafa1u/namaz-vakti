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
  selectTsvFolder: () => {
    console.log("[preload] invoke selectTsvFolder");
    return ipcRenderer.invoke(APP_CHANNELS.SELECT_TSV_FOLDER);
  },
  selectOutputFolder: () => {
    console.log("[preload] invoke selectOutputFolder");
    return ipcRenderer.invoke(APP_CHANNELS.SELECT_OUTPUT_FOLDER);
  }
};

contextBridge.exposeInMainWorld("appApi", api);
console.log("[preload] appApi exposed");
