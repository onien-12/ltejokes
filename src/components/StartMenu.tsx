import { animated, useSpring } from "@react-spring/web";
import { useEffect, useState } from "react";
import StartMenuItem from "./StartMenuItem";
import { Icon } from "@iconify-icon/react";

export type StartMenuItem = {
  icon: React.ReactNode;
  label: string;
};

export default function StartMenu({
  open,
  items,
}: {
  open: boolean;
  items: Record<string, StartMenuItem[]>;
}) {
  const [group, setGroup] = useState("Main");

  const [styles, api] = useSpring(() => ({
    from: {
      y: 0,
      opacity: 0,
      zIndex: "-10",
    },
  }));

  useEffect(() => {
    api.set({ zIndex: "30" });

    api.start({
      opacity: open ? 1 : 0,
      y: open ? 15 : 0,
      zIndex: !open ? "-10" : null,
    });
  }, [open]);

  return (
    <animated.div
      className="w-40 h-fit rounded-md backdrop-blur-md border border-neutral-200 
                    absolute top-4 left-3 flex flex-col gap-3"
      style={styles}
    >
      <div className="flex flex-col gap-2 p-2">
        {items[group].map((item) => (
          <StartMenuItem icon={item.icon} label={item.label} />
        ))}
      </div>
      <div className="flex flex-row gap-1 text-white border-t border-t-neutral-200 p-2 cursor-pointer">
        <Icon icon="ic:round-settings" width="20" height="20" />
      </div>
    </animated.div>
  );
}
