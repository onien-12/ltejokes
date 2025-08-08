import { Request, Response, Router } from "express";
import fs from "fs/promises";
import { createReadStream } from "fs";
import mime from "mime";
import path from "path";

interface FileItem {
  name: string;
  type: "file" | "folder";
}

interface DirectoryOptions {
  groupName?: string;
  relatedGroups?: string[];
}

interface FileSystemResponse {
  currentPath: string;
  contents: FileItem[];
  options?: DirectoryOptions;
}

const sanitizePath = (baseDir: string, reqPath: string): string => {
  const normalizedReqPath = path.normalize(reqPath);

  const fullPath = path.join(baseDir, normalizedReqPath);

  if (!fullPath.startsWith(baseDir)) {
    throw new Error("Access denied: Path is outside the allowed directory.");
  }

  return fullPath;
};

export const getFilesystemRoute =
  (baseFsRoot: string) => async (req: Request, res: Response) => {
    const requestedRelativePath = (req.query.path as string) || "/";

    let currentDirectoryPath: string;

    try {
      currentDirectoryPath = sanitizePath(baseFsRoot, requestedRelativePath);
    } catch (error: any) {
      return res.status(403).json({ error: error.message });
    }

    try {
      const stats = await fs.stat(currentDirectoryPath);

      if (!stats.isDirectory()) {
        return res
          .status(400)
          .json({ error: "Requested path is not a directory." });
      }

      const dirContents = await fs.readdir(currentDirectoryPath, {
        withFileTypes: true,
      });

      const contents: FileItem[] = dirContents
        .map((dirent) => {
          const type = dirent.isDirectory() ? "folder" : "file";
          return {
            name: dirent.name,
            type: type as FileItem["type"],
          };
        })
        .filter((dirent) => dirent.name != "options.json")
        .sort((a, b) => {
          if (a.type === "folder" && b.type !== "folder") return -1;
          if (a.type !== "folder" && b.type === "folder") return 1;
          return a.name.localeCompare(b.name);
        });

      let options: DirectoryOptions | undefined;
      const optionsFilePath = path.join(currentDirectoryPath, "options.json");

      try {
        const optionsFileContent = await fs.readFile(optionsFilePath, "utf-8");
        options = JSON.parse(optionsFileContent);
      } catch (readError: any) {
        if (readError.code !== "ENOENT") {
          console.warn(
            `Failed to read or parse options.json in ${currentDirectoryPath}: ${readError.message}`
          );
        }
      }

      const response: FileSystemResponse = {
        currentPath: requestedRelativePath,
        contents: contents,
        options: options,
      };

      res.json(response);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return res.status(404).json({ error: "Directory not found." });
      }
      console.error("Filesystem API error:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  };

export const getFileContentRoute =
  (baseFsRoot: string) => async (req: Request, res: Response) => {
    const requestedRelativePath = req.query.path as string;

    if (!requestedRelativePath) {
      return res.status(400).json({ error: 'Missing "path" query parameter.' });
    }

    let filePath: string;

    try {
      filePath = sanitizePath(baseFsRoot, requestedRelativePath);
    } catch (error: any) {
      return res.status(403).json({ error: error.message });
    }

    try {
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        return res.status(400).json({ error: "Requested path is not a file." });
      }

      const contentType = mime.lookup(filePath) || "application/octet-stream";

      res.setHeader("Content-Type", contentType);

      const fileStream = createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on("error", (streamError: any) => {
        console.error(`Error streaming file ${filePath}:`, streamError);
        if (!res.headersSent) {
          res
            .status(500)
            .json({ error: "Internal server error while streaming file." });
        } else {
          res.end();
        }
      });
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return res.status(404).json({ error: "File not found." });
      }
      console.error("Filesystem API error (getFileContent):", error);
      res.status(500).json({ error: "Internal server error." });
    }
  };
