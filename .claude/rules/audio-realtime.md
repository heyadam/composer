# Audio System

## Audio Registry

**Audio Registry** (`lib/audio/registry.ts`): Global singleton for managing MediaStream references used in audio edges:
- `register(stream)`: Register a MediaStream, returns unique ID
- `get(id)`: Retrieve MediaStream by ID
- `unregister(id)`: Stop tracks and remove stream
- `clear()`: Stop all tracks and clear registry
- Enables audio nodes to pass stream references without serializing audio data

## Audio Input

**AudioInputNode** (`components/Flow/nodes/AudioInputNode.tsx`): Entry point for audio recording:
- Real-time waveform visualization using Web Audio API (AnalyserNode)
- MediaRecorder with format auto-detection (webm+opus, webm, mp4, aac)
- Automatic recording start when flow executes (triggered by `awaitingInput` state)
- Uses pending-input-registry for async user input during execution
- Outputs audio in `AudioEdgeData` format (base64 buffer with metadata)

**Pending Input Registry** (`lib/execution/pending-input-registry.ts`): Global registry for nodes awaiting user input during flow execution:
- `waitForInput(nodeId)`: Called by engine to wait for user input, returns Promise
- `resolveInput(nodeId, data)`: Called by node component when input is complete
- `isWaiting(nodeId)`: Check if a node is awaiting input
- `clear()`: Cancel all pending inputs (used on flow reset/cancel)

**Execution Synchronization Pattern**: Audio input nodes use a ref-based pattern to avoid race conditions with execution status:
1. `onstop` handler stores audio data in `pendingAudioRef` and calls `resolveInput()`
2. A `useEffect` watches `data.executionStatus` for "success" or "error"
3. When execution completes, the effect persists the pending audio data to node state
4. This ensures audio data is persisted only after the engine sets the final status

## Audio Utilities

**Audio Utils** (`lib/audio-utils.ts`): Centralized utilities for audio output handling:
- `isAudioOutput(output)`: Check if output string contains JSON audio data
- `parseAudioOutput(output)`: Parse audio data from JSON string to `AudioData` interface
- `getAudioBlobUrl(audioData)`: Create blob URL from base64 buffer for playback
- `formatAudioDuration(seconds)`: Format duration as `mm:ss` string

**AudioPreview** (`components/Flow/ResponsesSidebar/AudioPreview.tsx`): Audio playback component for ResponsesSidebar:
- Frequency visualization using Web Audio API
- Play/pause controls with seek bar
- Compact mode for node preview display
- Proper blob URL cleanup to prevent memory leaks

## Audio Transcription

**AudioTranscriptionNode** (`components/Flow/nodes/AudioTranscriptionNode.tsx`): Speech-to-text conversion using OpenAI's transcription API:
- Models: `gpt-4o-transcribe` (default, high quality), `gpt-4o-mini-transcribe` (cost-optimized)
- Audio input port (required, emerald) - accepts `AudioEdgeData` from Audio Input node
- Optional language input port (cyan) - ISO 639-1 codes (e.g., "en", "es", "fr")
- Outputs transcribed text as string
- Execution handled in `app/api/execute/route.ts` (`type: "audio-transcription"`)

## Realtime Conversation

**RealtimeNode** (`components/Flow/nodes/RealtimeNode.tsx`): Real-time voice conversation using OpenAI's Realtime API:
- Voice selection (10 voices: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar)
- VAD modes:
  - `semantic_vad`: Semantic voice activity detection
  - `server_vad`: Server-side voice activity detection
  - `disabled`: Manual push-to-talk (PTT)
- System instructions input (connectable from upstream nodes via `resolvedInstructions`)
- Live transcript display with auto-scroll and compact 10px font
- Transcript streams to connected preview-output nodes in real-time
- Audio input/output ports (emerald colored)
- Auto-starts session when flow executes if output is connected
- Transcript clears on flow reset
- 60-minute maximum session duration

**Connected Instructions Pattern**: When the instructions input is connected:
1. Executor resolves the input value from connected edge
2. Passes `resolvedInstructions` to component via `onNodeStateChange`
3. Component waits for resolved value before auto-starting session
4. Uses `hasAutoStartedRef` to handle race condition where executor completes before React re-renders

**Live Transcript Streaming**: The component pushes transcript updates to connected preview-output nodes:
- Sets `stringOutput` on preview-output targets (not just `executionOutput`)
- `useFlowExecution` has a sync effect that watches preview-output nodes and updates `previewEntries`
- This enables the ResponsesSidebar to show live transcript updates

**useRealtimeSession Hook** (`lib/hooks/useRealtimeSession.ts`): Manages WebRTC-based realtime voice sessions:
- Connection lifecycle (connecting, connected, disconnected, error)
- Transcript updates with role (user/assistant) and timestamps
- Audio input/output stream management via audio registry
- Session timers (60-minute max)
- Push-to-talk event handling
- `clearTranscript()`: Clears internal transcript state (used on flow reset)
- Supports owner-funded execution via share token

## Realtime API

**Realtime Session API** (`app/api/realtime/session/route.ts`): Ephemeral token endpoint for WebRTC connections:
- POST: Returns `clientSecret` for OpenAI Realtime API WebRTC handshake
- Supports user-provided API keys or owner-funded execution via share token
- Rate limited: 10 sessions per minute per IP/token
- Integrates with Supabase for owner key decryption and execution logging

## AudioEdgeData Interface

For audio streaming between nodes:
- `type`: `"stream"` (MediaStream reference) or `"buffer"` (base64 encoded)
- `streamId`: Reference ID to MediaStream in global audio registry
- `buffer`, `mimeType`, `sampleRate`: For buffer-based audio transfer
