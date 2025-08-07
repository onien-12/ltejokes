import { useEffect, useRef, useState } from "react";
import Draggable from "react-draggable";
import { useSystemStore } from "../store/useSystemStore";
import { animated, useSpring } from "@react-spring/web";
import { twMerge } from "tailwind-merge";

export type WindowProps = {
  id: string;
  content: React.ReactNode;
  label: string;
  open: boolean;
  defaultPosition?: { x: number; y: number };
  onClose: () => void;
  className?: string;
};

export default function Window({
  id,
  content,
  label,
  open,
  defaultPosition,
  onClose,
  className = "",
}: WindowProps) {
  const nodeRef = useRef(null);

  const { openWindows, focusWindow } = useSystemStore();
  const [handleId, setHandleId] = useState(Math.floor(Math.random() * 1024));

  const [styles, api] = useSpring(() => ({
    from: {
      scale: 0.5,
      opacity: 0,
      zIndex: "19",
    },
  }));

  useEffect(() => {
    api.set({
      zIndex: open ? (20 + openWindows.indexOf(id)).toString() : "100",
    });
    if (open) {
      api.start({
        opacity: 1,
        scale: 1,
        config: {
          tension: 100,
          friction: 10,
        },
      });
    } else {
      api.start({
        opacity: 0,
        scale: 0.5,
        config: {
          tension: 220,
          friction: 26,
        },
        onResolve: () => {
          api.set({ zIndex: "-10" });
        },
      });
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      console.log(id, "update", openWindows.indexOf(id));
      api.set({
        zIndex: (20 + openWindows.indexOf(id)).toString(),
      });
    }
  }, [openWindows]);

  return (
    <Draggable
      defaultPosition={defaultPosition}
      handle={`.window-${handleId}`}
      nodeRef={nodeRef}
    >
      <animated.div
        ref={nodeRef}
        className={twMerge(
          `min-w-48 min-h-12 absolute items-center w-24 text-center select-none text-white
           rounded-md border backdrop-blur-lg border-neutral-200 overflow-hidden resize shadow-xl`,
          className
        )}
        style={styles}
        onPointerDown={(event) =>
          !(event.target as HTMLDivElement).matches(".close-button") &&
          openWindows.indexOf(id) != openWindows.length - 1
            ? focusWindow(id)
            : null
        }
      >
        <div
          className={`h-5 w-full border-b border-b-neutral-200 overflow-hidden font-code text-sm cursor-move absolute window-${handleId}`}
        >
          <div className="flex flex-row items-center bg-neutral-800 px-2">
            <div>{label}</div>
            <div className="flex-1"></div>
            <div
              className="cursor-pointer close-button"
              onClick={() => {
                onClose();
              }}
            >
              x
            </div>
          </div>
        </div>
        <div className="window-content w-full absolute top-[20px]">
          {content}
        </div>
      </animated.div>
    </Draggable>
  );
}
