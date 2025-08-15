import express from "express";
import path from "path";
import cors from "cors";
import { getFileContentRoute, getFilesystemRoute } from "./filesystemRoutes";
import { cwd } from "process";
import { get3GPPDataRoute, getEtsiProxyRoute } from "./3gppRoutes";

const app = express();
const PORT = process.env.PORT || 3001;

const FS_ROOT = path.join(cwd(), "fs_root");
const _3GPP_SPECS_JSON_PATH = path.join(FS_ROOT, "telco/other/etsi_index.json");

app.use(cors());
app.use(express.json());

app.get("/api/filesystem", getFilesystemRoute(FS_ROOT));
app.get("/api/filesystem/file", getFileContentRoute(FS_ROOT));
app.get("/api/3gpp_specs.json", get3GPPDataRoute(_3GPP_SPECS_JSON_PATH));
app.get("/api/proxy/etsi", getEtsiProxyRoute());

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Serving filesystem from: ${FS_ROOT}`);
});
