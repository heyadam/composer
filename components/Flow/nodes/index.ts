import type { NodeTypes } from "@xyflow/react";
import { InputNode } from "./InputNode";
import { OutputNode } from "./OutputNode";
import { PromptNode } from "./PromptNode";
import { ImageNode } from "./ImageNode";
import { ImageInputNode } from "./ImageInputNode";
import { AudioInputNode } from "./AudioInputNode";
import { MagicNode } from "./MagicNode";
import { CommentNode } from "./CommentNode";
import { ReactNode } from "./ReactNode";
import { RealtimeNode } from "./RealtimeNode";
import { AudioTranscriptionNode } from "./AudioTranscriptionNode";

export const nodeTypes: NodeTypes = {
  "text-input": InputNode,
  "preview-output": OutputNode,
  "text-generation": PromptNode,
  "image-generation": ImageNode,
  "image-input": ImageInputNode,
  "audio-input": AudioInputNode,
  "ai-logic": MagicNode,
  "comment": CommentNode,
  "react-component": ReactNode,
  "realtime-conversation": RealtimeNode,
  "audio-transcription": AudioTranscriptionNode,
};

export { InputNode, OutputNode, PromptNode, ImageNode, ImageInputNode, AudioInputNode, MagicNode, CommentNode, ReactNode, RealtimeNode, AudioTranscriptionNode };
