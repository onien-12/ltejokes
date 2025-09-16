import React, { useEffect, useState, useDeferredValue, useTransition, useMemo, useRef, useCallback } from "react";
import { API, readFile } from "../../../utils";
import { ClipLoader } from "react-spinners";

import "highlight.js/styles/atom-one-dark.css";
import "katex/dist/katex.min.css";

//@ts-expect-error
import { deserialize } from "react-serialize";
import type { Options as RehypeReactOptions } from "rehype-react";

import RenderIfVisible from "../../utils/RenderIfVisible";
import { useUIOptionsStore } from "../../../store/useUIOptionsStore";

import clsx from "clsx";
import { handleOpen } from "../FileManager";
import { useSystemStore } from "../../../store/useSystemStore";
import ReactDOM from "react-dom/client";
import Button from "../../utils/Button";
import { Icon } from "@iconify-icon/react";

const markdownWorker = new Worker(new URL("./renderer.worker.tsx", import.meta.url));

const GlossaryTermRenderer: React.FC<any> = ({ node, children, addCustomWindow, ...props }) => {
  const glossaryTerm =
    node.value ||
    (children && Array.isArray(children)
      ? children.map((c) => (typeof c === "string" ? c : c.props?.value || c.props?.children)).join("")
      : String(children || ""));
  const tab = node?.["data-glossary-tab"] || ("glossary" as "glossary" | "protocols" | undefined);

  const handleClick = useCallback(() => {
    handleOpen({
      file: {
        name: "glossary",
        type: "exec",
        data: { term: glossaryTerm, tab },
      },
      currentRelativePathSegments: [],
      addCustomWindow,
    });
  }, [glossaryTerm]);

  return (
    <span
      onClick={handleClick}
      className="markdown-glossary-term cursor-pointer px-1 py-0.5 rounded-sm 
               bg-blue-700/30 text-blue-300 hover:bg-blue-600/50 hover:text-blue-200 
                transition-all duration-150 ease-in-out whitespace-nowrap"
      title={`Click to open glossary for "${glossaryTerm}"`}
    >
      {children}
    </span>
  );
};

const FsImageRenderer: React.FC<any> = ({ node, children, addCustomWindow, ...props }) => {
  const path = node["data-path"];
  const alt = node["data-alt"];
  const name = node["data-name"];
  const width = node["data-width"] || undefined;
  const height = node["data-height"] || undefined;

  const maxWidth = node["data-max-width"] || undefined;
  const maxHeight = node["data-max-height"] || undefined;
  const color = node["data-color"] || "white";

  const imageUrl = path ? `${API}/api/filesystem/file?path=${encodeURIComponent(path)}` : "";

  if (!imageUrl) {
    return <span className="text-red-500">Error: Image path not specified for fs-image.</span>;
  }

  return (
    <figure
      className="my-4 flex flex-col items-center justify-center text-center cursor-pointer"
      style={{
        maxWidth: width,
        maxHeight: height,
      }}
      onClick={() =>
        handleOpen({
          file: {
            name: path.split("/").at(-1),
            type: "file",
          },
          currentRelativePathSegments: path.split("/").slice(0, -1),
          addCustomWindow,
        })
      }
    >
      <img
        src={imageUrl}
        alt={alt || name || "Custom image from filesystem"}
        className="fs-image max-w-full h-auto rounded-md shadow-md"
        style={{
          width: width ? width : "100%",
          height: height ? height : "auto",
          maxWidth: maxWidth ? maxWidth : "auto",
          maxHeight: maxHeight ? maxHeight : "auto",
          boxShadow: color == "white" ? "#686868 0px 1px 30px 0px" : undefined,
        }}
      />
      {(name || alt || children) && (
        <figcaption className="mt-2 text-sm text-gray-400">
          {name && <span>{name}</span>}
          {name && alt && <span className="mx-1">•</span>}
          {!name && !alt ? children : null}
        </figcaption>
      )}
    </figure>
  );
};

const MarginRenderer: React.FC<any> = ({ node, children, ...props }) => {
  const title = props.title || "";
  const variant = props.variant || "invisible";

  const marginLeft = Number(props.ml);
  const marginTop = Number(props.mt);
  const marginBottom = Number(props.mb);

  const baseClasses = "p-4 rounded-lg my-4";
  const variantClasses: { [key: string]: string } = {
    invisible: "",
    default: "bg-[#2a2a2a] text-white border border-[#444]",
    card: "bg-[#1e1e1e] text-white shadow-lg border border-[#333]",
    note: "text-gray-400",
    panel: "bg-[#282c34] text-gray-200 border border-[#4a4a4a] p-6",
    alert: "bg-red-800 text-red-100 border border-red-600",
  };

  const containerClassName = clsx(variant != "invisible" ? baseClasses : "", variantClasses[variant], props.className);

  const customStyles: React.CSSProperties = {};
  if (!isNaN(marginLeft)) customStyles.marginLeft = `${marginLeft}px`;
  if (!isNaN(marginTop)) customStyles.marginTop = `${marginTop}px`;
  if (!isNaN(marginBottom)) customStyles.marginBottom = `${marginBottom}px`;

  return (
    <div className={containerClassName} style={customStyles} data-variant={variant}>
      {title && <h4 className="text-lg font-bold mb-2">{title}</h4>}
      {children}
    </div>
  );
};

