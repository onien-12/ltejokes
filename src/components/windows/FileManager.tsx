import { useState, useMemo, useEffect, useCallback } from "react";
import { Icon } from "@iconify-icon/react";
import { SystemStore } from "../../store/useSystemStore";
import TextReader from "./TextReader/TextReader";
import MediaViewer from "./MediaViewer";
import PDFReader from "./PDFReader";
import clsx from "clsx";
import { API, readDirectory } from "../../utils";
import GlossaryWindow from "./GlossaryWindow";
import HTMLViewer from "./HTMLViewer";
import Navigator3GPP from "./utilities/Navigator3GPP";
import ContextMenu, { ContextMenuItem } from "../utils/ContextMenu";
import ProjectsWindow from "./Projects";
import CodeViewer from "./CodeViewer";
import Vpn from "./apps/Vpn/Vpn";

interface FileItem {
  name: string;
  type: "file" | "folder" | "exec";
  data?: any;
}

interface DirectoryOptions {
  groupName?: string;
  hidden?: string[];
  relatedGroups?: string[];
}

export function handleOpen({
  file,
  currentRelativePathSegments,
  addCustomWindow,
  fullPath,
}: {
  file: FileItem;
  addCustomWindow: SystemStore["addCustomWindow"];
  currentRelativePathSegments?: string[];
  fullPath?: string;
}) {
  console.log(file, currentRelativePathSegments, addCustomWindow);

  const fullApiPath = fullPath ?? `/${currentRelativePathSegments!.join("/")}/${file.name}`;

  if (file && file.type === "exec") {
    if (file.name === "glossary") {
      const term = file.data.term;
      return addCustomWindow({
        id: `glossary-${term || "main"}`,
        name: `Glossary${term ? `: ${term}` : ""}`,
        window: (
          <GlossaryWindow
            initialTerm={term}
            currentContextGroup={file.data.group}
            initialTab={file.data.tab || "glossary"}
          />
        ),
      });
    }
    if (file.name === "3gpp_navigator") {
      return addCustomWindow({
        id: `3gpp-navigator`,
        name: `3gpp navigator`,
        window: <Navigator3GPP />,
      });
    }
    if (file.name === "vpn" || file.name === "configs") {
      const subscription = file.data?.subscription;
      const userToken = file.data?.user;
      const winId = `vpn-${subscription || userToken || "main"}`;
      return addCustomWindow({
        id: winId,
        // A token may turn out to be a subscription or a login link; the window
        // renames itself once the server has said which.
        name: subscription ? "VPN" : userToken ? "VPN - my configs" : "VPN",
        window: <Vpn subscription={subscription} userToken={userToken} winId={winId} />,
        className: window.innerWidth > 650 ? "w-[720px] h-[540px]" : "w-[98%] h-[95dvh]",
      });
    }
    if (file.name === "projects") {
      return addCustomWindow({
        id: `projects`,
        name: `Projects`,
        window: <ProjectsWindow />,
      });
    }
    if (file.name === "file_manager") {
      return addCustomWindow({
        id: `file_manager - ${Date.now()}`,
        name: "Files",
        window: (
          <FileManager
            startPath={fullApiPath}
            onFileOpen={(path, file) =>
              handleOpen({
                file,
                currentRelativePathSegments: path,
                addCustomWindow,
              })
            }
          />
        ),
      });
    }
  }

  if (file.name.endsWith(".md") || file.name.endsWith(".txt")) {
    return addCustomWindow({
      id: file.name,
      name: `Reader - ${file.name}`,
      window: <TextReader path={fullApiPath} />,
    });
  } else if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
    return addCustomWindow({
      id: file.name,
      name: `HTML Viewer - ${file.name}`,
      window: <HTMLViewer path={fullApiPath} />,
    });
  } else if (file.name.endsWith(".png") || file.name.endsWith(".jpg") || file.name.endsWith(".jpeg")) {
    return addCustomWindow({
      id: file.name,
      name: `Media - ${file.name}`,
      window: <MediaViewer path={fullApiPath} />,
    });
  } else if (file.name.endsWith(".pdf")) {
    return addCustomWindow({
      id: file.name,
      name: `PDFReader - ${file.name}`,
      window: <PDFReader path={fullApiPath} />,
    });
  } else {
    return addCustomWindow({
      id: file.name,
      name: `Code - ${file.name}`,
      window: <CodeViewer path={fullApiPath} />,
    });
  }

  console.warn(`No viewer configured for file type: ${file.name}`);
}

