"use client";

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

// Color mapping based on data type
const edgeColors = {
  string: "#d1d5db",   // gray-300
  image: "#d1d5db",    // gray-300
  response: "#d1d5db", // gray-300
  audio: "#34d399",    // emerald-400
  boolean: "#fb7185",  // rose-400
  pulse: "#fb923c",    // orange-400
  default: "#d1d5db",  // gray-300
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
