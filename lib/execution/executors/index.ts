/**
 * Node Executors Index
 *
 * Imports and registers all node executors with the registry.
 * Import this module to ensure all executors are available.
 */

import { registerExecutor } from "../executor-registry";

// Import all executors
import { textInputExecutor } from "./text-input";
import { imageInputExecutor } from "./image-input";
import { audioInputExecutor } from "./audio-input";
import { previewOutputExecutor } from "./preview-output";
import { textGenerationExecutor } from "./text-generation";
import { imageGenerationExecutor } from "./image-generation";
import { aiLogicExecutor } from "./ai-logic";
import { reactComponentExecutor } from "./react-component";
import { audioTranscriptionExecutor } from "./audio-transcription";
import { realtimeConversationExecutor } from "./realtime-conversation";
import { commentExecutor } from "./comment";
import { switchExecutor } from "./switch";
import { stringCombineExecutor } from "./string-combine";

// Register all executors
registerExecutor(textInputExecutor);
registerExecutor(imageInputExecutor);
registerExecutor(audioInputExecutor);
registerExecutor(previewOutputExecutor);
registerExecutor(textGenerationExecutor);
registerExecutor(imageGenerationExecutor);
registerExecutor(aiLogicExecutor);
registerExecutor(reactComponentExecutor);
registerExecutor(audioTranscriptionExecutor);
registerExecutor(realtimeConversationExecutor);
registerExecutor(commentExecutor);
registerExecutor(switchExecutor);
registerExecutor(stringCombineExecutor);

// Re-export types for convenience
export type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";
export { createPassthroughExecutor } from "./types";

// Re-export individual executors for direct access if needed
export { textInputExecutor } from "./text-input";
export { imageInputExecutor } from "./image-input";
export { audioInputExecutor } from "./audio-input";
export { previewOutputExecutor } from "./preview-output";
export { textGenerationExecutor } from "./text-generation";
export { imageGenerationExecutor } from "./image-generation";
export { aiLogicExecutor } from "./ai-logic";
export { reactComponentExecutor } from "./react-component";
export { audioTranscriptionExecutor } from "./audio-transcription";
export { realtimeConversationExecutor } from "./realtime-conversation";
export { commentExecutor } from "./comment";
export { switchExecutor } from "./switch";
export { stringCombineExecutor } from "./string-combine";
