import type { Node, Edge } from "@xyflow/react";

export const initialNodes: Node[] = [
  {
    id: "input-1",
    type: "input",
    position: { x: 0, y: 150 },
    data: { label: "User Input", inputValue: "" },
  },
  {
    id: "prompt-1",
    type: "prompt",
    position: { x: 350, y: 0 },
    data: {
      label: "GPT-5",
      prompt: "",
      provider: "openai",
      model: "gpt-5",
    },
  },
  {
    id: "prompt-2",
    type: "prompt",
    position: { x: 350, y: 250 },
    data: {
      label: "GPT-5 Mini",
      prompt: "",
      provider: "openai",
      model: "gpt-5-mini",
    },
  },
  {
    id: "output-1",
    type: "output",
    position: { x: 700, y: 50 },
    data: { label: "Response 1" },
  },
  {
    id: "output-2",
    type: "output",
    position: { x: 700, y: 300 },
    data: { label: "Response 2" },
  },
];

export const initialEdges: Edge[] = [
  {
    id: "e-input-prompt1",
    source: "input-1",
    target: "prompt-1",
  },
  {
    id: "e-input-prompt2",
    source: "input-1",
    target: "prompt-2",
  },
  {
    id: "e-prompt1-output1",
    source: "prompt-1",
    target: "output-1",
  },
  {
    id: "e-prompt2-output2",
    source: "prompt-2",
    target: "output-2",
  },
];
