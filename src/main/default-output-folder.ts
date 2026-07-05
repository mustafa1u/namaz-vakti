export type UserFolderName = "documents" | "downloads";

export type DefaultOutputFolderDependencies = {
  getPath: (name: UserFolderName) => string;
  exists: (folderPath: string) => boolean;
};

function getExistingUserFolder(
  dependencies: DefaultOutputFolderDependencies,
  name: UserFolderName
): string {
  try {
    const folderPath = dependencies.getPath(name).trim();
    if (folderPath && dependencies.exists(folderPath)) {
      return folderPath;
    }
  } catch {
    return "";
  }

  return "";
}

export function resolveDefaultOutputFolder(dependencies: DefaultOutputFolderDependencies): string {
  return getExistingUserFolder(dependencies, "documents")
    || getExistingUserFolder(dependencies, "downloads")
    || "";
}