type FileManagerProps = {
  startPath?: string;
  onFileOpen?: (currentRelativePathSegments: string[], file: FileItem) => void;
};

export default function FileManager({ startPath = "", onFileOpen }: FileManagerProps) {
  const [currentPathSegments, setCurrentPathSegments] = useState<string[]>(startPath.split("/").filter((p) => p));
  const [currentDirContents, setCurrentDirContents] = useState<FileItem[]>([]);
  const [currentDirOptions, setCurrentDirOptions] = useState<DirectoryOptions | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<FileItem[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    item: FileItem | null;
  }>({ isOpen: false, x: 0, y: 0, item: null });

  const updateCurrentDirectory = useCallback(
    async (newPathSegments: string[]) => {
      setLoading(true);
      setError(null);
      setSelectedItems([]);

      try {
        const fullRelativeApiPath = `/${newPathSegments.join("/")}`;
        const data = await readDirectory(fullRelativeApiPath);
        setCurrentDirContents(data.contents);
        setCurrentDirOptions(data.options);
        setCurrentPathSegments(newPathSegments);
      } catch (err: any) {
        setError(`Failed to load directory: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [currentPathSegments],
  );

  useEffect(() => {
    updateCurrentDirectory(startPath.split("/").filter((p) => p));
  }, [startPath]);

  const navigateTo = (folder: FileItem) => {
    if (folder.type === "folder") {
      updateCurrentDirectory([...currentPathSegments, folder.name]);
    }
  };

  const navigateUp = () => {
    if (currentPathSegments.length > 0) {
      const newPathSegments = currentPathSegments.slice(0, -1);
      updateCurrentDirectory(newPathSegments);
    }
  };

  const currentPathDisplay = useMemo(() => {
    if (currentPathSegments.length === 0) return "/";
    return ["", ...currentPathSegments].join(" / ");
  }, [currentPathSegments]);

  const handleItemClick = (event: React.MouseEvent, item: FileItem) => {
    setContextMenu({ isOpen: false, x: 0, y: 0, item: null });
    if (event.metaKey || event.ctrlKey) {
      setSelectedItems((prevSelected) =>
        prevSelected.includes(item) ? prevSelected.filter((i) => i !== item) : [...prevSelected, item],
      );
    } else if (event.shiftKey) {
      if (selectedItems.length > 0) {
        const lastSelectedItem = selectedItems[selectedItems.length - 1];
        const lastIndex = currentDirContents.indexOf(lastSelectedItem);
        const currentIndex = currentDirContents.indexOf(item);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const newSelection = currentDirContents.slice(start, end + 1);
          setSelectedItems(Array.from(new Set([...selectedItems, ...newSelection])));
        } else {
          setSelectedItems([item]);
        }
      } else {
        setSelectedItems([item]);
      }
    } else {
      setSelectedItems(selectedItems.includes(item) ? [] : [item]);
    }
  };

  const handleDoubleClick = (item: FileItem) => {
    setContextMenu({ isOpen: false, x: 0, y: 0, item: null });
    if (item.type === "folder") {
      navigateTo(item);
    } else if (item.type === "file" && onFileOpen) {
      onFileOpen(currentPathSegments, item);
    }
  };

  const handleContextMenu = useCallback((event: React.MouseEvent, item: FileItem) => {
    event.preventDefault();
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      item: item,
    });
    setSelectedItems([item]);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ isOpen: false, x: 0, y: 0, item: null });
  }, []);

  const handleDownloadClick = useCallback(() => {
    if (!contextMenu.item || contextMenu.item.type === "folder") return;

    const fullFilePath = `/${currentPathSegments.join("/")}/${contextMenu.item.name}`;
    const downloadUrl = `${API}/api/filesystem/file?path=${encodeURIComponent(fullFilePath)}&download=true`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = contextMenu.item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    handleCloseContextMenu();
  }, [contextMenu.item, currentPathSegments, handleCloseContextMenu]);

  return (
    <div className="bg-[#1e1e1e]/80 p-6 w-full h-full flex flex-col text-white font-sans">
      <div className="flex items-center text-sm text-gray-400 mb-4">
        <button
          onClick={navigateUp}
          disabled={currentPathSegments.length === 0 || loading}
          className="text-gray-300 hover:text-white disabled:opacity-30 p-1 rounded-md transition-colors flex items-center"
        >
          <Icon icon="material-symbols:chevron-left" width="20" height="20" />
          <span className="ml-1">Back</span>
        </button>
        <span className="ml-4 text-xs font-code px-3 py-1 bg-gray-700 rounded-full truncate max-w-[calc(100%-100px)]">
          {currentPathDisplay}
          {loading && <span className="ml-2 text-gray-500">Loading...</span>}
        </span>
      </div>

      {error && <div className="text-red-500 text-sm mb-4">Error: {error}</div>}

      <div className="flex flex-row gap-2 flex-wrap content-start overflow-y-auto flex-1 pr-2">
        {currentDirContents.length === 0 && !loading && !error ? (
          <div className="col-span-5 text-gray-500 text-center py-4">This folder is empty.</div>
        ) : (
          currentDirContents
            .filter((item) => (currentDirOptions?.hidden ? !currentDirOptions.hidden.includes(item.name) : true))
            .map((item) => (
              <div
                key={item.name}
                onClick={(e) => handleItemClick(e, item)}
                onDoubleClick={() => handleDoubleClick(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                className={clsx(
                  `h-fit w-24 flex flex-col items-center text-center p-3 rounded-lg transition-all select-none`,
                  loading || error ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-gray-700/50",
                  selectedItems.includes(item) ? "bg-blue-600/70" : "",
                )}
              >
                {item.type === "folder" ? (
                  <Icon icon="material-symbols:folder" width="48" height="48" />
                ) : (
                  <>
                    {
                      //prettier-ignore
                      item.name.endsWith(".pdf") ? <Icon icon="proicons:pdf-2" width="48" height="48" /> :
                    item.name.endsWith(".md") ? <Icon icon="proicons:file-text" width="48" height="48" /> :
                    item.name.endsWith(".json") ? <Icon icon="si:json-duotone" width="48" height="48" /> :
                    item.name.endsWith(".png") || item.name.endsWith(".jpg") ? <Icon icon="humbleicons:image" width="48" height="48" /> :
                    item.name.endsWith(".csv") ? <Icon icon="gala:file-csv" width="44" height="48" /> :
                    item.name.endsWith(".py") ? <Icon icon="fluent:document-py-16-regular" width="48" height="48" /> :
                        <Icon icon="mdi-light:file" width="48" height="48" />
                    }
                  </>
                )}
                <span
                  className={clsx("text-xs mt-2 w-full px-1", {
                    "text-wrap break-words":
                      window.innerWidth <= 650 || selectedItems.includes(item) || item.name.length < 20,
                    truncate: window.innerWidth > 650,
                  })}
                >
                  {item.name}
                </span>
              </div>
            ))
        )}
      </div>

      <div className="mt-4 p-4 border-t border-gray-700 text-sm text-gray-500 flex justify-between items-center">
        <div className="flex flex-row gap-8 items-center justify-center">
          <span>{currentDirContents.length} items</span>
          {currentDirOptions && (
            <div className="flex flex-row gap-2 text-xs text-gray-500">
              {currentDirOptions.groupName && (
                <div>
                  Group: <b>{currentDirOptions.groupName}</b>
                </div>
              )}
              {currentDirOptions.relatedGroups && currentDirOptions.relatedGroups.length > 0 && (
                <div>Related: {currentDirOptions.relatedGroups.slice(0, 3).join(", ")}</div>
              )}
            </div>
          )}
        </div>
        {selectedItems.length > 0 && (
          <span className="text-gray-400">
            {selectedItems.length} item
            {selectedItems.length > 1 ? "s" : ""} selected
          </span>
        )}
      </div>

      <ContextMenu isOpen={contextMenu.isOpen} onClose={handleCloseContextMenu} x={contextMenu.x} y={contextMenu.y}>
        <ContextMenuItem onClick={handleDownloadClick} disabled={contextMenu.item?.type === "folder"}>
          <Icon icon="material-symbols-light:download-rounded" width="24" height="24" />
          Download
        </ContextMenuItem>
        <ContextMenuItem onClick={() => null}>
          <Icon icon="circum:view-table" width="24" height="24" />
          Properties
        </ContextMenuItem>
      </ContextMenu>
    </div>
  );
}
