import { useState, useMemo, useEffect, useCallback } from "react";
import { Icon } from "@iconify-icon/react";
import { SystemStore } from "../../store/useSystemStore";
import TextReader from "./TextReader/TextReader";
import MediaViewer from "./MediaViewer";
import PDFReader from "./PDFReader";
import clsx from "clsx";
import { readDirectory } from "../../utils";

interface FileItem {
  name: string;
  type: "file" | "folder";
}

interface DirectoryOptions {
  groupName?: string;
  relatedGroups?: string[];
}

export function handleOpen({
  file,
  currentRelativePathSegments,
  addCustomWindow,
}: {
  file: FileItem;
  currentRelativePathSegments: string[];
  addCustomWindow: SystemStore["addCustomWindow"];
}) {
  console.log(file, currentRelativePathSegments, addCustomWindow);

  const fullApiPath = `/${currentRelativePathSegments.join("/")}/${file.name}`;

  if (file.name.endsWith(".md") || file.name.endsWith(".txt")) {
    return addCustomWindow({
      id: file.name,
      name: `Reader - ${file.name}`,
      window: <TextReader path={fullApiPath} />,
    });
  }

  if (
    file.name.endsWith(".png") ||
    file.name.endsWith(".jpg") ||
    file.name.endsWith(".jpeg")
  ) {
    return addCustomWindow({
      id: file.name,
      name: `Media - ${file.name}`,
      window: <MediaViewer path={fullApiPath} />,
    });
  }

  if (file.name.endsWith(".pdf")) {
    return addCustomWindow({
      id: file.name,
      name: `PDFReader - ${file.name}`,
      window: <PDFReader path={fullApiPath} />,
    });
  }
  console.warn(`No viewer configured for file type: ${file.name}`);
  alert(`Cannot open file: ${file.name}. No viewer configured for this type.`);
}

type FileManagerProps = {
  startPath?: string;
  onFileOpen?: (currentRelativePathSegments: string[], file: FileItem) => void;
};

export default function FileManager({
  startPath = "",
  onFileOpen,
}: FileManagerProps) {
  const [currentPathSegments, setCurrentPathSegments] = useState<string[]>(
    startPath.split("/").filter((p) => p)
  );
  const [currentDirContents, setCurrentDirContents] = useState<FileItem[]>([]);
  const [currentDirOptions, setCurrentDirOptions] = useState<
    DirectoryOptions | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<FileItem[]>([]);

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
    [currentPathSegments]
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
    if (event.metaKey || event.ctrlKey) {
      setSelectedItems((prevSelected) =>
        prevSelected.includes(item)
          ? prevSelected.filter((i) => i !== item)
          : [...prevSelected, item]
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
          setSelectedItems(
            Array.from(new Set([...selectedItems, ...newSelection]))
          );
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
    if (item.type === "folder") {
      navigateTo(item);
    } else if (item.type === "file" && onFileOpen) {
      onFileOpen(currentPathSegments, item);
    }
  };

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

      <div className="grid grid-cols-5 gap-4 overflow-y-auto flex-1 pr-2">
        {currentDirContents.length === 0 && !loading && !error ? (
          <div className="col-span-5 text-gray-500 text-center py-4">
            This folder is empty.
          </div>
        ) : (
          currentDirContents.map((item) => (
            <div
              key={item.name}
              onClick={(e) => handleItemClick(e, item)}
              onDoubleClick={() => handleDoubleClick(item)}
              className={clsx(
                `h-fit flex flex-col items-center text-center p-3 rounded-lg transition-all select-none`,
                loading || error
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-gray-700/50",
                selectedItems.includes(item) ? "bg-blue-600/70" : ""
              )}
            >
              {item.type === "folder" ? (
                <Icon icon="material-symbols:folder" width="48" height="48" />
              ) : (
                <Icon icon="mdi-light:file" width="48" height="48" />
              )}
              <span className="text-xs mt-2 truncate w-full px-1">
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
              {currentDirOptions.relatedGroups &&
                currentDirOptions.relatedGroups.length > 0 && (
                  <div>
                    Related:{" "}
                    {currentDirOptions.relatedGroups.slice(0, 3).join(", ")}
                  </div>
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
    </div>
  );
}
