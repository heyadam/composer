"use client";

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

// Color mapping based on data type - "Luminous Precision" palette
// Sophisticated, muted tones that glow on dark backgrounds
const edgeColors = {
  string: "#8EC8F6",   // Soft azure - logical, flowing data
  image: "#C9B8FA",    // Lavender bloom - creative, visual
  response: "#F6D98E", // Champagne gold - valuable output
  audio: "#8EF6E4",    // Electric mint - wavelengths, frequency
  boolean: "#F6A8B8",  // Soft coral - binary, warm
  pulse: "#F6C88E",    // Apricot signal - trigger, burst
  default: "#8EC8F6",  // Soft azure (default to string)
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
