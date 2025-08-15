import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Input from "../../utils/Input";
import Button from "../../utils/Button";
import { ClipLoader } from "react-spinners";
import { API } from "../../../utils";
import { handleOpen } from "../FileManager";
import { useSystemStore } from "../../../store/useSystemStore";
import { useVirtualizer } from "@tanstack/react-virtual";

const RELEASE_NAMES = {
  "00": "General information",
  "01": "Requirements",
  "02": "Service aspects (stage 1)",
  "03": "Technical realization (stage 2)",
  "04": 'Signalling protocols ("stage 3") - user equipment to network',
  "05": "GSM radio aspects",
  "06": "CODECs",
  "07": "Data",
  "08": 'Signalling protocols ("stage 3") - (RSS-CN)',
  "09": 'Signalling protocols ("stage 3") - (intra-fixed-network)',
  "10": "Programme management",
  "11": "Subscriber Identity Module",
  "12": "OAM&P and Charging",
  "13": "Access requirements and test specifications",
  "21": "Requirements",
  "22": "Service aspects",
  "23": "Technical realization",
  "24": 'Signalling protocols ("stage 3") - user equipment to network',
  "25": "UTRA radio aspects",
  "26": "CODECs",
  "27": "Data",
  "28": 'Signalling protocols ("stage 3") - (RSS-CN) and OAM&P and Charging (overflow from 32.- range)',
  "29": 'Signalling protocols ("stage 3") - (intra-fixed-network)',
  "30": "Programme management",
  "31": "Subscriber Identity Module (SIM / USIM), IC Cards, Test specs.",
  "32": "OAM&P and Charging",
  "33": "Security aspects",
  "34": "UE and (U)SIM test specifications",
  "35": "Security algorithms",
  "36": "LTE (Evolved UTRA) and LTE-Advanced radio aspects",
  "37": "Multiple radio access technology aspects",
  "38": "Radio technology beyond LTE",
  "41": "Requirements",
  "42": "Service aspects (stage 1)",
  "43": "Technical realization (stage 2)",
  "44": "Signalling protocols (user equipment to network)",
  "45": "GSM radio aspects",
  "46": "CODECs",
  "47": "Data",
  "48": "Signalling protocols (RSS-CN)",
  "49": "Signalling protocols (intra-fixed-network)",
  "50": "Programme management",
  "51": "Subscriber Identity Module",
  "52": "O&M",
  "55": "Security algorithms",
};

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

interface Navigator3GPPProps {
  initialReleaseCode?: string;
  initialDocumentCode?: string;
  initialRevisionCode?: string;
  initialSearchTerm?: string;
}

