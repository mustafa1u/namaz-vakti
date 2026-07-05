export type RevealInFolderDependencies = {
  exists: (filePath: string) => boolean;
  show: (filePath: string) => void;
  reuseExplorerWindow?: (filePath: string) => boolean;
  selectInExplorer?: (filePath: string) => void;
  setTimer: (callback: () => void, delayMs: number) => void;
  platform?: NodeJS.Platform;
  refreshDelaysMs?: number[];
};

export function revealFileInFolder(filePath: string, deps: RevealInFolderDependencies): boolean {
  const trimmed = filePath.trim();
  if (!trimmed || !deps.exists(trimmed)) {
    return false;
  }

  revealExistingFile(trimmed, deps);
  const refreshDelays = deps.refreshDelaysMs ?? [];

  for (const delayMs of refreshDelays) {
    deps.setTimer(() => {
      if (deps.exists(trimmed)) {
        revealExistingFile(trimmed, deps);
      }
    }, delayMs);
  }

  return true;
}

function revealExistingFile(filePath: string, deps: RevealInFolderDependencies): void {
  const platform = deps.platform ?? process.platform;
  if (platform === "win32" && deps.reuseExplorerWindow?.(filePath)) {
    return;
  }

  if (platform === "win32" && deps.selectInExplorer) {
    try {
      deps.selectInExplorer(filePath);
      return;
    } catch {
      // Fall through to Electron shell reveal.
    }
  }

  deps.show(filePath);
}
