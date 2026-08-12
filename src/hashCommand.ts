import { useEffect } from "react";
import { SystemStore } from "./store/useSystemStore";
import { handleOpen } from "./components/windows/FileManager";

const COMMAND_RE = /^([a-z_]+)\(([^()]*)\)$/;

const WINDOW_PARAMS: Record<string, string[]> = {
  vpn: ["subscription"],
};

export type HashCommand = {
  name: string;
  data: Record<string, string>;
};

export function parseHashCommand(hash: string): HashCommand | null {
  const raw = decodeURIComponent(hash.replace(/^#/, "")).trim();
  if (!raw.startsWith("c=")) return null;

  const match = COMMAND_RE.exec(raw.slice(2).trim());
  if (!match) return null;

  const [, fn, argString] = match;
  if (fn !== "open") return null;

  const args = argString
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  const [name, ...params] = args;
  const paramNames = name ? WINDOW_PARAMS[name] : undefined;
  if (!paramNames) return null;
  if (params.length > paramNames.length) return null;

  const data: Record<string, string> = {};
  params.forEach((value, i) => {
    data[paramNames[i]] = value;
  });

  return { name, data };
}

export function useHashCommand(addCustomWindow: SystemStore["addCustomWindow"]) {
  useEffect(() => {
    const run = () => {
      const command = parseHashCommand(window.location.hash);
      if (!command) return;
      handleOpen({
        file: { name: command.name, type: "exec", data: command.data },
        addCustomWindow,
        currentRelativePathSegments: [],
      });
    };

    run();
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, [addCustomWindow]);
}
