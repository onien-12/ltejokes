import { FileItem } from "../../../store/useFilesystemStore";
import {
  findFileByPath,
  findFolderByPath,
  readFile,
  resolvePath,
} from "../../../utils";
import { CommandHandler } from "./types";

export const pwdCommand: CommandHandler = (
  args,
  { currentPath, addOutput }
) => {
  addOutput(`/${currentPath.join("/")}`);
};

export const cdCommand: CommandHandler = (
  args,
  { currentPath, filesystem, addOutput, setPath }
) => {
  if (args.length < 2) {
    addOutput("cd: missing operand");
    return;
  }
  const targetPath = args[1];

  if (targetPath === "..") {
    if (currentPath.length > 0) {
      setPath((prevPath) => prevPath.slice(0, -1));
    } else {
      addOutput("cd: already at root");
    }
  } else if (targetPath === ".") {
  } else if (targetPath.startsWith("/")) {
    const newSegments = targetPath.split("/").filter(Boolean);
    const targetContents = findFolderByPath(filesystem, newSegments);
    if (targetContents) {
      setPath(newSegments);
    } else {
      addOutput(`cd: no such directory: ${targetPath}`);
    }
  } else {
    const newSegments = [...currentPath, targetPath];
    const targetContents = findFolderByPath(filesystem, newSegments);
    if (targetContents) {
      setPath(newSegments);
    } else {
      addOutput(`cd: no such directory: ${targetPath}`);
    }
  }
};

export const lsCommand: CommandHandler = (
  args,
  { currentPath, filesystem, addOutput }
) => {
  let targetDirItems: FileItem[] | null = null;
  let targetPathDisplay = "";

  if (args.length < 2) {
    targetDirItems = findFolderByPath(filesystem, currentPath);
    targetPathDisplay = "";
  } else {
    const targetPathString = args[1];
    const resolvedSegments = resolvePath(currentPath, targetPathString);
    targetDirItems = findFolderByPath(filesystem, resolvedSegments);
    targetPathDisplay = ` ${targetPathString}`;
  }

  if (!targetDirItems) {
    addOutput(`ls: cannot access '${args[1]}': No such file or directory`);
    return;
  }

  if (targetDirItems.length === 0) {
    addOutput(` (empty directory)${targetPathDisplay} `);
  } else {
    const listOutput = targetDirItems
      .map((item) => {
        if (item.type === "folder") {
          return `<span style="color:#8be9fd;">${item.name}/</span>`;
        }
        return item.name;
      })
      .join("   ");
    addOutput(<span dangerouslySetInnerHTML={{ __html: listOutput }} />);
  }
};

export const catCommand: CommandHandler = async (
  args,
  { currentPath, filesystem, addOutput }
) => {
  if (args.length < 2) {
    addOutput("cat: missing operand");
    return;
  }
  const targetPathString = args[1];

  const resolvedPathSegments = resolvePath(currentPath, targetPathString);
  const file = findFileByPath(filesystem, resolvedPathSegments);
  const path = `/${resolvedPathSegments.join("/")}`;

  if (file) {
    const content = await readFile(path);
    const enc = new TextDecoder();
    addOutput(enc.decode(content));
  } else {
    addOutput(`cat: ${targetPathString}: No such file or directory`);
  }
};
