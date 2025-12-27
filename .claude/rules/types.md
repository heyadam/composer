# Type System

Flow types in `types/flow.ts` define node data interfaces with execution state tracking (`ExecutionStatus`, `executionOutput`, `executionError`).

## Port Data Types

**PortDataType**: Union type for port/edge data types: `"string"` | `"image"` | `"response"` | `"audio"` | `"boolean"` | `"pulse"`. Used for edge coloring and connection validation.

**Color Mapping**:
- `cyan` = string
- `purple` = image
- `amber` = response
- `emerald` = audio
- `rose` = boolean
- `orange` = pulse

**Pulse Ports**: Processing nodes (`text-generation`, `image-generation`, `ai-logic`, `react-component`, `audio-transcription`) have a `done` output port that fires a pulse when execution completes. Pulses are momentary signals that are "on" for a single execution cycle, then return to "off".

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

### AudioInputNodeData

- `audioBuffer`: Base64-encoded recorded audio buffer
- `audioMimeType`: MIME type of recorded audio (e.g., `audio/webm`, `audio/mp4`)
- `recordingDuration`: Duration in seconds
- `isRecording`: True while recording is in progress
- `awaitingInput`: True when execution engine is waiting for user to record

### RealtimeNodeData

- `instructions`: System prompt for the realtime session
- `voice`: Voice selection (`alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`)
- `vadMode`: Voice activity detection mode (`semantic_vad`, `server_vad`, `disabled` for manual PTT)
- `sessionStatus`: Connection state (`disconnected`, `connecting`, `connected`, `error`)
- `transcript`: Array of conversation entries with role, text, and timestamp
- `audioOutStreamId`: Registry ID for output audio stream

### AudioTranscriptionNodeData

- `model`: Transcription model (`gpt-4o-transcribe` default, `gpt-4o-mini-transcribe`)
- `language`: Optional ISO 639-1 language code (e.g., `en`, `es`, `fr`)

### AudioEdgeData

Interface for audio streaming between nodes:
- `type`: `"stream"` (MediaStream reference) or `"buffer"` (base64 encoded)
- `streamId`: Reference ID to MediaStream in global audio registry
- `buffer`, `mimeType`, `sampleRate`: For buffer-based audio transfer

## Node Type Constants

Valid node types for flow operations:
- `text-input`
- `image-input`
- `audio-input`
- `text-generation`
- `image-generation`
- `ai-logic`
- `preview-output`
- `react-component`
- `comment`
- `realtime-conversation`
- `audio-transcription`
