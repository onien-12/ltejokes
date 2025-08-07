import { animated, useSpring } from "@react-spring/web";
import { Icon } from "@iconify-icon/react";
import { useEffect, useState } from "react";
import { formatTime } from "../utils";
import TextFace from "./utils/TextFace";
import { useSystemStore } from "../store/useSystemStore";

export default function Header({ onMenuOpen }: { onMenuOpen: () => void }) {
  const { openWindows } = useSystemStore();

  const [hovered, setHovered] = useState(false);
  const [date, setDate] = useState(new Date());

  const styles = useSpring({
    transform: hovered ? "scale(1.005)" : "scale(1)",
    config: {
      tension: 300,
      friction: 10,
    },
  });

  useEffect(() => {
    const dateInterval = setInterval(() => setDate(new Date()), 500);

    return () => clearInterval(dateInterval);
  }, []);

  return (
    <div className="flex justify-center backdrop-blur-md opacity-85 z-40">
      <animated.div
        style={styles}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-[98%] rounded-md bg-neutral-900 h-6 absolute top-1 p-1
                   flex flex-row items-center font-code text-white"
      >
        <div
          className="flex flex-row items-center"
          onClick={() => onMenuOpen()}
        >
          <Icon
            icon="material-symbols:circle-outline"
            width="18"
            height="18"
            className="text-white cursor-pointer"
          />
        </div>
        <div className="w-3"></div>
        <span className="text-sm">{openWindows.at(-1)}</span>
        <div className="flex-1"></div>
        <span className="text-sm">
          <TextFace />
        </span>
        <div className="w-3"></div>
        <span className="text-sm">{formatTime(date)}</span>
      </animated.div>
    </div>
  );
}
