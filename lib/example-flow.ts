import type { Node, Edge } from "@xyflow/react";

export const initialNodes: Node[] = [
  {
    id: "input-1",
    type: "input",
    position: { x: 250, y: 0 },
    data: { label: "User Input" },
  },
  {
    id: "prompt-1",
    type: "prompt",
    position: { x: 225, y: 100 },
    data: {
      label: "Prompt",
      prompt: "",
      model: "gpt-4o",
    },
  },
  {
    id: "output-1",
    type: "output",
    position: { x: 250, y: 250 },
    data: { label: "Response" },
  },
];

export const initialEdges: Edge[] = [
  {
    id: "e-input-prompt",
    source: "input-1",
    target: "prompt-1",
    animated: true,
  },
  {
    id: "e-prompt-output",
    source: "prompt-1",
    target: "output-1",
  },
];
