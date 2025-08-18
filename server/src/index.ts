import express from "express";
import path from "path";
import cors from "cors";
import { getFileContentRoute, getFilesystemRoute } from "./filesystemRoutes";
import { cwd } from "process";
import { get3GPPDataRoute, getEtsiProxyRoute } from "./3gppRoutes";
import fs from "fs/promises";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import { handleMusicUpload } from "./musicRoutes";
import which from "which";

ffmpeg.setFfmpegPath(which.sync("ffmpeg"));
ffmpeg.setFfprobePath(which.sync("ffprobe"));

const app = express();
const PORT = process.env.PORT || 3001;

const FS_ROOT = path.join(cwd(), "fs_root");
const _3GPP_SPECS_JSON_PATH = path.join(FS_ROOT, "projects/telco/other/etsi_index.json");

const upload = multer({
  dest: path.join(FS_ROOT, "apps", "postixfy", "temp_uploads"),
  limits: { fileSize: 100 * 1024 * 1024 },
});

fs.mkdir(path.join(FS_ROOT, "apps", "postixfy", "temp_uploads"), { recursive: true }).catch((err) =>
  console.error("Error creating temp_uploads dir:", err)
);

app.use(cors());
app.use(express.json());

app.get("/api/filesystem", getFilesystemRoute(FS_ROOT));
app.get("/api/filesystem/file", getFileContentRoute(FS_ROOT));
app.get("/api/3gpp_specs.json", get3GPPDataRoute(_3GPP_SPECS_JSON_PATH));
app.get("/api/proxy/etsi", getEtsiProxyRoute());

app.post(
  "/api/apps/postixfy/upload",
  upload.fields([
    { name: "audioFile", maxCount: 1 },
    { name: "trackImageFile", maxCount: 1 },
    { name: "iconFile", maxCount: 1 },
  ]),
  //@ts-expect-error
  handleMusicUpload(FS_ROOT, ffmpeg)
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Serving filesystem from: ${FS_ROOT}`);
});
