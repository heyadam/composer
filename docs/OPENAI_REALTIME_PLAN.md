# OpenAI Realtime SDK Implementation Plan

## Overview

This plan outlines the implementation of OpenAI's Realtime API as a series of nodes in Composer, enabling real-time voice-to-voice and text conversations with AI models.

## Background

The OpenAI Realtime API provides:
- **Speech-to-speech** conversations without intermediate text-to-speech/speech-to-text
- **Text and audio** input/output modalities
- **Function calling** for extending model capabilities
- **Voice Activity Detection (VAD)** for automatic turn-taking
- **WebRTC** connection for browser-based low-latency audio
- **WebSocket** connection for server-side applications
- **60-minute max session duration**

Available voices: `alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar` (recommended: `marin`, `cedar`)

---

## Proposed Node Architecture

### Option A: Single Unified Node (Recommended)

A single **RealtimeNode** that handles the complete realtime session lifecycle:

```
┌─────────────────────────────────────────────────┐
│              Realtime Conversation              │
├─────────────────────────────────────────────────┤
│  ● System Instructions [text input]             │
│  ● Voice: [dropdown: marin, cedar, alloy...]    │
│  ● Modality: [audio | text | both]              │
│  ● VAD Mode: [semantic | threshold | disabled]  │
├─────────────────────────────────────────────────┤
│  [🎤 Start Session]  [⏹ End Session]            │
│                                                 │
│  Status: ● Connected (2:34 elapsed)             │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Conversation Transcript                  │   │
│  │ User: Hello, how are you?                │   │
│  │ AI: I'm doing great! How can I help?    │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  Output: [response] ────────────────────────●   │
└─────────────────────────────────────────────────┘
```

**Pros:**
- Simpler mental model for users
- Session state contained in one place
- Easier to implement and maintain

**Cons:**
- Less flexible for complex pipelines
- Can't easily split input/output processing

### Option B: Multi-Node Architecture

Split into specialized nodes for more flexibility:

1. **RealtimeSessionNode** - Manages WebRTC connection and session state
2. **RealtimeInputNode** - Captures microphone audio / accepts text input
3. **RealtimeOutputNode** - Displays transcript and plays audio output
4. **RealtimeFunctionNode** - Defines callable functions for the session

```
┌──────────────┐     ┌────────────────────┐     ┌───────────────┐
│ Realtime     │────▶│ Realtime Session   │────▶│ Realtime      │
│ Input        │     │ (WebRTC + Config)  │     │ Output        │
└──────────────┘     └────────────────────┘     └───────────────┘
                              │
                              ▼
                     ┌────────────────────┐
                     │ Realtime Function  │
                     │ (Tool definitions) │
                     └────────────────────┘
```

**Pros:**
- More flexible pipeline construction
- Can connect multiple inputs/outputs
- Functions can be added modularly

**Cons:**
- More complex for users to understand
- Session state coordination is harder

### Recommendation: Start with Option A

Begin with a single unified **RealtimeNode** for v1. This provides:
- Quick time-to-value
- Simple user experience
- Foundation that can be extended later

---

## Detailed Implementation Plan

### Phase 1: Core Infrastructure

#### 1.1 API Route for Ephemeral Token Generation

Create `/app/api/realtime/session/route.ts`:

```typescript
// POST /api/realtime/session
// Generates ephemeral client secret for WebRTC connection

export async function POST(request: Request) {
  const { apiKeys, shareToken } = await request.json();

  // Get OpenAI API key (user's or owner-funded)
  const openaiKey = await resolveApiKey('openai', apiKeys, shareToken);

  // Call OpenAI REST API for ephemeral token
  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview',
      voice: 'marin',
    }),
  });

  const { client_secret } = await response.json();
  return Response.json({ clientSecret: client_secret.value });
}
```

#### 1.2 WebRTC Connection Hook

Create `/lib/hooks/useRealtimeConnection.ts`:

