import { Icon } from "@iconify-icon/react";
import { CustomWindow, useSystemStore } from "../store/useSystemStore";
import DesktopGrid from "./DesktopGrid";
import Header from "./Header";
import Window from "./Window";
import StartMenu from "./StartMenu";
import { useState } from "react";
import SettingsWindow from "./windows/Settings";
import ProjectsWindow from "./windows/Projects";
import TerminalWindow from "./windows/Terminal";
import { shallow } from "zustand/shallow";
import React from "react";
import ManagedWindow from "./utils/ManagedWindow";
import ManagedCustomWindow from "./utils/ManagedCustomWindow";
import GlossaryWindow from "./windows/GlossaryWindow";
import { handleOpen } from "./windows/FileManager";
import Postixfy from "./windows/apps/Postixfy/Postixfy";

const MemoizedHeader = React.memo(Header);
const MemoizedStartMenu = React.memo(StartMenu);

export default function Desktop() {
  const background = useSystemStore((state) => state.background);
  const openWindow = useSystemStore((state) => state.openWindow);

  const addCustomWindow = useSystemStore((state) => state.addCustomWindow);
  const customWindows = useSystemStore<CustomWindow[]>(
    (state) => state.customWindows,
    //@ts-expect-error
    shallow,
  );

  const [startMenuOpen, setStartMenuOpen] = useState(false);

  return (
    <div
      className="w-full h-full"
      style={{
        background,
      }}
    >
      <MemoizedHeader onMenuOpen={() => setStartMenuOpen(!startMenuOpen)} />
      <DesktopGrid
        items={[
          {
            id: "1",
            icon: <Icon icon="ic:round-settings" width="32" height="32" />,
            label: "Settings",
            defaultPosition: { x: 0, y: 0 },
            handleClick: () => openWindow("settings"),
          },
          {
            id: "2",
            icon: <Icon icon="wpf:books" width="32" height="32" />,
            label: "Files",
            defaultPosition: { x: 0, y: 80 },
            handleClick: () =>
              handleOpen({
                file: {
                  name: "file_manager",
                  type: "exec",
                  data: {},
                },
                addCustomWindow,
                currentRelativePathSegments: [],
                fullPath: "/",
              }),
          },
          {
            id: "3",
            icon: <Icon icon="material-symbols-light:terminal" width="40" height="40" />,
            label: "Terminal",
            defaultPosition: { x: 0, y: 160 },
            handleClick: () => openWindow("terminal"),
          },
          {
            id: "4",
            icon: <Icon icon="material-symbols:book-2" width="32" height="32" />,
            label: "Glossary",
            defaultPosition: { x: 80, y: 0 },
            handleClick: () =>
              handleOpen({
                file: {
                  name: "glossary",
                  type: "exec",
                  data: {
                    term: "",
                  },
                },
                addCustomWindow,
                currentRelativePathSegments: [],
              }),
          },
          {
            id: "5",
            icon: <Icon icon="mdi:wireless" width="32" height="32" />,
            label: "3gpp nav",
            defaultPosition: { x: 80, y: 80 },
            handleClick: () =>
              handleOpen({
                file: {
                  name: "3gpp_navigator",
                  type: "exec",
                  data: {},
                },
                addCustomWindow,
                currentRelativePathSegments: [],
              }),
          },
          {
            id: "6",
            icon: <Icon icon="gg:browse" width="32" height="32" />,
            label: "Projects",
            defaultPosition: { x: 80, y: 165 },
            handleClick: () =>
              handleOpen({
                file: {
                  name: "projects",
                  type: "exec",
                  data: {},
                },
                addCustomWindow,
                currentRelativePathSegments: [],
              }),
          },
          {
            id: "7",
            icon: <Icon icon="simple-icons:spotify" width="32" height="32" />,
            label: "postixfy",
            defaultPosition: { x: 160, y: 0 },
            handleClick: () => {
              const id = `postixfy-${Date.now()}`;
              addCustomWindow({
                id,
                name: "Postixfy",
                window: <Postixfy winId={id} />,
              });
            },
          },
        ]}
      />

      <ManagedWindow
        id="settings"
        content={<SettingsWindow />}
        label="Settings"
        defaultPosition={{ x: window.innerWidth > 750 ? 100 : 4, y: window.innerWidth > 650 ? 100 : 30 }}
      />

      <ManagedWindow
        id="terminal"
        content={<TerminalWindow />}
        label="Terminal"
        defaultPosition={{ x: window.innerWidth > 750 ? 220 : 4, y: window.innerWidth > 650 ? 220 : 30 }}
      />

      {customWindows.map((cw) => (
        <ManagedCustomWindow customWindow={cw} key={cw.id} />
      ))}

      <MemoizedStartMenu
        open={startMenuOpen}
        items={{
          Main: [
            {
              icon: <Icon icon="material-symbols-light:terminal" width="28" height="28" />,
              label: "Terminal",
            },
            {
              icon: <Icon icon="wpf:books" width="28" height="28" />,
              label: "Projects",
            },
          ],
        }}
      />
    </div>
  );
}