const Navigator3GPP: React.FC<Navigator3GPPProps> = ({
  initialReleaseCode = "38",
  initialDocumentCode = "211",
  initialRevisionCode,
  initialSearchTerm = "",
}) => {
  const addCustomWindow = useSystemStore((state) => state.addCustomWindow);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedReleaseCode, setSelectedReleaseCode] = useState<string | undefined>(initialReleaseCode);
  const [selectedDocumentCode, setSelectedDocumentCode] = useState<string | undefined>(initialDocumentCode);
  const [selectedRevisionCode, setSelectedRevisionCode] = useState<string | undefined>(initialRevisionCode);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [throttledSearchTerm, setThrottledSearchTerm] = useState(initialSearchTerm);

  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const fetch3GPPData = useCallback(async (filterReleases?: string[], currentSearchTerm?: string) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filterReleases && filterReleases.length > 0) {
        queryParams.append("releases", filterReleases.join(","));
      }
      if (currentSearchTerm) {
        queryParams.append("searchTerm", currentSearchTerm);
      }

      const url = `${API}/api/3gpp_specs.json?${queryParams.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch 3GPP data: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      if (!Array.isArray(data.releases)) {
        throw new Error("Invalid 3GPP data format: 'releases' array not found at root.");
      }
      setReleases(data.releases);
    } catch (err: any) {
      console.error("Error fetching 3GPP data:", err);
      setError(err.message || "Failed to load 3GPP data");
      setReleases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const currentFilterReleases = selectedReleaseCode ? [selectedReleaseCode] : [];
    fetch3GPPData(currentFilterReleases, throttledSearchTerm);
  }, [fetch3GPPData, selectedReleaseCode, throttledSearchTerm]);

  let selectedRelease: Release | undefined,
    availableDocuments: Document[],
    selectedDocument: Document | undefined,
    availableRevisions: Revision[];

  //prettier-ignore
  {
    selectedRelease = useMemo(() => releases.find((r) => r.code === selectedReleaseCode), [releases, selectedReleaseCode]);
    availableDocuments = useMemo(() => (selectedRelease ? selectedRelease.documents : []), [selectedRelease]);
    selectedDocument = useMemo(() => availableDocuments.find((d) => d.code === selectedDocumentCode), [availableDocuments, selectedDocumentCode]);
    availableRevisions = useMemo(() => (selectedDocument ? selectedDocument.revisions : []), [selectedDocument]);
  }

  const filteredResults = useMemo(() => {
    let results: { release: Release; document: Document; revision: Revision }[] = [];
    releases.forEach((release) => {
      release.documents.forEach((doc) => {
        doc.revisions.forEach((rev) => {
          const releaseMatch = !selectedReleaseCode || release.code === selectedReleaseCode;
          const documentMatch = !selectedDocumentCode || doc.code === selectedDocumentCode;
          const revisionMatch = !selectedRevisionCode || rev.code === selectedRevisionCode;

          if (releaseMatch && documentMatch && revisionMatch) {
            results.push({ release, document: doc, revision: rev });
          }
        });
      });
    });
    return results;
  }, [releases, selectedReleaseCode, selectedDocumentCode, selectedRevisionCode]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);

    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
    }

    throttleTimerRef.current = setTimeout(() => {
      setThrottledSearchTerm(value);
    }, 500);
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: filteredResults.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => 200, []),
    overscan: 5,
    gap: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#2a2a2a] text-red-500 text-center p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#111111]/80 text-white scrollable select-text">
      <div className="p-4 border-b border-[#444] flex flex-col gap-3">
        <div className="p-1 flex flex-row gap-2">
          <select
            className="bg-[#111111]/70 text-white border border-[#444] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5c5c5c] focus:border-[#5c5c5c] transition-all w-full"
            value={selectedReleaseCode || ""}
            onChange={(e) => {
              setSelectedReleaseCode(e.target.value || undefined);
              setSelectedDocumentCode(undefined);
              setSelectedRevisionCode(undefined);
            }}
          >
            <option value="">-- Select Release --</option>
            {Object.entries(RELEASE_NAMES)
              .sort((a, b) => +a[0] - +b[0])
              .map(([release, name]) => (
                <option value={release}>
                  {release} - {name}
                </option>
              ))}
          </select>

          <select
            className="bg-[#111111]/70 text-white border border-[#444] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5c5c5c] focus:border-[#5c5c5c] transition-all w-full"
            value={selectedDocumentCode || ""}
            onChange={(e) => {
              setSelectedDocumentCode(e.target.value || undefined);
              setSelectedRevisionCode(undefined);
            }}
            disabled={!selectedReleaseCode}
          >
            <option value="">-- Select Document --</option>
            {availableDocuments.map((doc) => (
              <option key={doc.code} value={doc.code}>
                {doc.code} - {doc.name}
              </option>
            ))}
          </select>

          <select
            className="bg-[#111111]/70 text-white border border-[#444] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5c5c5c] focus:border-[#5c5c5c] transition-all w-full"
            value={selectedRevisionCode || ""}
            onChange={(e) => setSelectedRevisionCode(e.target.value || undefined)}
            disabled={!selectedDocumentCode}
          >
            <option value="">-- Select Revision --</option>
            {availableRevisions.map((rev) => (
              <option key={rev.code} value={rev.code}>
                {rev.code}
              </option>
            ))}
          </select>
        </div>

        <Input
          placeholder="Search by code or name..."
          value={searchTerm}
          onChange={handleSearchChange}
          type="search"
          className="bg-[#111111]/70"
        />
      </div>

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        style={{ position: "relative" }}
      >
        {loading ? (
          <>
            <div className="flex items-center justify-center w-full h-full text-white">
              <ClipLoader color="#fff" />
              <span className="ml-2">Loading 3GPP data...</span>
            </div>
          </>
        ) : (
          <>
            {filteredResults.length === 0 && searchTerm ? (
              <div className="text-gray-500 text-center">No results found for "{searchTerm}".</div>
            ) : filteredResults.length === 0 ? (
              <div className="text-gray-500 text-center">Select criteria to see results.</div>
            ) : (
              <div
                style={{
                  height: rowVirtualizer.getTotalSize(),
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualRows.map((virtualRow) => {
                  const item = filteredResults[virtualRow.index];
                  return (
                    <div
                      key={virtualRow.key}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="py-3 px-4 rounded-md border border-[#444] text-left mb-4
                                bg-[#0e0e0e]/50 hover:bg-[#111111]/50 transition-colors duration-20"
                    >
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {item.release.code} {item.release.name}
                      </h3>
                      <p className="text-gray-300 text-sm mb-1">
                        {item.document.code} - {item.document.name}
                      </p>
                      <p className="text-gray-400 text-xs">Revision: {item.revision.code}</p>
                      {item.revision.file && (
                        <div className="mt-2">
                          <Button
                            onClick={() =>
                              handleOpen({
                                addCustomWindow,
                                fullPath: `${API}/api/proxy/etsi?url=${item.revision.file}`,
                                file: {
                                  name: item.revision.file.split("/").at(-1)!,
                                  type: "file",
                                },
                              })
                            }
                            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-800"
                          >
                            View PDF
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Navigator3GPP;
