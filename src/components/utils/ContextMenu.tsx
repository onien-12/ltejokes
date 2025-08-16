import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom"; // For portal rendering
import clsx from "clsx";

interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
  children: React.ReactNode;
  className?: string;
}

export default function ContextMenu({ isOpen, onClose, x, y, children, className }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuStyle: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    zIndex: 10000,
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = x;
      let newY = y;

      if (rect.right > viewportWidth) {
        newX = viewportWidth - rect.width - 5;
      }
      if (rect.bottom > viewportHeight) {
        newY = viewportHeight - rect.height - 5;
      }

      if (newX !== x || newY !== y) {
        menuRef.current.style.left = `${newX}px`;
        menuRef.current.style.top = `${newY}px`;
      }
    }
  }, [x, y, isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className={clsx(
        "bg-[#2a2a2a] text-white",
        "border border-[#444]",
        "rounded-md shadow-lg p-1 text-sm whitespace-nowrap",
        "flex flex-col gap-2",
        className
      )}
      style={menuStyle}
    >
      {children}
    </div>,
    document.body
  );
}

interface ContextMenuItemProps {
  children: React.ReactNode;
  onClick: (event: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
}

export const ContextMenuItem = React.memo(({ children, onClick, className, disabled }: ContextMenuItemProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onClick(e);
    }
  };

  return (
    <div
      className={clsx(
        "px-4 py-2 cursor-pointer hover:bg-blue-600/50 transition-colors rounded-md",
        "flex flex-row items-center gap-2",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
});
