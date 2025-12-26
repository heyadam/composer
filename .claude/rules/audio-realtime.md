# Audio System

## Audio Registry

**Audio Registry** (`lib/audio/registry.ts`): Global singleton for managing MediaStream references used in audio edges:
- `register(stream)`: Register a MediaStream, returns unique ID
- `get(id)`: Retrieve MediaStream by ID
- `unregister(id)`: Stop tracks and remove stream
- `clear()`: Stop all tracks and clear registry
- Enables audio nodes to pass stream references without serializing audio data

## Realtime Conversation

**RealtimeNode** (`components/Flow/nodes/RealtimeNode.tsx`): Real-time voice conversation using OpenAI's Realtime API:
- Voice selection (10 voices: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar)
- VAD modes:
  - `semantic_vad`: Semantic voice activity detection
  - `server_vad`: Server-side voice activity detection
  - `disabled`: Manual push-to-talk (PTT)
- Live transcript display
- Audio input/output ports (emerald colored)
- Auto-starts session when flow executes if output is connected
- 60-minute maximum session duration

**useRealtimeSession Hook** (`lib/hooks/useRealtimeSession.ts`): Manages WebRTC-based realtime voice sessions:
- Connection lifecycle (connecting, connected, disconnected, error)
- Transcript updates with role (user/assistant) and timestamps
- Audio input/output stream management via audio registry
- Session timers (60-minute max)
- Push-to-talk event handling
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
