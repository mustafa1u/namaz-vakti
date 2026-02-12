import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "@shared/ipc";
import { APP_CHANNELS } from "@shared/ipc";

console.log("[preload] loaded");

const api: DesktopApi = {
  listMonths: (tsvFolder) => {
    console.log("[preload] invoke listMonths", tsvFolder);
    return ipcRenderer.invoke(APP_CHANNELS.LIST_MONTHS, tsvFolder);
  },
  previewMonth: (options) => {
    console.log("[preload] invoke previewMonth", options.month);
    return ipcRenderer.invoke(APP_CHANNELS.PREVIEW_MONTH, options);
  },
  generateOutputs: (options) => {
    console.log("[preload] invoke generateOutputs", options.month);
    return ipcRenderer.invoke(APP_CHANNELS.GENERATE_OUTPUTS, options);
  },
  selectTsvFolder: () => {
    console.log("[preload] invoke selectTsvFolder");
    return ipcRenderer.invoke(APP_CHANNELS.SELECT_TSV_FOLDER);
  },
  selectOutputFolder: () => {
    console.log("[preload] invoke selectOutputFolder");
    return ipcRenderer.invoke(APP_CHANNELS.SELECT_OUTPUT_FOLDER);
  },
  selectTemplateFile: () => {
    console.log("[preload] invoke selectTemplateFile");
    return ipcRenderer.invoke(APP_CHANNELS.SELECT_TEMPLATE_FILE);
  }
};

contextBridge.exposeInMainWorld("appApi", api);
console.log("[preload] appApi exposed");
