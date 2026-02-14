import React, { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { ClipLoader } from "react-spinners";
import { readFile } from "../../utils";
import { Icon } from "@iconify-icon/react";

interface CodeViewerProps {
  path: string;
}

const getLanguageFromPath = (path: string): string => {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
      return "css";
    case "py":
      return "python";
    case "java":
      return "java";
    case "c":
    case "h":
      return "c";
    case "cpp":
    case "hpp":
    case "cc":
      return "cpp";
    case "rs":
      return "rust";
    case "go":
      return "go";
    case "sh":
    case "bash":
    case "zsh":
      return "shell";
    case "sql":
      return "sql";
    case "yaml":
    case "yml":
      return "yaml";
    case "md":
    case "markdown":
      return "markdown";
    case "xml":
      return "xml";
    default:
      return "plaintext";
  }
};

const CodeViewer: React.FC<CodeViewerProps> = ({ path }) => {
  const [content, setContent] = useState<string>("");
  const [language, setLanguage] = useState<string>("plaintext");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setContent("");

    const loadFile = async () => {
      try {
        const lang = getLanguageFromPath(path);
        if (isMounted) setLanguage(lang);

        let textContent = "";

        if (path.startsWith("http")) {
          const response = await fetch(path);
          if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
          textContent = await response.text();
        } else {
          const arrayBuffer = await readFile(path);
          const decoder = new TextDecoder("utf-8");
          textContent = decoder.decode(arrayBuffer);
        }

        if (isMounted) {
          setContent(textContent);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Failed to load code file:", err);
        if (isMounted) {
          setError(`Error loading file: ${err.message || "Unknown error"}`);
          setLoading(false);
        }
      }
    };

    loadFile();

    return () => {
      isMounted = false;
    };
  }, [path]);

  const editorOptions = {
    readOnly: true,
    domReadOnly: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    contextmenu: true,
    folding: true,
    lineNumbers: "on",
    renderLineHighlight: "all",
    scrollbar: {
      vertical: "visible",
      horizontal: "visible",
      useShadows: false,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    padding: { top: 16, bottom: 16 },
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#1e1e1e]">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-full">
          <ClipLoader color="#fff" />
          <span className="mt-2 text-gray-500 text-sm">Reading file...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full text-red-400">
          <Icon icon="material-symbols:warning" width="32" className="mb-2" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="relative w-full h-full">
          <Editor
            height="100%"
            width="100%"
            language={language}
            value={content}
            theme="vs-dark"
            // @ts-ignore
            options={editorOptions}
            loading={<ClipLoader color="#fff" size={20} />}
          />

          <div className="absolute bottom-0 right-0 bg-[#007acc] text-white text-xs px-3 py-1 rounded-tl-md flex items-center gap-2 z-10">
            <Icon icon="material-symbols:code" />
            <span>{language.toUpperCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeViewer;
