"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface NodeSelectOption {
  value: string;
  label: string;
}

interface NodeSelectProps {
  value: string;
  options: readonly NodeSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Standalone select dropdown for nodes without a label row.
 * Uses consistent node typography (11px) and styling.
 * For labeled dropdowns, use ConfigSelect instead.
 */
export function NodeSelect({
  value,
  options,
  onChange,
  placeholder,
  className,
}: NodeSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("nodrag h-5 text-[11px]", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-[11px]">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
