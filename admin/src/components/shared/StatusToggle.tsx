import React from "react";
import { Switch } from "@/components/ui/switch";

interface StatusToggleProps {
  isActive: boolean;
  onChange: (isActive: boolean) => void;
  disabled?: boolean;
}

export function StatusToggle({ isActive, onChange, disabled }: StatusToggleProps) {
  return (
    <div
      className={`flex items-center gap-2 min-h-11 mt-2 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <Switch
        checked={isActive}
        onCheckedChange={onChange}
        disabled={disabled}
      />
      <span
        className="font-medium text-sm text-gray-700 select-none"
        onClick={() => {
          if (!disabled) {
            onChange(!isActive);
          }
        }}
      >
        {isActive ? "Hoạt động" : "Đã ẩn"}
      </span>
    </div>
  );
}
