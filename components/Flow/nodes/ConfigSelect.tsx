"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ConfigOption {
  value: string;
  label: string;
}

interface ConfigSelectProps {
  label: string;
  value: string;
  options: readonly ConfigOption[];
  onChange: (value: string) => void;
  width?: string;
}

/**
 * Reusable config row with label and select dropdown.
 * Used for provider options, model settings, etc.
 */
export function ConfigSelect({
  label,
  value,
  options,
  onChange,
  width = "w-[100px]",
}: ConfigSelectProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={`h-7 text-xs nodrag ${width}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
