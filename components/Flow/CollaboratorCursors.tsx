import { memo, useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { ViewportPortal, useViewport } from "@xyflow/react";
import { Crown, MousePointer2 } from "lucide-react";

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
    const positionRef = useRef<HTMLDivElement>(null);
    const color = useMemo(() => stringToColor(collaborator.userId), [collaborator.userId]);

    // Animate position only (no scale) - scale is applied via CSS on inner element
    const animateCursor = useCallback(
      (point: PerfectCursorPoint) => {
        const element = positionRef.current;
        if (!element) return;
        element.style.transform = `translate(${point[0] + CURSOR_OFFSET_X}px, ${point[1] + CURSOR_OFFSET_Y}px)`;
      },
      []
    );

    const onPointMove = usePerfectCursor(animateCursor);

    useLayoutEffect(() => {
      if (!collaborator.cursor) return;
      onPointMove([collaborator.cursor.x, collaborator.cursor.y]);
    }, [collaborator.cursor, onPointMove]);

    if (!collaborator.cursor) return null;

    // Scale is applied on inner div, separate from animated position
    const scale = 1 / zoom;

    return (
      <div
        ref={positionRef}
        className="absolute left-0 top-0 pointer-events-none select-none"
        style={{ transformOrigin: "0 0" }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
          <div className="flex items-start gap-2">
            <div className="h-6 w-6 shrink-0">
              <MousePointer2 className="h-6 w-6 drop-shadow-lg" style={{ color }} />
            </div>
            <div className="flex items-center gap-2 rounded-full bg-black/85 px-3 py-1.5 text-sm font-medium text-white shadow-lg">
              {collaborator.isOwner && (
                <Crown className="h-4 w-4 text-yellow-400" />
              )}
              {collaborator.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={collaborator.avatar} alt="" className="h-5 w-5 rounded-full" />
              ) : (
                <span className="h-5 w-5 rounded-full" style={{ backgroundColor: color }} />
              )}
              <span>{collaborator.name ?? "Guest"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CollaboratorCursor.displayName = "CollaboratorCursor";

export const CollaboratorCursors = ({ collaborators }: CollaboratorCursorsProps) => {
  const { zoom } = useViewport();
  // Filter out self and collaborators without cursor positions
  const visible = collaborators.filter((collaborator) => collaborator.cursor && !collaborator.isSelf);

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
