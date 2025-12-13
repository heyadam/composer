"use client";

interface ResponsesHeaderProps {
  keyError?: string | null;
}

export function ResponsesHeader({ keyError }: ResponsesHeaderProps) {
  return (
    <div className="flex flex-col border-b shrink-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-sm font-medium">Responses</span>
      </div>
      {keyError && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-500">{keyError}</p>
        </div>
      )}
    </div>
  );
}
