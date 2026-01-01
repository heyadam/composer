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
import { SwitchNode } from "./SwitchNode";
import { StringCombineNode } from "./StringCombineNode";
import { ThreejsSceneNode } from "./ThreejsSceneNode";
import { ThreejsOptionsNode } from "./ThreejsOptionsNode";

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
  "switch": SwitchNode,
  "string-combine": StringCombineNode,
  "threejs-scene": ThreejsSceneNode,
  "threejs-options": ThreejsOptionsNode,
};

export { InputNode, OutputNode, PromptNode, ImageNode, ImageInputNode, AudioInputNode, MagicNode, CommentNode, ReactNode, RealtimeNode, AudioTranscriptionNode, SwitchNode, StringCombineNode, ThreejsSceneNode, ThreejsOptionsNode };
