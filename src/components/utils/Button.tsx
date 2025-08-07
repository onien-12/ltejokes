import React from "react";
import clsx from "clsx";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "ghost";
};

export default function Button({
  children,
  onClick,
  className,
  variant = "default",
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-4 py-1.5 rounded-md text-sm transition-all select-none",
        variant === "default" &&
          "bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white border border-[#555]",
        variant === "ghost" &&
          "bg-transparent hover:bg-[#2a2a2a] text-gray-300 border border-transparent",
        className
      )}
    >
      {children}
    </button>
  );
}
