"use client";

import { cn } from "@/src/lib/utils";

interface BillingToggleProps {
  value: "monthly" | "annual";
  onChange: (value: "monthly" | "annual") => void;
}

export function BillingToggle({ value, onChange }: BillingToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5 backdrop-blur-md">
      <button
        onClick={() => onChange("monthly")}
        className={cn(
          "px-5 py-2 rounded-full text-sm font-medium transition-all duration-700",
          value === "monthly"
            ? "bg-white/10 text-white"
            : "text-gray-300 hover:text-white hover:bg-white/10"
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange("annual")}
        className={cn(
          "px-5 py-2 rounded-full text-sm font-medium transition-all duration-700 flex items-center gap-2",
          value === "annual"
            ? "bg-white/10 text-white"
            : "text-gray-300 hover:text-white hover:bg-white/10"
        )}
      >
        Annual
        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
          Save 17%
        </span>
      </button>
    </div>
  );
}
