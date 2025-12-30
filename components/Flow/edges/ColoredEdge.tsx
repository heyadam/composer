"use client";

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

/**
 * Color mapping based on data type - "Luminous Precision" palette.
 *
 * These hex values correspond to the CSS variables in app/styles/nodes.css:
 * - string:   --port-cyan    (142 200 246)
 * - image:    --port-purple  (201 184 250)
 * - response: --port-amber   (246 217 142)
 * - audio:    --port-emerald (142 246 228)
 * - boolean:  --port-rose    (246 168 184)
 * - pulse:    --port-orange  (246 200 142)
 *
 * IMPORTANT: Keep these values in sync with the CSS variables.
 * SVG inline styles require hex values, not CSS var() references.
 */
const edgeColors = {
  string: "#8EC8F6",   // --port-cyan
  image: "#C9B8FA",    // --port-purple
  response: "#F6D98E", // --port-amber
  audio: "#8EF6E4",    // --port-emerald
  boolean: "#F6A8B8",  // --port-rose
  pulse: "#F6C88E",    // --port-orange
  default: "#8EC8F6",  // --port-cyan (default to string)
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
