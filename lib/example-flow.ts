import type { Node, Edge } from "@xyflow/react";

export const initialNodes: Node[] = [
  {
    id: "input-1",
    type: "input",
    position: { x: 0, y: 200 },
    data: { label: "User Input", inputValue: "A cute robot painting a landscape" },
  },
  {
    id: "prompt-1",
    type: "prompt",
    position: { x: 350, y: 0 },
    data: {
      label: "GPT-5",
      prompt: "Respond briefly to the user's input.",
      provider: "openai",
      model: "gpt-5",
    },
  },
  {
    id: "image-1",
    type: "image",
    position: { x: 350, y: 250 },
    data: {
      label: "Image Generator",
      prompt: "",
      outputFormat: "webp",
      size: "1024x1024",
      quality: "low",
      partialImages: 3,
    },
  },
  {
    id: "output-1",
    type: "output",
    position: { x: 700, y: 50 },
    data: { label: "Text Response" },
  },
  {
    id: "output-2",
    type: "output",
    position: { x: 700, y: 300 },
    data: { label: "Image Response" },
  },
];

export const initialEdges: Edge[] = [
  {
    id: "e-input-prompt1",
    source: "input-1",
    target: "prompt-1",
  },
  {
    id: "e-input-image1",
    source: "input-1",
    target: "image-1",
  },
  {
    id: "e-prompt1-output1",
    source: "prompt-1",
    target: "output-1",
  },
  {
    id: "e-image1-output2",
    source: "image-1",
    target: "output-2",
  },
];
