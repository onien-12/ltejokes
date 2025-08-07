import React from "react";

type InputProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "email" | "search";
};

export default function Input({
  label,
  placeholder = "",
  value,
  onChange,
  type = "text",
}: InputProps) {
  return (
    <div className="flex flex-col gap-1 items-start w-full">
      {label && (
        <label className="text-md text-gray-300 font-medium">{label}</label>
      )}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#2a2a2a] text-white border border-[#444] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5c5c5c] focus:border-[#5c5c5c] transition-all placeholder-gray-500 w-full"
      />
    </div>
  );
}
