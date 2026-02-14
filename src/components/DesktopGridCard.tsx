import { useRef } from "react";
import Draggable from "react-draggable";

export type DesktopItem = {
  id: string;
  icon: React.ReactNode;
  label: string;
  defaultPosition?: { x: number; y: number };
  handleClick: () => void;
};

export default function DesktopGridCard({ item }: { item: DesktopItem }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const startPos = useRef<[number, number]>([0, 0]);

  return (
    <Draggable key={item.id} defaultPosition={item.defaultPosition} grid={[20, 20]} bounds="parent" nodeRef={nodeRef}>
      <div
        ref={nodeRef}
        className="absolute flex flex-col items-center cursor-pointer w-24 text-center select-none text-white
                   hover:shadow-2xl hover:backdrop-blur-xl hover:rounded-xl"
        style={{
          transition: "box-shadow 300ms, backdrop-filter 300ms, border-radius 300ms",
        }}
        onPointerDown={() => {
          const rect = nodeRef.current?.getBoundingClientRect();
          if (rect) startPos.current = [rect.x, rect.y];
        }}
        onPointerUp={() => {
          const rect = nodeRef.current?.getBoundingClientRect();
          if (!rect) return;

          const distance = Math.sqrt((rect.x - startPos.current[0]) ** 2 + (rect.y - startPos.current[1]) ** 2);
          if (distance == 0) item.handleClick();
        }}
      >
        <div className="p-1 rounded-2xl">{item.icon}</div>
        <span className="text-sm">{item.label}</span>
      </div>
    </Draggable>
  );
}
