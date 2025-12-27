import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { PerfectCursor } from "perfect-cursors";

export type PerfectCursorPoint = [number, number];

export const usePerfectCursor = (onPointMove: (point: PerfectCursorPoint) => void) => {
  const callbackRef = useRef(onPointMove);

  // Update ref in useLayoutEffect to avoid updating during render
  useLayoutEffect(() => {
    callbackRef.current = onPointMove;
  });

  // eslint-disable-next-line react-hooks/refs -- Intentional: callback ref pattern to access latest callback without causing re-renders
  const [cursor] = useState(() => {
    // Capture the ref container (not its current value) so callback always uses latest
    const ref = callbackRef;
    return new PerfectCursor((point) => {
      ref.current(point as PerfectCursorPoint);
    });
  });

  useLayoutEffect(() => {
    return () => cursor.dispose();
  }, [cursor]);

  return useCallback((point: PerfectCursorPoint) => {
    cursor.addPoint(point);
  }, [cursor]);
};
