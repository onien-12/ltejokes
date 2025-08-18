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

async function findOptions(currentDirPath: string, baseFsRoot: string): Promise<DirectoryOptions | undefined> {
  let searchPath = currentDirPath;

  while (searchPath.startsWith(baseFsRoot)) {
    const optionsFilePath = path.join(searchPath, "options.json");

    try {
      const optionsFileContent = await fs.readFile(optionsFilePath, "utf-8");
      return JSON.parse(optionsFileContent);
    } catch (readError: any) {
      if (readError.code === "ENOENT") {
        const parentPath = path.dirname(searchPath);
        if (parentPath === searchPath) {
          break;
        }
        searchPath = parentPath;
      } else {
        console.warn(`Failed to read or parse options.json in ${searchPath}: ${readError.message}`);
        break;
      }
    }
  }

  return undefined;
}

const sanitizePath = (baseDir: string, reqPath: string): string => {
  const normalizedReqPath = path.normalize(reqPath);

  const fullPath = path.join(baseDir, normalizedReqPath);

  if (!fullPath.startsWith(baseDir)) {
    throw new Error("Access denied: Path is outside the allowed directory.");
  }

  return fullPath;
};

export const getFilesystemRoute = (baseFsRoot: string) => async (req: Request, res: Response) => {
  const relPath = (req.query.path as string) || "/";

  let dirPath: string;

  try {
    dirPath = sanitizePath(baseFsRoot, relPath);
  } catch (error: any) {
    return res.status(403).json({ error: error.message });
  }

  try {
    const stats = await fs.stat(dirPath);

    if (!stats.isDirectory()) {
      return res.status(400).json({ error: "Requested path is not a directory." });
    }

    const dirContents = await fs.readdir(dirPath, {
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

    const options = await findOptions(dirPath, baseFsRoot);

    const response: FileSystemResponse = {
      currentPath: relPath,
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

export const getFileContentRoute = (baseFsRoot: string) => async (req: Request, res: Response) => {
  const relativePath = req.query.path as string;
  const download = req.query.download ?? false;

  if (!relativePath) {
    return res.status(400).json({ error: 'Missing "path" query parameter.' });
  }

  let filePath: string;

  try {
    filePath = sanitizePath(baseFsRoot, relativePath);
  } catch (error: any) {
    return res.status(403).json({ error: error.message });
  }

  try {
    const stats = await fs.stat(filePath);

    if (!stats.isFile()) {
      return res.status(400).json({ error: "Requested path is not a file." });
    }

    const contentType = mime.lookup(filePath) || "application/octet-stream";

    const fileSize = stats.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      const chunksize = end - start + 1;

      if (start >= fileSize || end >= fileSize || start < 0 || start > end) {
        res
          .status(416)
          .set({
            "Content-Range": `bytes */${fileSize}`,
          })
          .end();
        return;
      }

      const stream = createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
      });

      stream.pipe(res);

      stream.on("error", (streamError: any) => {
        console.error(`Error streaming partial file ${filePath}:`, streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal server error while streaming partial file." });
        } else {
          res.end();
        }
      });
    } else {
      const stream = createReadStream(filePath);

      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        ...(download ? { "Content-Disposition": `attachment; filename="${relativePath.split("/").at(-1)}"` } : {}),
      });

      stream.pipe(res);

      stream.on("error", (streamError: any) => {
        console.error(`Error streaming full file ${filePath}:`, streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal server error while streaming full file." });
        } else {
          res.end();
        }
      });
    }
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "File not found." });
    }
    console.error("Filesystem API error (getFileContent):", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
