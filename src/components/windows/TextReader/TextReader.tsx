import React, {
  useEffect,
  useState,
  useDeferredValue,
  useTransition,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { API, readFile } from "../../../utils";
import { ClipLoader } from "react-spinners";

import "highlight.js/styles/atom-one-dark.css";
import "katex/dist/katex.min.css";

import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeReact from "rehype-react";
import { unified } from "unified";
import type { Options as RehypeReactOptions } from "rehype-react";

import { jsx, jsxs } from "react/jsx-runtime";
import RenderIfVisible from "../../utils/RenderIfVisible";
import { useUIOptionsStore } from "../../../store/useUIOptionsStore";

import clsx from "clsx";
import { handleOpen } from "../FileManager";
import { useSystemStore } from "../../../store/useSystemStore";
import rehypeRaw from "rehype-raw";

const markdownWorker = new Worker(
  new URL("./renderer.worker.ts", import.meta.url)
);

const GlossaryTermRenderer: React.FC<any> = ({ node, children, ...props }) => {
  const glossaryTerm =
    node.value ||
    (children && Array.isArray(children)
      ? children
          .map((c) =>
            typeof c === "string" ? c : c.props?.value || c.props?.children
          )
          .join("")
      : String(children || ""));

  const handleClick = useCallback(() => {}, [glossaryTerm]);

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

const FsImageRenderer: React.FC<any> = ({
  node,
  children,
  addCustomWindow,
  ...props
}) => {
  const path = node["data-path"];
  const alt = node["data-alt"];
  const name = node["data-name"];
  const width = node["data-width"] || undefined;
  const height = node["data-height"] || undefined;

  const maxWidth = node["data-max-width"] || undefined;
  const maxHeight = node["data-max-height"] || undefined;
  const color = node["data-color"] || "white";

  const imageUrl = path
    ? `${API}/api/filesystem/file?path=${encodeURIComponent(path)}`
    : "";

  if (!imageUrl) {
    return (
      <span className="text-red-500">
        Error: Image path not specified for fs-image.
      </span>
    );
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
        className="max-w-full h-auto rounded-md shadow-md"
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

const CustomDirectiveRenderer: React.FC<any> = ({
  node,
  children,
  ...props
}) => {
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

  const containerClassName = clsx(
    variant != "invisible" ? baseClasses : "",
    variantClasses[variant],
    props.className
  );

  const customStyles: React.CSSProperties = {};
  if (!isNaN(marginLeft)) customStyles.marginLeft = `${marginLeft}px`;
  if (!isNaN(marginTop)) customStyles.marginTop = `${marginTop}px`;
  if (!isNaN(marginBottom)) customStyles.marginBottom = `${marginBottom}px`;

  return (
    <div
      className={containerClassName}
      style={customStyles}
      data-variant={variant}
    >
      {title && <h4 className="text-lg font-bold mb-2">{title}</h4>}
      {children}
    </div>
  );
};

interface InnerRehypeRendererProps {
  hastTree: any;
  components: RehypeReactOptions["components"];
  mathEnabled: boolean;
}

const InnerRehypeRenderer: React.FC<InnerRehypeRendererProps> = ({
  hastTree,
  components,
  mathEnabled,
}) => {
  const renderProcessor = useMemo(() => {
    function compiler(tree: any, file: any) {
      const jsxCompiler: any = {};
      rehypeReact.call(jsxCompiler, {
        //@ts-ignore
        createElement: React.createElement,
        Fragment: React.Fragment,
        components: components,
        // @ts-ignore
        jsx,
        // @ts-ignore
        jsxs,
      });

      const reparsedTree = rehypeRaw()(tree, file);

      rehypeHighlight()(reparsedTree, file);
      if (mathEnabled) rehypeKatex({ trust: true })(reparsedTree, file);

      //@ts-ignore
      return jsxCompiler.compiler(reparsedTree, file);
    }

    return unified().use(function () {
      this.compiler = compiler;
    });
  }, [components]);

  const renderedJsx = useMemo(() => {
    if (!hastTree) return null;
    try {
      console.log(hastTree);
      return renderProcessor.stringify(hastTree);
    } catch (error) {
      console.error("Error rendering HAST to JSX:", error);
      return <p className="text-red-500">Error rendering content.</p>;
    }
  }, [hastTree, renderProcessor]);

  return <>{renderedJsx}</>;
};

export default function TextReader({ path }: { path: string }) {
  const { optimizeUI, renderMath } = useUIOptionsStore();
  const addCustomWindow = useSystemStore((store) => store.addCustomWindow);

  const [rawContent, setRawContent] = useState<string | null>(null);
  const [hastTree, setHastTree] = useState<any>(null);
  const [loadingPhase, setLoadingPhase] = useState<
    "idle" | "fetching" | "processing"
  >("idle");

  const [isPending, startTransition] = useTransition();
  const deferredPath = useDeferredValue(path);
  const deferredRenderMath = useDeferredValue(renderMath);

  const currentRequestRef = useRef<number>(Math.floor(Math.random() * 2 ** 20));

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
        setRawContent(
          `<p class="text-red-500">Error reading file: ${
            error.message || "Unknown error"
          }</p>`
        );
        setLoadingPhase("idle");
      });
  }, [deferredPath]);

  useEffect(() => {
    if (rawContent === null) return;

    setLoadingPhase("processing");
    setHastTree(null);

    const requestId = ++currentRequestRef.current;

    const handleWorkerMessage = (
      event: MessageEvent<{ hast?: any; error?: string; requestId: number }>
    ) => {
      console.log(event.data.requestId, requestId);
      if (event.data.requestId !== requestId) {
        return;
      }
      if (event.data.hast !== undefined) {
        startTransition(() => {
          setHastTree(event.data.hast);
          setLoadingPhase("idle");
        });
      } else if (event.data.error) {
        console.error("Worker error:", event.data.error);
        startTransition(() => {
          setHastTree({
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

  const memoizedMainThreadCustomComponents = useMemo(() => {
    const Optimize = ({
      children,
      type,
      props,
    }: {
      children: React.ReactNode;
      type: string;
      props: any;
    }) => {
      return optimizeUI ? (
        <RenderIfVisible key={`riw-${type}-${props.key || Date.now()}`}>
          {children}
        </RenderIfVisible>
      ) : (
        <>{children}</>
      );
    };

    return {
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
      div: (props: any) => {
        if (props["data-directive-name"]) {
          const directiveName = props["data-directive-name"];
          if (directiveName === "fs-image") {
            return (
              <Optimize type="fs" props={props}>
                <FsImageRenderer
                  {...props}
                  node={props}
                  addCustomWindow={addCustomWindow}
                />
              </Optimize>
            );
          } else {
            return (
              <Optimize type="directive" props={props}>
                <CustomDirectiveRenderer {...props} node={props} />
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
              <Optimize type="glossary" props={props}>
                <GlossaryTermRenderer {...props} node={props} />
              </Optimize>
            );
          }
        }
        return (
          <span key={props.key} {...props}>
            {props.children}
          </span>
        );
      },
    };
  }, [optimizeUI]);

  return (
    <div className="markdown p-2 bg-[#101010]/80 h-full overflow-y-auto select-text">
      {loadingPhase !== "idle" || isPending ? (
        <div className="flex flex-col justify-center items-center h-full">
          <ClipLoader className="text-white" color="#fff" />
          <span className="ml-2 text-gray-400">
            {loadingPhase === "fetching" ? "Fetching..." : "Processing..."}
          </span>
        </div>
      ) : hastTree !== null ? (
        <InnerRehypeRenderer
          hastTree={hastTree}
          components={memoizedMainThreadCustomComponents}
          mathEnabled={renderMath}
        />
      ) : (
        <p className="text-red-500">No content available. ({loadingPhase})</p>
      )}
    </div>
  );
}
