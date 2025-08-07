import React from "react";
import { useSystemStore } from "../../store/useSystemStore";
import Window from "../Window";

interface ManagedWindowProps {
  id: string;
  content: React.ReactNode;
  label: string;
  defaultPosition: { x: number; y: number };
  className?: string;
}

const ManagedWindow: React.FC<ManagedWindowProps> = React.memo(
  ({ id, content, label, defaultPosition, className }) => {
    const isOpen = useSystemStore((state) => state.openWindows.includes(id));
    const closeWindow = useSystemStore((state) => state.closeWindow);

    console.log(`ManagedWindow ${id} rendering. Open: ${isOpen}`);

    return (
      <Window
        id={id}
        content={content}
        label={label}
        defaultPosition={defaultPosition}
        open={isOpen}
        onClose={() => closeWindow(id)}
        className={className}
      />
    );
  }
);

export default ManagedWindow;
