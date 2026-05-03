import axios from "axios";
import { Request, Response, Router } from "express";
import fs from "fs/promises";
import { compareVersions, sanitizeSearchString } from "./utils";

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

    let releases: string[] | undefined;
    if (releasesToFilter) {
      releases = releasesToFilter.split(",").map((code) => code.trim());
    }

    const allReleases = await loadAndCache3GPPData(_3gppSpecsFilePath);

    let result: Release[] = [];

    allReleases.forEach((release) => {
      if (releases && !releases.includes(release.code)) {
        return;
      }

      const documents: Document[] = [];
      release.documents.forEach((doc) => {
        const revisions: Revision[] = [];
        doc.revisions.forEach((rev) => {
          const termWords = searchTerm ? searchTerm.toLowerCase().split(/\s/g) : [];
          const matches =
            !termWords.length ||
            termWords.filter(
              (term) =>
                sanitizeSearchString(release.code).includes(term) ||
                sanitizeSearchString(release.name).includes(term) ||
                sanitizeSearchString(doc.code).includes(term) ||
                sanitizeSearchString(doc.name).includes(term) ||
                sanitizeSearchString(rev.code).includes(term) ||
                sanitizeSearchString(rev.file).includes(term),
            ).length > Math.ceil(termWords.length / 2);

          if (matches) {
            revisions.push(rev);
          }
        });

        if (revisions.length > 0) {
          documents.push({ ...doc, revisions: revisions });
        }
      });

      if (documents.length > 0) {
        result.push({ ...release, documents: documents });
      }
    });

    console.log(
      `[Server] Responding with ${result.length} releases (filtered by releases query: ${
        releasesToFilter || "all"
      }, and search term: "${searchTerm || "none"}")`,
    );
    res.json({ releases: result });
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
