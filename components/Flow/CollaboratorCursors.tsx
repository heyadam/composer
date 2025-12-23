import { memo, useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { ViewportPortal, useViewport } from "@xyflow/react";
import { MousePointer2 } from "lucide-react";

import type { Collaborator } from "@/lib/hooks/useCollaboration";
import { usePerfectCursor, type PerfectCursorPoint } from "@/lib/hooks/usePerfectCursor";

interface CollaboratorCursorsProps {
  collaborators: Collaborator[];
}

const stringToColor = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 55%)`;
};

const CURSOR_OFFSET_X = 8;
const CURSOR_OFFSET_Y = 6;

const CollaboratorCursor = memo(
  ({ collaborator, zoom }: { collaborator: Collaborator; zoom: number }) => {
    const cursorRef = useRef<HTMLDivElement>(null);
    const color = useMemo(() => stringToColor(collaborator.userId), [collaborator.userId]);

    const animateCursor = useCallback(
      (point: PerfectCursorPoint) => {
        const element = cursorRef.current;
        if (!element) return;
        element.style.transform = `translate(${point[0]}px, ${point[1]}px) translate(${CURSOR_OFFSET_X}px, ${CURSOR_OFFSET_Y}px) scale(${1 / zoom})`;
      },
      [zoom]
    );

    const onPointMove = usePerfectCursor(animateCursor);

    useLayoutEffect(() => {
      if (!collaborator.cursor) return;
      onPointMove([collaborator.cursor.x, collaborator.cursor.y]);
    }, [collaborator.cursor, onPointMove]);

    if (!collaborator.cursor) return null;

    return (
      <div
        ref={cursorRef}
        className="absolute left-0 top-0 pointer-events-none select-none"
        style={{ transformOrigin: "0 0" }}
      >
        <div className="flex items-start gap-1">
          <MousePointer2 className="h-4 w-4 drop-shadow-sm" style={{ color }} />
          <div className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span>{collaborator.name ?? "Guest"}</span>
          </div>
        </div>
      </div>
    );
  }
);

CollaboratorCursor.displayName = "CollaboratorCursor";

export const CollaboratorCursors = ({ collaborators }: CollaboratorCursorsProps) => {
  const { zoom } = useViewport();
  const visible = collaborators.filter((collaborator) => collaborator.cursor);

  if (visible.length === 0) return null;

  return (
    <ViewportPortal>
      <div className="absolute left-0 top-0">
        {visible.map((collaborator) => (
          <CollaboratorCursor
            key={collaborator.userId}
            collaborator={collaborator}
            zoom={zoom}
          />
        ))}
      </div>
    </ViewportPortal>
  );
};
