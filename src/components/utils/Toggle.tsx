import React from "react";
import clsx from "clsx";

interface ToggleProps {
  isOn: boolean;
  onToggle: (newState: boolean) => void;
  label?: string;
  className?: string;
  onColor?: string;
  offColor?: string;
  thumbColor?: string;
}

const Toggle: React.FC<
  ToggleProps & Omit<React.HTMLAttributes<HTMLDivElement>, "onToggle">
> = ({
  isOn,
  onToggle,
  label,
  className,
  onColor = "bg-[#007AFF]",
  offColor = "bg-[#3A3A3A]",
  thumbColor = "bg-white",
  ...rest
}) => {
  const toggleClasses = clsx(
    "relative inline-flex flex-shrink-0 h-5 w-9 border border-transparent rounded-full",
    "cursor-pointer transition-colors ease-in-out duration-200",
    "focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:ring-offset-1 focus:ring-offset-[#1e1e1e]",
    isOn ? onColor : offColor,
    className
  );

  const thumbClasses = clsx(
    "pointer-events-none inline-block h-4 w-4 rounded-full",
    thumbColor,
    "shadow-sm transform ring-0 transition ease-in-out duration-200",
    isOn ? "translate-x-4" : "translate-x-0"
  );

  const handleToggle = () => {
    onToggle(!isOn);
  };

  return (
    <div className="flex items-center gap-3" {...rest}>
      {label && (
        <label
          htmlFor={`toggle-${
            label?.replace(/\s+/g, "-") ||
            Math.random().toString(36).substring(7)
          }`}
          className="text-md text-gray-300 font-medium cursor-pointer"
        >
          {label}
        </label>
      )}
      <button
        id={`toggle-${
          label?.replace(/\s+/g, "-") || Math.random().toString(36).substring(7)
        }`}
        type="button"
        role="switch"
        aria-checked={isOn}
        onClick={handleToggle}
        className={toggleClasses}
      >
        <span className="sr-only">{label ? `Toggle ${label}` : "Toggle"}</span>
        <span aria-hidden="true" className={thumbClasses} />
      </button>
    </div>
  );
};

export default Toggle;
