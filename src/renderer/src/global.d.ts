import type { DesktopApi } from "@shared/ipc";

declare global {
  interface Window {
    appApi: DesktopApi;
    __EXPORT_PLAN__?: unknown;
  }
}

export {};
