import type { NodeTypes } from "@xyflow/react";
import { InputNode } from "./InputNode";
import { OutputNode } from "./OutputNode";
import { PromptNode } from "./PromptNode";
import { ImageNode } from "./ImageNode";
import { ImageInputNode } from "./ImageInputNode";
import { MagicNode } from "./MagicNode";
import { CommentNode } from "./CommentNode";

export const nodeTypes: NodeTypes = {
  "text-input": InputNode,
  "preview-output": OutputNode,
  "text-generation": PromptNode,
  "image-generation": ImageNode,
  "image-input": ImageInputNode,
  "ai-logic": MagicNode,
  "comment": CommentNode,
};

export { InputNode, OutputNode, PromptNode, ImageNode, ImageInputNode, MagicNode, CommentNode };
