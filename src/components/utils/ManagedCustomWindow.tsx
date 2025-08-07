import React from "react";
import Window from "../Window";
import { CustomWindow, useSystemStore } from "../../store/useSystemStore";

interface ManagedCustomWindowProps {
  customWindow: CustomWindow;
}

const ManagedCustomWindow: React.FC<ManagedCustomWindowProps> = React.memo(
  ({ customWindow }) => {
    const { id, name, window: content } = customWindow;

    const isOpen = useSystemStore((state) => state.openWindows.includes(id));
    const closeWindow = useSystemStore((state) => state.closeWindow);
    const removeCustomWindow = useSystemStore(
      (state) => state.removeCustomWindow
    );

    console.log(`ManagedCustomWindow ${id} rendering. Open: ${isOpen}`);

    if (
      !useSystemStore.getState().customWindows.some((cw) => cw.id === id) &&
      !isOpen
    ) {
      return null;
    }

    return (
      <Window
        id={id}
        content={content}
        label={name}
        defaultPosition={{ x: 100, y: 100 }}
        open={isOpen}
        onClose={() => {
          closeWindow(id);
          setTimeout(() => removeCustomWindow(id), 300);
        }}
        className="w-[650px] h-[400px]"
      />
    );
  }
);

export default ManagedCustomWindow;
