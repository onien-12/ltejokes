import { JSX } from "react";
import { FileItem } from "../../../store/useFilesystemStore";
import { SystemStore } from "../../../store/useSystemStore";

export interface CommandContext {
  filesystem: FileItem[];
  currentPath: string[];
  currentDirItems: FileItem[];
  systemStore: SystemStore;
  addOutput: (output: string | JSX.Element) => void;
  setPath: React.Dispatch<React.SetStateAction<string[]>>;
  getCommandsList: () => { name: string; description: string }[];
}

export type CommandHandler = (
  args: string[],
  context: CommandContext
) => Promise<void> | void;
