"use client";

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

/**
 * Color mapping based on data type - uses CSS variables from app/styles/nodes.css.
 *
 * Values use rgb() with CSS custom properties for single source of truth:
 * - string:   --port-cyan
 * - image:    --port-purple
 * - response: --port-amber
 * - audio:    --port-emerald
 * - boolean:  --port-rose
 * - pulse:    --port-orange
 * - three:    --port-coral
 */
const edgeColors = {
  string: "rgb(var(--port-cyan))",
  image: "rgb(var(--port-purple))",
  response: "rgb(var(--port-amber))",
  audio: "rgb(var(--port-emerald))",
  boolean: "rgb(var(--port-rose))",
  pulse: "rgb(var(--port-orange))",
  three: "rgb(var(--port-coral))",
  default: "rgb(var(--port-cyan))",
};

export function ColoredEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const dataType = (data?.dataType as string) || "default";
  const strokeColor = edgeColors[dataType as keyof typeof edgeColors] || edgeColors.default;

  return (
    <>
      {/* Outer glow when selected */}
      {selected && (
        <>
          <path
            d={edgePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={16}
            strokeOpacity={0.15}
            className="animate-pulse"
          />
          <path
            d={edgePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={10}
            strokeOpacity={0.3}
            className="animate-pulse"
          />
          <path
            d={edgePath}
            fill="none"
            stroke="#ffffff"
            strokeWidth={6}
            strokeOpacity={0.4}
          />
        </>
      )}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 4 : 2,
        }}
      />
    </>
  );
}

export const edgeTypes = {
  colored: ColoredEdge,
};
