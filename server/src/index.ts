import express from "express";
import path from "path";
import cors from "cors";
import { getFileContentRoute, getFilesystemRoute } from "./filesystemRoutes";
import { cwd } from "process";

const app = express();
const PORT = process.env.PORT || 3001;

const FS_ROOT = path.join(cwd(), "fs_root");

app.use(cors());
app.use(express.json());

app.get("/api/filesystem", getFilesystemRoute(FS_ROOT));
app.get("/api/filesystem/file", getFileContentRoute(FS_ROOT));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Serving filesystem from: ${FS_ROOT}`);
});
