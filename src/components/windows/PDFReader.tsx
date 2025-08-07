import React, { useEffect, useState, useRef } from "react";
import * as pdfjs from "pdfjs-dist";
//@ts-ignore
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { ClipLoader } from "react-spinners";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

import { readFile } from "../../utils";

interface PDFReaderProps {
  path: string;
}

const isRemoteURL = (str: string): boolean => {
  return str.startsWith("http://") || str.startsWith("https://");
};

const PDFReader: React.FC<PDFReaderProps> = ({ path }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const objectUrlRef = useRef<string | null>(null);

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    setLoading(true);
    setError(null);
    setFileUrl(null);

    const loadPdf = async () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      let finalUrlToViewer: string | null = null;

      try {
        if (isRemoteURL(path)) {
          finalUrlToViewer = path;
        } else {
          const arrayBuffer = await readFile(path);
          const blob = new Blob([arrayBuffer], { type: "application/pdf" });
          finalUrlToViewer = URL.createObjectURL(blob);
          objectUrlRef.current = finalUrlToViewer;

          if (!finalUrlToViewer) {
            throw new Error("Failed to create Object URL for local file.");
          }
        }

        setFileUrl(finalUrlToViewer);
      } catch (err: any) {
        console.error("Failed to load or process PDF:", err);
        setError(`Failed to load PDF: ${err.message || "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    };

    loadPdf();

    // Cleanup: Revoke object URL when component unmounts or path changes
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [path]); // Effect runs when 'path' changes

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#101010]/80">
        <ClipLoader className="text-white" color="#fff" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#101010]/80 text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#101010]/80 text-gray-400">
        No PDF URL provided.
      </div>
    );
  }

  return (
    <Worker
      workerUrl={`https://unpkg.com/pdfjs-dist@${
        (pdfjs as any).version
      }/build/pdf.worker.min.js`}
    >
      <div className="pdf-viewer-container w-full h-full">
        <Viewer
          fileUrl={fileUrl}
          plugins={[defaultLayoutPluginInstance]}
          theme="dark"
        />
      </div>
    </Worker>
  );
};

export default PDFReader;
