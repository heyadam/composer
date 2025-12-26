# Type System

Flow types in `types/flow.ts` define node data interfaces with execution state tracking (`ExecutionStatus`, `executionOutput`, `executionError`).

## Port Data Types

**PortDataType**: Union type for port/edge data types: `"string"` | `"image"` | `"response"` | `"audio"`. Used for edge coloring and connection validation.

## Node Data Interfaces

### PromptNodeData

- `userPrompt`: User message content (used when prompt input not connected)
- `systemPrompt`: System instructions (used when system input not connected)
- `imageInput`: Runtime-only image data for vision prompts (not persisted)
- `provider`, `model`: AI provider and model selection
- `verbosity`, `thinking`: OpenAI-specific options
- `googleThinkingConfig`: Google-specific thinking options (`thinkingLevel`, `thinkingBudget`, `includeThoughts`)
- `googleSafetyPreset`: Safety filtering level (`default`, `strict`, `relaxed`, `none`)
- `executionReasoning`: Captured thinking/reasoning output from models that support it

### RealtimeNodeData

- `instructions`: System prompt for the realtime session
- `voice`: Voice selection (`alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`)
- `vadMode`: Voice activity detection mode (`semantic_vad`, `server_vad`, `disabled` for manual PTT)
- `sessionStatus`: Connection state (`disconnected`, `connecting`, `connected`, `error`)
- `transcript`: Array of conversation entries with role, text, and timestamp
- `audioOutStreamId`: Registry ID for output audio stream

### AudioEdgeData

Interface for audio streaming between nodes:
- `type`: `"stream"` (MediaStream reference) or `"buffer"` (base64 encoded)
- `streamId`: Reference ID to MediaStream in global audio registry
- `buffer`, `mimeType`, `sampleRate`: For buffer-based audio transfer

## Node Type Constants

Valid node types for flow operations:
- `text-input`
- `image-input`
- `text-generation`
- `image-generation`
- `ai-logic`
- `preview-output`
- `react-component`
- `comment`
- `realtime-conversation`
