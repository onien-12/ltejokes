import axios from "axios";
import { Request, Response, Router } from "express";
import fs from "fs/promises";
import { compareVersions } from "./utils";

export interface Revision {
  code: string;
  file: string;
}
export interface Document {
  code: string;
  name: string;
  revisions: Revision[];
}
export interface Release {
  code: string;
  name: string;
  documents: Document[];
}
interface _3GPPDataApiResponse {
  releases: Release[];
}

const ETSI_BASE_DELIVER_URL = "https://www.etsi.org/deliver/";

let all3GPPReleases: Release[] | null = null;
let _3gppDataLoadingPromise: Promise<Release[]> | null = null;

const loadAndCache3GPPData = async (filePath: string): Promise<Release[]> => {
  if (all3GPPReleases) {
    return all3GPPReleases;
  }
  if (_3gppDataLoadingPromise) {
    return _3gppDataLoadingPromise;
  }

  _3gppDataLoadingPromise = (async () => {
    console.log(`[Server] Loading full 3GPP specs from ${filePath}...`);
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      const data: _3GPPDataApiResponse = JSON.parse(fileContent);
      if (!Array.isArray(data.releases)) {
        throw new Error("Invalid 3GPP data format: 'releases' array not found at root.");
      }

      const sortedReleases = data.releases.sort((a, b) => compareVersions(b.code, a.code));

      sortedReleases.forEach((release) => {
        release.documents.sort((a, b) => compareVersions(b.code, a.code));
        release.documents.forEach((doc) => {
          doc.revisions.sort((a, b) => compareVersions(b.code, a.code));
        });
      });

      all3GPPReleases = sortedReleases;

      console.log(`[Server] Full 3GPP specs loaded and sorted. Total releases: ${all3GPPReleases.length}`);
      return all3GPPReleases;
    } catch (err) {
      console.error(`[Server] Failed to load and cache 3GPP data from ${filePath}:`, err);
      all3GPPReleases = null;
      _3gppDataLoadingPromise = null;
      throw err;
    }
  })();

  return _3gppDataLoadingPromise;
};

export const get3GPPDataRoute = (_3gppSpecsFilePath: string) => async (req: Request, res: Response) => {
  try {
    const releasesToFilter = req.query.releases as string;
    const searchTerm = req.query.searchTerm as string;

    let filteredReleaseCodes: string[] | undefined;
    if (releasesToFilter) {
      filteredReleaseCodes = releasesToFilter.split(",").map((code) => code.trim());
    }

    const allReleases = await loadAndCache3GPPData(_3gppSpecsFilePath);

    let responseReleases: Release[] = [];

    allReleases.forEach((release) => {
      if (filteredReleaseCodes && !filteredReleaseCodes.includes(release.code)) {
        return;
      }

      const filteredDocuments: Document[] = [];
      release.documents.forEach((doc) => {
        const filteredRevisions: Revision[] = [];
        doc.revisions.forEach((rev) => {
          const lowerSearchTerm = searchTerm ? searchTerm.toLowerCase() : "";
          const matchesSearch =
            !lowerSearchTerm ||
            release.code.toLowerCase().includes(lowerSearchTerm) ||
            release.name.toLowerCase().includes(lowerSearchTerm) ||
            doc.code.toLowerCase().includes(lowerSearchTerm) ||
            doc.name.toLowerCase().includes(lowerSearchTerm) ||
            rev.code.toLowerCase().includes(lowerSearchTerm) ||
            rev.file.toLowerCase().includes(lowerSearchTerm);

          if (matchesSearch) {
            filteredRevisions.push(rev);
          }
        });

        if (filteredRevisions.length > 0) {
          filteredDocuments.push({ ...doc, revisions: filteredRevisions });
        }
      });

      if (filteredDocuments.length > 0) {
        responseReleases.push({ ...release, documents: filteredDocuments });
      }
    });

    console.log(
      `[Server] Responding with ${responseReleases.length} releases (filtered by releases query: ${
        releasesToFilter || "all"
      }, and search term: "${searchTerm || "none"}")`
    );
    res.json({ releases: responseReleases });
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "3GPP specs file not found." });
    }
    console.error("3GPP Specs API error:", error);
    res.status(500).json({ error: "Failed to load 3GPP specs data." });
  }
};

export const getEtsiProxyRoute = () => async (req: Request, res: Response) => {
  const targetUrlPath = req.query.url as string;

  if (!targetUrlPath) {
    return res.status(400).json({ error: 'Missing "url" query parameter for ETSI proxy.' });
  }

  if (
    targetUrlPath.startsWith("http://") ||
    targetUrlPath.startsWith("https://") ||
    targetUrlPath.startsWith("/") ||
    targetUrlPath.includes("..")
  ) {
    if (!targetUrlPath.startsWith("etsi_ts/") && !targetUrlPath.startsWith("doc_")) {
      return res.status(403).json({ error: "Access denied: Invalid ETSI URL format." });
    }
  }

  const fullEtsiUrl = `${ETSI_BASE_DELIVER_URL}${targetUrlPath}`;
  console.log(`[Proxy] Requesting: ${fullEtsiUrl}`);

  try {
    const axiosResponse = await axios.get(fullEtsiUrl, { responseType: "stream" });
    const headersToCopy = [
      "content-type",
      "content-length",
      "last-modified",
      "etag",
      "cache-control",
      // 'accept-ranges', 'content-encoding'
    ];

    headersToCopy.forEach((headerName) => {
      const headerValue = axiosResponse.headers[headerName];
      if (headerValue) {
        res.setHeader(headerName, headerValue);
      }
    });

    res.status(axiosResponse.status);

    //@ts-expect-error
    axiosResponse.data.pipe(res);

    //@ts-expect-error
    axiosResponse.data.on("error", (streamError: any) => {
      console.error(`[Proxy] Error streaming response from ETSI for ${fullEtsiUrl}:`, streamError);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to stream response from ETSI." });
      } else {
        res.end();
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: `Failed to connect to ETSI server: ${error.message || "Unknown error"}` });
  }
};
