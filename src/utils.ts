import { FileItem } from "./store/useFilesystemStore";

export function formatTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = pad(date.getFullYear() % 100);

  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

export const findFolderByPath = (
  fileSystem: FileItem[],
  pathSegments: string[]
): FileItem[] | null => {
  let currentLevel = fileSystem;
  for (const segment of pathSegments) {
    const next = currentLevel.find(
      (f) => f.name === segment && f.type === "folder"
    );
    if (next?.contents) {
      currentLevel = next.contents;
    } else {
      return null;
    }
  }
  return currentLevel;
};

export const findFileByPath = (
  filesystem: FileItem[],
  resolvedPathSegments: string[]
): FileItem | null => {
  if (resolvedPathSegments.length === 0) return null;

  const fileName = resolvedPathSegments[resolvedPathSegments.length - 1];
  const dirPathSegments = resolvedPathSegments.slice(0, -1);

  const parentFolderContents = findFolderByPath(filesystem, dirPathSegments);

  if (parentFolderContents) {
    return (
      parentFolderContents.find(
        (item) => item.name === fileName && item.type === "file"
      ) || null
    );
  }
  return null;
};

export const resolvePath = (
  currentPathSegments: string[],
  targetPathString: string
): string[] => {
  const pathParts = targetPathString.split("/").filter(Boolean);

  let resolvedSegments: string[] = [];

  if (targetPathString.startsWith("/")) {
    resolvedSegments = [];
  } else {
    resolvedSegments = [...currentPathSegments];
  }

  for (const part of pathParts) {
    if (part === "..") {
      if (resolvedSegments.length > 0) {
        resolvedSegments.pop();
      }
    } else if (part !== ".") {
      resolvedSegments.push(part);
    }
  }

  return resolvedSegments;
};

export const readFile = async (path: string) => {
  return fetch(
    "/filesystem/" + (path.startsWith("/") ? path.slice(1) : path)
  ).then((rsp) => rsp.arrayBuffer());
};
