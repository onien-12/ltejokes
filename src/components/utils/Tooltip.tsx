import React from "react";
import clsx from "clsx";

interface TooltipProps {
  children: React.ReactNode;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, className }) => {
  return (
    <div
      className={clsx(
        "relative",
        "px-3 py-1.5 rounded-md text-xs",
        "bg-[#3a3a3a]/90 text-white border border-[#555]/90",
        "shadow-lg backdrop-blur-sm",
        "transform opacity-0 scale-95",
        "transition-all duration-200 ease-out",
        className
      )}
    >
      {children}
    </div>
  );
};

export default Tooltip;
