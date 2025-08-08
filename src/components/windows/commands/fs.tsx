import { CommandHandler } from "./types";

export const pwdCommand: CommandHandler = (
  args,
  { currentPath, addOutput }
) => {
  addOutput(`/${currentPath.join("/")}`);
};

export const lsCommand: CommandHandler = async (
  args,
  { currentPath, addOutput, fetchDirectoryContents }
) => {
  let targetPathSegments = [...currentPath];
  let displayPath = "";

  if (args.length > 1) {
    const argPath = args[1];
    if (argPath.startsWith("/")) {
      targetPathSegments = argPath.split("/").filter(Boolean);
      displayPath = ` ${argPath}`;
    } else {
      const parts = argPath.split("/").filter(Boolean);
      for (const part of parts) {
        if (part === "..") {
          if (targetPathSegments.length > 0) targetPathSegments.pop();
        } else if (part !== ".") {
          targetPathSegments.push(part);
        }
      }
      displayPath = ` ${argPath}`;
    }
  }

  const fullApiPath = `/${targetPathSegments.join("/")}`;

  try {
    const data = await fetchDirectoryContents(fullApiPath);
    const contents = data.contents;

    if (contents.length === 0) {
      addOutput(` (empty directory)${displayPath} `);
    } else {
      const listOutput = contents
        //@ts-expect-error
        .map((item) => {
          if (item.type === "folder") {
            return `<span style="color:#8be9fd;">${item.name}/</span>`;
          }
          return item.name;
        })
        .join("   ");
      addOutput(<span dangerouslySetInnerHTML={{ __html: listOutput }} />);
    }
  } catch (error: any) {
    addOutput(`ls: cannot access '${args[1] || "."}': ${error.message}`);
  }
};

export const cdCommand: CommandHandler = async (
  args,
  {
    currentPath,
    setPath,
    addOutput,
    fetchDirectoryContents,
    setCurrentDirItems,
  }
) => {
  if (args.length < 2) {
    addOutput("cd: missing operand");
    return;
  }
  const targetPath = args[1];

  let newPathSegments: string[];

  if (targetPath === "..") {
    newPathSegments = currentPath.slice(0, -1);
  } else if (targetPath === ".") {
    newPathSegments = [...currentPath];
  } else if (targetPath.startsWith("/")) {
    newPathSegments = targetPath.split("/").filter(Boolean);
  } else {
    newPathSegments = [...currentPath, targetPath];
  }

  const fullApiPath = `/${newPathSegments.join("/")}`;

  try {
    const data = await fetchDirectoryContents(fullApiPath);
    setPath(newPathSegments);
    setCurrentDirItems(data.contents);
  } catch (error: any) {
    addOutput(`cd: no such directory: ${targetPath}: ${error.message}`);
  }
};

export const catCommand: CommandHandler = async (
  args,
  { currentPath, addOutput, fetchFileContent, fetchDirectoryContents }
) => {
  if (args.length < 2) {
    addOutput("cat: missing operand");
    return;
  }
  const fileName = args[1];

  let filePathSegments = [...currentPath];
  const parts = fileName.split("/").filter(Boolean);
  for (const part of parts) {
    if (part === "..") {
      if (filePathSegments.length > 0) filePathSegments.pop();
    } else if (part !== ".") {
      filePathSegments.push(part);
    }
  }

  const fullApiPath = `/${filePathSegments.join("/")}`;

  try {
    const dirCheckResponse = await fetchDirectoryContents(
      `/${filePathSegments.slice(0, 1).join("/")}`
    );
    const fileExistsAsFolder = dirCheckResponse.contents.some(
      //@ts-expect-error
      (item) =>
        item.name === filePathSegments[filePathSegments.length - 1] &&
        item.type === "folder"
    );

    if (fileExistsAsFolder) {
      addOutput(`cat: ${fileName}: Is a directory`);
      return;
    }

    const content = await fetchFileContent(fullApiPath);
    const dec = new TextDecoder();
    addOutput(dec.decode(content));
  } catch (error: any) {
    addOutput(`cat: ${fileName}: No such file or directory: ${error.message}`);
  }
};
