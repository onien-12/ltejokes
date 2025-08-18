// src/components/windows/HTMLViewer.tsx

import React, { useEffect, useState, useRef } from "react";
import { ClipLoader } from "react-spinners";
import { readFile } from "../../utils";

interface HTMLViewerProps {
  path: string;
}

const isRemoteURL = (str: string): boolean => {
  return str.startsWith("http://") || str.startsWith("https://");
};

const HTMLViewer: React.FC<HTMLViewerProps> = ({ path }) => {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const viewerContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setHtmlContent(null);

    const loadHtml = async () => {
      try {
        let content: string;

        if (isRemoteURL(path)) {
          const response = await fetch(path);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          content = await response.text();
        } else {
          const arrayBuffer = await readFile(path);
          content = new TextDecoder().decode(arrayBuffer);
        }

        setHtmlContent(content);
      } catch (err: any) {
        console.error("Failed to load HTML:", err);
        setError(`Failed to load HTML: ${err.message || "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    };

    loadHtml();
  }, [path]);

  useEffect(() => {
    const viewerContainer = viewerContentRef.current;
    if (!viewerContainer) return;

    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      const anchor = target.closest("a");

      if (anchor) {
        //@ts-expect-error
        const href = anchor.getAttribute("href") ?? anchor.href.baseVal;
        if (href && href.startsWith("#")) {
          event.preventDefault();

          const id = href.substring(1);
          const targetElement = viewerContainer.querySelector(`#${id}`);

          if (targetElement) {
            const targetRect = targetElement.getBoundingClientRect();
            const containerRect = viewerContainer.getBoundingClientRect();
            const scrollOffset = targetRect.top - containerRect.top + viewerContainer.scrollTop;

            viewerContainer.scrollTo({ top: scrollOffset, behavior: "smooth" });
          } else {
            console.warn(`HTMLViewer: Target element with ID '${id}' not found for anchor link.`);
          }
        }
      }
    };

    viewerContainer.addEventListener("click", handleAnchorClick);

    return () => {
      viewerContainer.removeEventListener("click", handleAnchorClick);
    };
  }, [htmlContent]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#060606]/80 p-4 text-start select-text">
      {loading ? (
        <ClipLoader className="text-white" color="#fff" />
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : htmlContent !== null ? (
        <div
          ref={viewerContentRef}
          className="w-full h-full overflow-auto p-2"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      ) : (
        <div className="text-gray-400">No HTML content loaded.</div>
      )}
    </div>
  );
};

export default HTMLViewer;
