import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { PerfectCursor } from "perfect-cursors";

export type PerfectCursorPoint = [number, number];

export const usePerfectCursor = (onPointMove: (point: PerfectCursorPoint) => void) => {
  const callbackRef = useRef(onPointMove);
  callbackRef.current = onPointMove;

  const [cursor] = useState(
    () =>
      new PerfectCursor((point) => {
        callbackRef.current(point as PerfectCursorPoint);
      })
  );

  useLayoutEffect(() => {
    return () => cursor.dispose();
  }, [cursor]);

  return useCallback((point: PerfectCursorPoint) => {
    cursor.addPoint(point);
  }, [cursor]);
};