```typescript
interface UseRealtimeConnectionOptions {
  onTranscript: (text: string, role: 'user' | 'assistant') => void;
  onAudioOutput: (audio: MediaStream) => void;
  onError: (error: Error) => void;
  onStatusChange: (status: RealtimeStatus) => void;
}

export function useRealtimeConnection(options: UseRealtimeConnectionOptions) {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const connect = async (clientSecret: string, config: SessionConfig) => {
    // 1. Create peer connection
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    // 2. Set up remote audio playback
    pc.ontrack = (e) => options.onAudioOutput(e.streams[0]);

    // 3. Add local microphone track
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc.addTrack(stream.getTracks()[0]);

    // 4. Create data channel for events
    const dc = pc.createDataChannel('oai-events');
    dcRef.current = dc;

    dc.onmessage = (e) => handleServerEvent(JSON.parse(e.data));

    // 5. Create and send SDP offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // 6. Get SDP answer from OpenAI
    const sdpResponse = await fetch(
      'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      }
    );

    const answer = { type: 'answer', sdp: await sdpResponse.text() };
    await pc.setRemoteDescription(answer);

    setStatus('connected');
  };

  const disconnect = () => {
    pcRef.current?.close();
    setStatus('disconnected');
  };

  const sendEvent = (event: ClientEvent) => {
    dcRef.current?.send(JSON.stringify(event));
  };

  return { status, connect, disconnect, sendEvent };
}
```

### Phase 2: Node Implementation

#### 2.1 Type Definitions

Add to `/types/flow.ts`:

```typescript
export type RealtimeStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type RealtimeVoice =
  | 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo'
  | 'sage' | 'shimmer' | 'verse' | 'marin' | 'cedar';

export type RealtimeModality = 'audio' | 'text' | 'both';

export type VADMode = 'semantic_vad' | 'server_vad' | 'disabled';

export interface RealtimeTranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface RealtimeNodeData extends ExecutionData {
  // Configuration
  instructions: string;
  voice: RealtimeVoice;
  modality: RealtimeModality;
  vadMode: VADMode;

  // Runtime state (not persisted)
  sessionStatus?: RealtimeStatus;
  transcript?: RealtimeTranscriptEntry[];
  elapsedTime?: number;

  // Tools/Functions (optional)
  tools?: RealtimeTool[];
}
```

Update `NODE_PORT_SCHEMAS`:

```typescript
"realtime-conversation": {
  inputs: [
    { id: "instructions", label: "Instructions", dataType: "string" }
  ],
  outputs: [
    { id: "transcript", label: "Transcript", dataType: "string" },
    { id: "lastResponse", label: "Last Response", dataType: "string" }
  ]
}
```

#### 2.2 Node Component

Create `/components/Flow/nodes/RealtimeNode.tsx`:

```typescript
export function RealtimeNode({ id, data }: NodeProps<RealtimeNodeData>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();
  const audioRef = useRef<HTMLAudioElement>(null);

  const instructionsConnected = edges.some(
    e => e.target === id && e.targetHandle === 'instructions'
  );

  const {
    status,
    connect,
    disconnect,
    sendEvent,
    transcript,
    elapsedTime,
  } = useRealtimeSession({
    nodeId: id,
    onTranscriptUpdate: (entries) => {
      updateNodeData(id, { transcript: entries });
    },
  });

  const handleStartSession = async () => {
    // Get ephemeral token from backend
    const { clientSecret } = await fetch('/api/realtime/session', {
      method: 'POST',
      body: JSON.stringify({ /* apiKeys */ }),
    }).then(r => r.json());

    await connect(clientSecret, {
      instructions: data.instructions,
      voice: data.voice,
      modality: data.modality,
      vadMode: data.vadMode,
    });
  };

  return (
    <NodeFrame
      title="Realtime Conversation"
      icon={Mic}
      iconClassName="text-emerald-400"
      status={data.executionStatus}
      ports={NODE_PORT_SCHEMAS['realtime-conversation']}
    >
      {/* Instructions Input */}
      <InputWithHandle
        id={id}
        handleId="instructions"
        label="System Instructions"
        value={data.instructions}
        onChange={(v) => updateNodeData(id, { instructions: v })}
        connected={instructionsConnected}
        placeholder="You are a helpful assistant..."
      />

      {/* Voice Selector */}
      <Select
        value={data.voice}
        onValueChange={(v) => updateNodeData(id, { voice: v })}
      >
        <SelectTrigger>Voice: {data.voice}</SelectTrigger>
        <SelectContent>
          {VOICES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Session Controls */}
      <div className="flex gap-2 mt-4">
        {status === 'disconnected' ? (
          <Button onClick={handleStartSession}>
            <Mic className="w-4 h-4 mr-2" />
            Start Session
          </Button>
        ) : (
          <Button variant="destructive" onClick={disconnect}>
            <Square className="w-4 h-4 mr-2" />
            End Session
          </Button>
        )}
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2 mt-2">
        <div className={cn(
          "w-2 h-2 rounded-full",
          status === 'connected' && "bg-green-500 animate-pulse",
          status === 'connecting' && "bg-yellow-500",
          status === 'error' && "bg-red-500",
          status === 'disconnected' && "bg-gray-500"
        )} />
        <span className="text-xs text-muted-foreground">
          {status === 'connected' && `Connected (${formatTime(elapsedTime)})`}
          {status === 'connecting' && 'Connecting...'}
          {status === 'disconnected' && 'Disconnected'}
          {status === 'error' && 'Error'}
        </span>
      </div>

      {/* Transcript Display */}
      {transcript?.length > 0 && (
        <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
          {transcript.map(entry => (
            <div key={entry.id} className={cn(
              "text-sm p-2 rounded",
              entry.role === 'user' ? "bg-blue-500/10" : "bg-emerald-500/10"
            )}>
              <span className="font-medium">
                {entry.role === 'user' ? 'You' : 'AI'}:
              </span>{' '}
              {entry.text}
            </div>
          ))}
        </div>
      )}

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} autoPlay />
    </NodeFrame>
  );
}
```

