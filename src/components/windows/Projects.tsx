import { useSystemStore } from "../../store/useSystemStore";
import FileManager, { handleOpen } from "./FileManager";

export default function ProjectsWindow() {
  const { addCustomWindow } = useSystemStore();

  return (
    <div className="h-full">
      <FileManager
        startPath={"/"}
        onFileOpen={(path, file) =>
          handleOpen({
            file,
            currentRelativePathSegments: path,
            addCustomWindow,
          })
        }
      />
    </div>
  );
}
