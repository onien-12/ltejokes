import { useFilesystemStore } from "../../store/useFilesystemStore";
import { useSystemStore } from "../../store/useSystemStore";
import FileManager, { handleOpen } from "./FileManager";
import TextReader from "./TextReader/TextReader";

export default function ProjectsWindow() {
  const { filesystem } = useFilesystemStore();
  const { addCustomWindow } = useSystemStore();

  return (
    <div className="h-full">
      <FileManager
        fileSystem={filesystem}
        onFileOpen={(path, file) =>
          handleOpen({ file, addCustomWindow, path: path.join("/") })
        }
      />
    </div>
  );
}