interface InnerRehypeRendererProps {
  nodes: any;
  components: RehypeReactOptions["components"];
  renderId: number | null;
  optimizeUI: boolean;
}

const InnerRehypeRenderer: React.FC<InnerRehypeRendererProps> = ({ nodes, components, renderId, optimizeUI }) => {
  const renderedJsx = useMemo(() => {
    if (!nodes) return null;
    if (!renderId) return null;

    try {
      console.log(nodes, renderId);
      return deserialize(nodes, {
        components,
      });
    } catch (error) {
      console.error("Error rendering HAST to JSX:", error);
      return <p className="text-red-500">Error rendering content.</p>;
    }
  }, [renderId, optimizeUI]);

  return <>{renderedJsx}</>;
};

export default function TextReader({ path }: { path: string }) {
  const { optimizeUI, renderMath } = useUIOptionsStore();
  const addCustomWindow = useSystemStore((store) => store.addCustomWindow);

  const [rawContent, setRawContent] = useState<string | null>(null);
  const [nodes, setNodes] = useState<any>(null);
  const [loadingPhase, setLoadingPhase] = useState<"idle" | "fetching" | "processing">("idle");
  const [renderId, setRenderId] = useState<number | null>(null);

  const [isPending, startTransition] = useTransition();
  const deferredPath = useDeferredValue(path);
  const deferredRenderMath = useDeferredValue(renderMath);

  const currentRequestRef = useRef<number>(Math.floor(Math.random() * 2 ** 20));
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (deferredPath === null) {
      setLoadingPhase("idle");
      return;
    }
    setRawContent(null);
    setLoadingPhase("fetching");

    readFile(deferredPath)
      .then((arrayBuffer) => {
        const content = new TextDecoder().decode(arrayBuffer);
        setRawContent(content);
      })
      .catch((error) => {
        console.error("Error reading file:", error);
        setRawContent(`<p class="text-red-500">Error reading file: ${error.message || "Unknown error"}</p>`);
        setLoadingPhase("idle");
      });
  }, [deferredPath]);

  useEffect(() => {
    if (rawContent === null) return;

    setLoadingPhase("processing");
    setNodes(null);
    setRenderId(null);

    console.log("processing");

    const requestId = ++currentRequestRef.current;

    const handleWorkerMessage = (event: MessageEvent<{ nodes?: any; error?: string; requestId: number }>) => {
      console.log(event.data.requestId, requestId);
      if (event.data.requestId !== requestId) {
        return;
      }
      if (event.data.nodes !== undefined) {
        startTransition(() => {
          setNodes(event.data.nodes);
          setRenderId(requestId);
          setLoadingPhase("idle");
        });
      } else if (event.data.error) {
        console.error("Worker error:", event.data.error);
        startTransition(() => {
          setNodes({
            type: "root",
            children: [
              {
                type: "element",
                tagName: "p",
                properties: { className: "text-red-500" },
                children: [
                  {
                    type: "text",
                    value: `Error from worker: ${event.data.error}`,
                  },
                ],
              },
            ],
          });
          setLoadingPhase("idle");
          setRenderId(0);
        });
      }
    };

    markdownWorker.addEventListener("message", handleWorkerMessage);

    markdownWorker.postMessage({
      markdown: rawContent,
      requestId: requestId,
      renderMath: deferredRenderMath,
    });

    return () => {
      markdownWorker.removeEventListener("message", handleWorkerMessage);
    };
  }, [rawContent, deferredRenderMath]);

  const components = useMemo(
    () =>
      (optimize: boolean = true) => {
        const Optimize = ({
          children,
          type,
          props,
          isInline = false,
        }: {
          children: React.ReactNode;
          type: string;
          props: any;
          isInline?: boolean;
        }) => {
          return optimizeUI && optimize ? (
            <RenderIfVisible
              key={`riw-${type}-${props.key || Date.now()}`}
              rootElementClass={isInline ? "inline" : undefined}
            >
              {children}
            </RenderIfVisible>
          ) : (
            <>{children}</>
          );
        };

        return {
          "<fragment>": (props: any) => {
            return <>{props.children}</>;
          },
          p: (props: any) => {
            const paragraph = <p key={props.key}>{props.children}</p>;
            return (
              <Optimize type="p" props={props}>
                {paragraph}
              </Optimize>
            );
          },
          h1: (props: any) => {
            const heading = <h1 key={props.key}>{props.children}</h1>;
            return (
              <Optimize type="h1" props={props}>
                {heading}
              </Optimize>
            );
          },
          table: (props: any) => {
            return (
              <div className="table-wrapper">
                <table>{props.children}</table>
              </div>
            );
          },
          div: (props: any) => {
            if (props["data-directive-name"]) {
              const directiveName = props["data-directive-name"];
              if (directiveName === "fs-image") {
                return (
                  <Optimize type="fs" props={props}>
                    <FsImageRenderer {...props} node={props} addCustomWindow={addCustomWindow} />
                  </Optimize>
                );
              } else if (directiveName === "disable") {
                return <></>;
              } else if (directiveName === "optimize-section") {
                return optimize ? (
                  <RenderIfVisible key={`riw-section-${props.key || Date.now()}`}>
                    <section>{props.children}</section>
                  </RenderIfVisible>
                ) : (
                  <section>{props.children}</section>
                );
              } else if (directiveName === "center") {
                return (
                  <Optimize type="center" props={props}>
                    <div key={props.key} {...props} className="text-center flex flex-col justify-center items-center">
                      {props.children}
                    </div>
                  </Optimize>
                );
              } else if (directiveName === "margin") {
                return (
                  <Optimize type="directive" props={props}>
                    <MarginRenderer {...props} node={props} />
                  </Optimize>
                );
              }
            }
            return (
              <Optimize type="div" props={props}>
                <div key={props.key} {...props}>
                  {props.children}
                </div>
              </Optimize>
            );
          },
          span: (props: any) => {
            if (props["data-directive-name"]) {
              const directiveName = props["data-directive-name"];
              if (directiveName === "glossary") {
                return (
                  <Optimize type="glossary" props={props} isInline>
                    <GlossaryTermRenderer {...props} node={props} addCustomWindow={addCustomWindow} />
                  </Optimize>
                );
              } else if (directiveName === "heading") {
                return <span className="markdown-heading">{props.children}</span>;
              }
            }
            return (
              <span key={props.key} {...props}>
                {props.children}
              </span>
            );
          },
        };
      },
    [optimizeUI]
  );

  const handlePrint = useCallback(() => {
    if (printIframeRef.current) {
      const iframe = printIframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        console.error("Could not access iframe document for printing.");
        return;
      }

      iframeDoc.open();
      iframeDoc.write("");
      iframeDoc.close();

      const printRoot = iframeDoc.createElement("div");
      iframeDoc.body.appendChild(printRoot);

      const root = ReactDOM.createRoot(printRoot);

      root.render(
        <div className="markdown printing scrollable text-black">
          <InnerRehypeRenderer nodes={nodes} components={components(false)} optimizeUI={false} renderId={renderId} />
        </div>
      );
      const head = iframeDoc.getElementsByTagName("head")[0] || iframeDoc.createElement("head");

      const mainDocumentStyleTags = Array.from(document.querySelectorAll("style")) as HTMLStyleElement[];
      mainDocumentStyleTags.forEach((styleTag) => {
        const newStyle = iframeDoc.createElement("style");
        newStyle.textContent = styleTag.textContent;
        head.appendChild(newStyle);
      });

      const images = iframeDoc.querySelectorAll("img");
      const promises = Array.from(images)
        .filter((img) => !img.complete)
        .map((img) => {
          return new Promise((resolve) => {
            img.onload = img.onerror = resolve;
          });
        });

      Promise.all(promises).then(() => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 500);
      });
    }
  }, [printIframeRef, nodes]);

  return (
    <div className="h-full">
      <div className="markdown scrollable p-2 bg-[#101010]/80 h-full overflow-y-auto select-text">
        <div className="flex justify-end p-2 border-b border-[#333] mb-4">
          <Button
            onClick={handlePrint}
            disabled={loadingPhase !== "idle" || isPending}
            className="text-white border-neutral-500 flex items-center justify-center"
          >
            <Icon icon="material-symbols:print" />
          </Button>
        </div>
        {loadingPhase !== "idle" || isPending ? (
          <div className="flex flex-col justify-center items-center h-full">
            <ClipLoader className="text-white" color="#fff" />
            <span className="ml-2 text-gray-400">{loadingPhase === "fetching" ? "Fetching..." : "Processing..."}</span>
          </div>
        ) : nodes !== null ? (
          <InnerRehypeRenderer
            nodes={nodes}
            components={components(true)}
            renderId={renderId}
            optimizeUI={optimizeUI}
          />
        ) : (
          <p className="text-red-500">No content available. ({loadingPhase})</p>
        )}
      </div>
      <iframe
        ref={printIframeRef}
        style={{ display: "none", position: "absolute", left: "-9999px" }}
        title="Print Document"
      />
    </div>
  );
}
