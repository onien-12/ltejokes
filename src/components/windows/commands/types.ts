import { JSX } from "react";
import { FileItem } from "../../../store/useFilesystemStore";
import { SystemStore } from "../../../store/useSystemStore";
import { readDirectory, readFile } from "../../../utils";

export interface CommandContext {
  currentPath: string[];
  currentDirItems: FileItem[];
  addOutput: (output: string | JSX.Element) => void;
  setPath: React.Dispatch<React.SetStateAction<string[]>>;
  setCurrentDirItems: React.Dispatch<React.SetStateAction<FileItem[]>>;
  getCommandsList: () => { name: string; description: string }[];
  systemStore: SystemStore;
  fetchDirectoryContents: typeof readDirectory;
  fetchFileContent: typeof readFile;
}

export type CommandHandler = (
  args: string[],
  context: CommandContext
) => Promise<void> | void;
