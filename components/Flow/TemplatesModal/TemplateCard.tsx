"use client";

import { FileJson2 } from "lucide-react";
import type { TemplateDefinition } from "./templates";

interface TemplateCardProps {
  template: TemplateDefinition;
  onSelect: (template: TemplateDefinition) => void;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="group flex flex-col gap-3 rounded-lg border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md cursor-pointer"
    >
      {/* Thumbnail placeholder */}
      <div className="aspect-video w-full rounded-md bg-muted border flex items-center justify-center overflow-hidden">
        <FileJson2 className="h-8 w-8 text-muted-foreground/50 group-hover:text-primary/50 transition-colors" />
      </div>

      {/* Title & Description */}
      <div className="min-w-0">
        <h3 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
          {template.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {template.description}
        </p>
      </div>
    </button>
  );
}
