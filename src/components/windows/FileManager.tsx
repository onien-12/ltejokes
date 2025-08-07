import { useState, useMemo, useEffect } from "react";
import { Icon } from "@iconify-icon/react";
import { FileItem } from "../../store/useFilesystemStore";
import { findFolderByPath } from "../../utils";
import { SystemStore } from "../../store/useSystemStore";
import TextReader from "./TextReader/TextReader";
import MediaViewer from "./MediaViewer";
import PDFReader from "./PDFReader";

type FileManagerProps = {
  fileSystem: FileItem[];
  onFileOpen?: (path: string[], file: FileItem) => void;
};

export function handleOpen({
  file,
  path,
  addCustomWindow,
}: {
  file: FileItem;
  path: string;
  addCustomWindow: SystemStore["addCustomWindow"];
}) {
  if (file.name.endsWith(".md") || file.name.endsWith(".txt")) {
    return addCustomWindow({
      id: file.name,
      name: `Reader - ${file.name}`,
      window: <TextReader path={path + "/" + file.name} />,
    });
  }

  if (file.name.endsWith(".png")) {
    return addCustomWindow({
      id: file.name,
      name: `Media - ${file.name}`,
      window: <MediaViewer path={path + "/" + file.name} />,
    });
  }

  if (file.name.endsWith(".pdf")) {
    return addCustomWindow({
      id: file.name,
      name: `PDFReader - ${file.name}`,
      window: <PDFReader path={path + "/" + file.name} />,
    });
  }
}

export default function FileManager({
  fileSystem,
  onFileOpen,
}: FileManagerProps) {
  const [path, setPath] = useState<string[]>([]);
  const [currentDir, setCurrentDir] = useState<FileItem[]>(fileSystem);
  const [selectedItems, setSelectedItems] = useState<FileItem[]>([]);

  useEffect(() => {
    const newCurrentDir = findFolderByPath(fileSystem, path);

    if (newCurrentDir) {
      setCurrentDir(newCurrentDir);
    } else {
      setPath([]);
      setCurrentDir(fileSystem);
    }
    setSelectedItems([]);
  }, [fileSystem, path]);

  const navigateTo = (folder: FileItem) => {
    if (folder.type === "folder" && folder.contents) {
      setPath([...path, folder.name]);
      setCurrentDir(folder.contents);
      setSelectedItems([]);
    }
  };

  const navigateUp = () => {
    const newPath = path.slice(0, -1);
    const newCurrentDir = findFolderByPath(fileSystem, newPath);

    if (newCurrentDir) {
      setPath(newPath);
      setCurrentDir(newCurrentDir);
    } else {
      setPath([]);
      setCurrentDir(fileSystem);
    }
    setSelectedItems([]);
  };

  const currentPathDisplay = useMemo(() => {
    if (path.length === 0) return "/";
    return ["", ...path].join(" / ");
  }, [path]);

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
        const lastIndex = currentDir.indexOf(lastSelectedItem);
        const currentIndex = currentDir.indexOf(item);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const newSelection = currentDir.slice(start, end + 1);
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
      onFileOpen(path, item);
    }
  };

  return (
    <div className="bg-[#1e1e1e]/80 p-6 w-full h-full flex flex-col text-white font-sans">
      <div className="flex items-center text-sm text-gray-400 mb-4">
        <button
          onClick={navigateUp}
          disabled={path.length === 0}
          className="text-gray-300 hover:text-white disabled:opacity-30 p-1 rounded-md transition-colors flex items-center"
        >
          <Icon icon="material-symbols:chevron-left" width="20" height="20" />
          <span className="ml-1">Back</span>
        </button>
        <span className="ml-4 text-xs font-code px-3 py-1 bg-gray-700 rounded-full truncate max-w-[calc(100%-100px)]">
          {currentPathDisplay}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-4 overflow-y-auto flex-1 pr-2">
        {currentDir.map((item) => (
          <div
            key={item.name}
            onClick={(e) => handleItemClick(e, item)}
            onDoubleClick={() => handleDoubleClick(item)}
            className={`h-fit flex flex-col items-center text-center p-3 rounded-lg transition-all cursor-pointer select-none
            ${
              selectedItems.includes(item)
                ? "bg-blue-600/70"
                : "hover:bg-gray-700/50"
            }`}
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
        ))}
      </div>

      <div className="mt-4 p-4 border-t border-gray-700 text-sm text-gray-500 flex justify-between items-center">
        <span>{currentDir.length} items</span>
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
