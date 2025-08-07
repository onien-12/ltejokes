import { useState, useCallback, useEffect, JSX } from "react";
import Terminal, {
  ColorMode,
  TerminalInput,
  TerminalOutput,
} from "react-terminal-ui";
import { FileItem, useFilesystemStore } from "../../store/useFilesystemStore";
import { findFolderByPath } from "../../utils";
import React from "react";
import { useSystemStore } from "../../store/useSystemStore";
import { pwdCommand, lsCommand, cdCommand, catCommand } from "./commands/fs";
import { CommandHandler } from "./commands/types";
import { unameCommand } from "./commands/system";
import { ipCommand } from "./commands/network";

const commandDescriptions: { [key: string]: string } = {
  pwd: "Print working directory",
  ls: "List directory contents",
  cd: "Change directory",
  cat: "Display file content",
  clear: "Clear the terminal screen",
  uname: "Shows information about system",
  ip: "Show network device information",
  help: "Show this help message",
};

const helpCommand: CommandHandler = (args, { addOutput, getCommandsList }) => {
  addOutput("Available commands:");
  const commandsList = getCommandsList();
  commandsList.forEach((cmd) => {
    const spaces = 13 - cmd.name.length;
    addOutput(
      `  ${cmd.name}${" ".repeat(Math.max(0, spaces))} - ${cmd.description}`
    );
  });
};

const commands: { [key: string]: CommandHandler } = {
  pwd: pwdCommand,
  ls: lsCommand,
  cd: cdCommand,
  cat: catCommand,
  help: helpCommand,
  uname: unameCommand,
  ip: ipCommand,
};

function useTerminalCommands(initialFileSystem: FileItem[]) {
  const systemStore = useSystemStore();

  const [path, setPath] = useState<string[]>([]);
  const [currentDirItems, setCurrentDirItems] =
    useState<FileItem[]>(initialFileSystem);
  const [lineData, setLineData] = useState<JSX.Element[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setLineData([
      <TerminalOutput key="type-help">
        Type 'help' for a list of commands.
      </TerminalOutput>,
    ]);
  }, []);

  const addOutput = useCallback((output: string | JSX.Element) => {
    setLineData((prev) => {
      const newKey = `output-${prev.length}-${Date.now()}`;
      return [
        ...prev,
        typeof output === "string" ? (
          <TerminalOutput key={newKey}>{output}</TerminalOutput>
        ) : (
          React.cloneElement(output, { key: newKey })
        ),
      ];
    });
  }, []);

  const findDirectoryContentsMemo = useCallback(
    (segments: string[]): FileItem[] | null => {
      return findFolderByPath(initialFileSystem, segments);
    },
    [initialFileSystem]
  );

  useEffect(() => {
    const newContents = findDirectoryContentsMemo(path);
    if (newContents) {
      setCurrentDirItems(newContents);
    } else {
      setPath([]);
      setCurrentDirItems(initialFileSystem);
      addOutput("Path invalid. Resetting to root.");
    }
  }, [path, initialFileSystem, findDirectoryContentsMemo, addOutput]);

  const getCommandsList = useCallback(() => {
    const list = Object.keys(commands).map((cmdName) => ({
      name: cmdName,
      description: commandDescriptions[cmdName] || "No description provided",
    }));

    if (!list.find((cmd) => cmd.name === "clear")) {
      list.push({
        name: "clear",
        description:
          commandDescriptions["clear"] || "Clear the terminal screen",
      });
    }

    list.sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, []);

  const onInput = useCallback(
    async (input: string) => {
      const trimmedInput = input.trim();
      addOutput(<TerminalInput>{trimmedInput}</TerminalInput>);

      if (!trimmedInput) {
        return;
      }

      const args = trimmedInput.split(" ").filter(Boolean);
      const commandName = args[0].toLowerCase();

      if (commandName === "clear") {
        setLineData([]);
        return;
      }

      const commandHandler = commands[commandName];
      if (commandHandler) {
        const result = commandHandler(args, {
          currentDirItems,
          addOutput,
          setPath,
          getCommandsList,
          systemStore,
          filesystem: initialFileSystem,
          currentPath: path,
        });

        if (result instanceof Promise) {
          setIsLoading(true);
          try {
            await result;
          } catch (e) {
            console.error(e);
          } finally {
            setIsLoading(false);
          }
        }
      } else {
        addOutput(`Unknown command: ${commandName}`);
      }
    },
    [
      addOutput,
      path,
      currentDirItems,
      initialFileSystem,
      getCommandsList,
      systemStore,
    ]
  );

  return { path, lineData, onInput, isLoading };
}

export default function TerminalWindow() {
  const { filesystem } = useFilesystemStore();
  const { path, lineData, onInput, isLoading } =
    useTerminalCommands(filesystem);

  return (
    <div className="h-full text-start">
      <Terminal
        colorMode={ColorMode.Dark}
        onInput={isLoading ? () => {} : onInput}
        prompt={isLoading ? "_" : `/${path.join("/")} $`}
        TopButtonsPanel={() => null}
        height="100%"
      >
        {lineData}
      </Terminal>
    </div>
  );
}