#### 2.3 Node Registration

Update `/components/Flow/NodeSidebar.tsx`:

```typescript
import { Mic } from 'lucide-react';

const iconMap: Record<NodeType, typeof Mic> = {
  // ... existing icons
  'realtime-conversation': Mic,
};
```

Update `/types/flow.ts` `nodeDefinitions`:

```typescript
{
  type: 'realtime-conversation',
  label: 'Realtime',
  description: 'Real-time voice conversation with AI',
  color: 'bg-emerald-500/10 text-emerald-400',
}
```

### Phase 3: Execution Engine Integration

#### 3.1 Execution Logic

The RealtimeNode is **stateful** and **interactive**, so it works differently from other nodes:

- It does **not** participate in the normal flow execution (run button)
- It manages its own lifecycle (start/stop session)
- Output is available continuously during the session

For flow integration, we can:
1. **Pre-populate instructions** from connected input nodes before session starts
2. **Emit transcript output** when session ends for downstream nodes

Add to `/lib/execution/engine.ts`:

```typescript
case 'realtime-conversation': {
  // RealtimeNode is interactive - execution just passes through
  // the current transcript as output
  const transcript = nodeData.transcript || [];
  const fullTranscript = transcript
    .map(e => `${e.role}: ${e.text}`)
    .join('\n');

  return {
    output: fullTranscript,
    debugInfo: {
      startTime: Date.now(),
      endTime: Date.now(),
      request: { type: 'realtime-conversation' },
    },
  };
}
```

### Phase 4: Advanced Features

#### 4.1 Function Calling Support

Add a collapsible "Tools" section to the node:

```typescript
interface RealtimeTool {
  name: string;
  description: string;
  parameters: JSONSchema;
  handler?: (args: Record<string, unknown>) => Promise<unknown>;
}

// In the node component
<Collapsible>
  <CollapsibleTrigger>
    <Wrench className="w-4 h-4" /> Tools ({data.tools?.length || 0})
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* Tool definition UI */}
  </CollapsibleContent>
</Collapsible>
```

For function execution, leverage the **MagicNode** pattern - allow users to define JavaScript handlers that execute when the model calls a function.

#### 4.2 Push-to-Talk Mode

Add a push-to-talk option when VAD is disabled:

```typescript
const [isRecording, setIsRecording] = useState(false);

// In component
{data.vadMode === 'disabled' && (
  <Button
    onMouseDown={() => {
      sendEvent({ type: 'input_audio_buffer.clear' });
      setIsRecording(true);
    }}
    onMouseUp={() => {
      sendEvent({ type: 'input_audio_buffer.commit' });
      sendEvent({ type: 'response.create' });
      setIsRecording(false);
    }}
  >
    <Mic className={cn(isRecording && "text-red-500")} />
    {isRecording ? 'Release to Send' : 'Hold to Talk'}
  </Button>
)}
```

