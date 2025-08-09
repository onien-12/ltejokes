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

const MemoizedHeader = React.memo(Header);
const MemoizedStartMenu = React.memo(StartMenu);

export default function Desktop() {
  const background = useSystemStore((state) => state.background);
  const openWindow = useSystemStore((state) => state.openWindow);
  const customWindows = useSystemStore<CustomWindow[]>(
    (state) => state.customWindows,
    //@ts-expect-error
    shallow
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
            handleClick: () => openWindow("file manager"),
          },
          {
            id: "3",
            icon: (
              <Icon
                icon="material-symbols-light:terminal"
                width="40"
                height="40"
              />
            ),
            label: "Terminal",
            defaultPosition: { x: 0, y: 160 },
            handleClick: () => openWindow("terminal"),
          },
        ]}
      />

      <ManagedWindow
        id="settings"
        content={<SettingsWindow />}
        label="Settings"
        defaultPosition={{ x: 100, y: 100 }}
        className="w-[650px] h-[400px]"
      />

      <ManagedWindow
        id="file manager"
        content={<ProjectsWindow />}
        label="Files"
        defaultPosition={{ x: 160, y: 160 }}
        className="w-[650px] h-[400px]"
      />

      <ManagedWindow
        id="terminal"
        content={<TerminalWindow />}
        label="Terminal"
        defaultPosition={{ x: 220, y: 220 }}
        className="w-[650px] h-[400px]"
      />

      {customWindows.map((cw) => (
        <ManagedCustomWindow customWindow={cw} key={cw.id} />
      ))}

      <MemoizedStartMenu
        open={startMenuOpen}
        items={{
          Main: [
            {
              icon: (
                <Icon
                  icon="material-symbols-light:terminal"
                  width="28"
                  height="28"
                />
              ),
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
