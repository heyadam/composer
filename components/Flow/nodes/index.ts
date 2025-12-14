import type { NodeTypes } from "@xyflow/react";
import { InputNode } from "./InputNode";
import { OutputNode } from "./OutputNode";
import { PromptNode } from "./PromptNode";
import { ImageNode } from "./ImageNode";
import { ImageInputNode } from "./ImageInputNode";
import { MagicNode } from "./MagicNode";

export const nodeTypes: NodeTypes = {
  input: InputNode,
  output: OutputNode,
  prompt: PromptNode,
  image: ImageNode,
  "image-input": ImageInputNode,
  magic: MagicNode,
};

export { InputNode, OutputNode, PromptNode, ImageNode, ImageInputNode, MagicNode };