#### 4.3 Audio Visualization

Add a simple audio waveform visualization:

```typescript
// Use Web Audio API analyser node
const analyserRef = useRef<AnalyserNode>();

// In the connection hook
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
const source = audioContext.createMediaStreamSource(micStream);
source.connect(analyser);
analyserRef.current = analyser;

// Render waveform using canvas or SVG
```

### Phase 5: Autopilot Integration

#### 5.1 Update System Prompt

Add to `/lib/autopilot/system-prompt.ts`:

```typescript
## realtime-conversation Node

Real-time voice conversation with OpenAI's Realtime API.

**Type**: \`realtime-conversation\`

**Data Interface**:
\`\`\`typescript
{
  instructions: string;      // System prompt for the conversation
  voice: "marin" | "cedar" | "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse";
  modality: "audio" | "text" | "both";
  vadMode: "semantic_vad" | "server_vad" | "disabled";
}
\`\`\`

**Inputs**:
- \`instructions\` (string): Optional system instructions from upstream node

**Outputs**:
- \`transcript\` (string): Full conversation transcript
- \`lastResponse\` (string): Most recent AI response

**Example**:
\`\`\`json
{
  "type": "addNode",
  "id": "realtime-1",
  "type": "realtime-conversation",
  "position": { "x": 300, "y": 200 },
  "data": {
    "instructions": "You are a helpful customer service agent.",
    "voice": "marin",
    "modality": "audio",
    "vadMode": "semantic_vad"
  }
}
\`\`\`
```

#### 5.2 Update Evaluator

Add to `/lib/autopilot/evaluator.ts`:

```typescript
NODE_INPUT_HANDLES['realtime-conversation'] = {
  instructions: ['string'],
};

OUTPUT_DATA_TYPES['realtime-conversation'] = 'string';
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `types/flow.ts` | Modify | Add RealtimeNodeData, port schemas, node definition |
| `components/Flow/nodes/RealtimeNode.tsx` | Create | Main node component |
| `components/Flow/NodeSidebar.tsx` | Modify | Add icon mapping |
| `lib/hooks/useRealtimeConnection.ts` | Create | WebRTC connection logic |
| `lib/hooks/useRealtimeSession.ts` | Create | Session state management |
| `app/api/realtime/session/route.ts` | Create | Ephemeral token endpoint |
| `lib/execution/engine.ts` | Modify | Add realtime node case |
| `lib/autopilot/system-prompt.ts` | Modify | Document realtime node |
| `lib/autopilot/evaluator.ts` | Modify | Add validation rules |
| `docs/AI_MODELS.md` | Modify | Add gpt-4o-realtime-preview |

---

## Dependencies

```bash
npm install @openai/realtime-api-beta  # Optional: for easier event handling
```

The WebRTC implementation uses native browser APIs, so no additional WebRTC packages are required.

---

## Security Considerations

1. **Ephemeral tokens only** - Never expose the main OpenAI API key to the browser
2. **Token TTL** - Ephemeral tokens expire after 10 minutes by default
3. **Rate limiting** - Apply rate limits to the session creation endpoint
4. **Owner-funded execution** - Extend existing pattern for realtime sessions

---

## Testing Plan

1. **Unit tests**: Hook logic, event parsing
2. **Integration tests**: Session creation API route
3. **Manual testing**:
   - Voice input/output quality
   - Transcript accuracy
   - Interruption handling
   - Network disconnection recovery

---

## Future Enhancements

1. **Multi-user sessions** - Share realtime sessions with collaborators
2. **Recording** - Save conversation audio for playback
3. **Transcription-only mode** - Use realtime API for live transcription
4. **Custom voices** - Support for OpenAI voice cloning when available
5. **SIP integration** - Phone call integration via OpenAI's SIP support

---

## References

- [OpenAI Realtime API Guide](https://platform.openai.com/docs/guides/realtime)
- [OpenAI Realtime API Reference](https://platform.openai.com/docs/api-reference/realtime)
- [OpenAI Realtime WebRTC Guide](https://platform.openai.com/docs/guides/realtime-webrtc)
- [@openai/realtime-api-beta](https://github.com/openai/openai-realtime-api-beta)
- [WebRTC Samples](https://github.com/webrtc/samples)
