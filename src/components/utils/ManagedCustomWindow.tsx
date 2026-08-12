import React from "react";
import Window from "../Window";
import { CustomWindow, useSystemStore } from "../../store/useSystemStore";
import clsx from "clsx";

interface ManagedCustomWindowProps {
  customWindow: CustomWindow;
}

const ManagedCustomWindow: React.FC<ManagedCustomWindowProps> = React.memo(({ customWindow }) => {
  const { id, name, window: content, className } = customWindow;

  const isOpen = useSystemStore((state) => state.openWindows.includes(id));
  const closeWindow = useSystemStore((state) => state.closeWindow);
  const removeCustomWindow = useSystemStore((state) => state.removeCustomWindow);

  console.log(`ManagedCustomWindow ${id} rendering. Open: ${isOpen}`);

  if (!useSystemStore.getState().customWindows.some((cw) => cw.id === id) && !isOpen) {
    return null;
  }

  return (
    <Window
      id={id}
      content={content}
      label={name}
      defaultPosition={{ x: window.innerWidth > 750 ? 100 : 4, y: window.innerWidth > 650 ? 100 : 30 }}
      open={isOpen}
      onClose={() => {
        closeWindow(id);
        setTimeout(() => removeCustomWindow(id), 300);
      }}
      className={
        className ??
        clsx(
          {
            "w-[650px]": window.innerWidth > 650,
            "w-[98%]": window.innerWidth <= 650,
          },
          {
            "h-[400px]": window.innerWidth > 650,
            "h-[95dvh]": window.innerWidth <= 650,
          }
        )
      }
    />
  );
});

export default ManagedCustomWindow;
