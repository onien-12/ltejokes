import { useEffect } from "react";
import { SystemStore } from "./store/useSystemStore";
import { handleOpen } from "./components/windows/FileManager";

/**
 * Hash commands: `#c=open(vpn, <sub_id>)`.
 *
 * Lets a link open a window with arguments without a route or a page load, which
 * is what the desktop metaphor wants — the Telegram bot hands out
 * `site/#c=open(vpn,<sub_id>)` and the config appears in its window.
 *
 * The grammar is deliberately tiny for now:
 *
 *     command := <fn> "(" <window> ("," <param>)* ")"
 *     fn      := "open"
 *
 * Positional arguments are named by the registry below, so a window declares
 * what it takes and a link cannot inject arbitrary keys into its data.
 */

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
  // Strict: a link that passes more than the window declares is malformed, not
  // something to silently truncate.
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
      // The hash stays in the URL so a reload reopens the same window;
      // addCustomWindow dedupes by id, so a repeat cannot stack windows.
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
