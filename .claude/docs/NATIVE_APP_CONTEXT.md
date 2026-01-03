# Composer Native App Context

This document provides context for building a native iOS/macOS app that integrates with Composer's backend. It covers all server-side APIs, data structures, authentication, and real-time collaboration patterns.

**Live URL**: [composer.design](https://composer.design)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [API Reference](#2-api-reference)
3. [Data Models](#3-data-models)
4. [Authentication & Security](#4-authentication--security)
5. [Real-Time Collaboration](#5-real-time-collaboration)
6. [Source File Index](#6-source-file-index)

---

## 1. Project Overview

### What is Composer?

Composer is a visual AI workflow builder that lets users create, connect, and execute AI-powered nodes in a graph-based interface. Users can:

- **Build flows**: Drag-and-drop nodes (text generation, image generation, code transformation, etc.)
- **Execute flows**: Run the entire graph with streaming outputs
- **Collaborate live**: Share flows via URL with real-time cursor sync
- **Owner-funded execution**: Let collaborators use the owner's API keys

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React Flow, Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth (Google OAuth) |
| Storage | Supabase Storage (flow JSON files) |
| AI Providers | OpenAI, Google Gemini, Anthropic Claude |

### Key Concepts

- **Flow**: A graph of connected nodes representing an AI workflow
- **Node**: A unit of work (input, processing, or output)
- **Edge**: A connection between node ports
- **Share Token**: 12-character alphanumeric secret for accessing published flows
- **Live ID**: 4-digit human-readable code for sharing URLs
- **Owner-Funded Execution**: Collaborators use the flow owner's encrypted API keys

---

## 2. API Reference

Base URL: `https://composer.design/api` (production) or `http://localhost:3000/api` (development)

### 2.1 Flow Management

CRUD operations for authenticated users' flows.

#### List Flows
```
GET /api/flows
Auth: Required (Supabase session cookie)
```

**Response:**
```json
{
  "success": true,
  "flows": [
    {
      "id": "uuid",
      "name": "My Flow",
      "description": "Optional description",
      "created_at": "2025-01-03T10:00:00Z",
      "updated_at": "2025-01-03T12:00:00Z",
      "live_id": "1234",
      "share_token": "abc123def456"
    }
  ]
}
```

**Source**: `/Users/adam/dev/composer/app/api/flows/route.ts`

#### Create Flow
```
POST /api/flows
Auth: Required
Content-Type: application/json
```

**Request:**
```json
{
  "flow": {
    "metadata": {
      "name": "New Flow",
      "description": "Optional",
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp",
      "schemaVersion": 1
    },
    "nodes": [...],
    "edges": [...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "flow": {
    "id": "uuid",
    "name": "New Flow",
    "storage_path": "flows/user-id/flow-id.json",
    ...
  }
}
```

**Source**: `/Users/adam/dev/composer/app/api/flows/route.ts`

#### Get Flow
```
GET /api/flows/[id]
Auth: Required (must be owner)
```

**Response:**
```json
{
  "success": true,
  "flow": { ...FlowRecord },
  "content": { ...SavedFlow }
}
```

**Source**: `/Users/adam/dev/composer/app/api/flows/[id]/route.ts`

#### Update Flow
```
PUT /api/flows/[id]
Auth: Required (must be owner)
```

**Request:** Same as Create Flow

**Source**: `/Users/adam/dev/composer/app/api/flows/[id]/route.ts`

#### Delete Flow
```
DELETE /api/flows/[id]
Auth: Required (must be owner)
```

**Source**: `/Users/adam/dev/composer/app/api/flows/[id]/route.ts`

---

### 2.2 Publishing & Sharing

Publish flows for collaboration and external access.

#### Publish Flow
```
POST /api/flows/[id]/publish
Auth: Required (must be owner)
```

**Response:**
```json
{
  "success": true,
  "live_id": "1234",
  "share_token": "abc123def456",
  "use_owner_keys": true
}
```

**Notes:**
- Generates unique `live_id` (4-digit) and `share_token` (12-char)
- Retries up to 5 times on collision
- Share URL format: `https://composer.design/f/[live_id]/[share_token]`

**Source**: `/Users/adam/dev/composer/app/api/flows/[id]/publish/route.ts`

#### Unpublish Flow
```
DELETE /api/flows/[id]/publish
Auth: Required (must be owner)
```

**Notes:**
- Supports `navigator.sendBeacon` (method override in body)
- Called automatically on page unload

**Source**: `/Users/adam/dev/composer/app/api/flows/[id]/publish/route.ts`

#### Update Publish Settings
```
PATCH /api/flows/[id]/publish
Auth: Required (must be owner)
```

**Request:**
```json
{
  "useOwnerKeys": true,
  "allowPublicExecute": true
}
```

**Source**: `/Users/adam/dev/composer/app/api/flows/[id]/publish/route.ts`

---

### 2.3 Live Collaboration (Token-Gated)

Access published flows without authentication using share token.

#### Get Live Flow
```
GET /api/live/[token]
Auth: Share token in URL (12 alphanumeric chars)
```

**Response:**
```json
{
  "success": true,
  "flow": {
    "id": "uuid",
    "name": "Shared Flow",
    "description": "...",
    "use_owner_keys": true,
    "allow_public_execute": true
  },
  "nodes": [...],
  "edges": [...]
}
```

**Source**: `/Users/adam/dev/composer/app/api/live/[token]/route.ts`

#### Update Live Flow
```
PUT /api/live/[token]
Auth: Share token in URL
```

**Request:**
```json
{
  "nodes": [...],
  "edges": [...],
  "deletedNodeIds": ["node-1"],
  "deletedEdgeIds": ["edge-1"],
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Source**: `/Users/adam/dev/composer/app/api/live/[token]/route.ts`

---

### 2.4 Execution Engine

Execute nodes with streaming responses.

#### Execute Node
```
POST /api/execute
Auth: API keys in headers or body
```

**Headers (alternative to body):**
```
x-openai-key: sk-...
x-google-key: AIz...
x-anthropic-key: sk-ant-...
```

**Request (text-generation):**
```json
{
  "type": "text-generation",
  "inputs": {
    "prompt": "User message",
    "system": "System instructions"
  },
  "provider": "openai",
  "model": "gpt-5.2",
  "imageInput": "base64 data (optional for vision)",
  "apiKeys": {
    "openai": "sk-...",
    "google": "AIz...",
    "anthropic": "sk-ant-..."
  },
  "shareToken": "abc123def456",
  "runId": "unique-run-id"
}
```

**Supported execution types:**
| Type | Description |
|------|-------------|
| `text-generation` | LLM text generation (streaming) |
| `image-generation` | AI image generation |
| `react-component` | AI-generated React components |
| `threejs-scene` | AI-generated 3D scenes |
| `magic-generate` | Code transformation (Claude Haiku) |
| `audio-transcription` | Speech-to-text (OpenAI) |

**Response:** Streaming NDJSON
```
{"type": "text", "content": "Hello"}
{"type": "text", "content": " world"}
{"type": "reasoning", "content": "Thinking..."}
{"type": "usage", "promptTokens": 10, "completionTokens": 20}
```

**Owner-Funded Execution:**
- Include `shareToken` and `runId` in request
- Server decrypts owner's API keys
- Rate limited: 10/min, 100/day per flow

**Source**: `/Users/adam/dev/composer/app/api/execute/route.ts`

#### Live Flow Execution
```
POST /api/live/[token]/execute
Auth: Share token in URL
```

**Request:**
```json
{
  "inputs": {
    "Input Label": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "quotaRemaining": 95,
  "flowName": "My Flow",
  "outputs": {
    "Output Label": "result"
  },
  "errors": {}
}
```

**Rate Limits:**
- 10 executions per minute per share_token
- 100 executions per day per flow

**Source**: `/Users/adam/dev/composer/app/api/live/[token]/execute/route.ts`

---

### 2.5 API Key Management

Server-side encrypted storage for owner-funded execution.

#### Get Key Status
```
GET /api/user/keys
Auth: Required
```

**Response:**
```json
{
  "success": true,
  "hasOpenai": true,
  "hasGoogle": false,
  "hasAnthropic": true
}
```

**Source**: `/Users/adam/dev/composer/app/api/user/keys/route.ts`

#### Store Keys
```
PUT /api/user/keys
Auth: Required
```

**Request:**
```json
{
  "openai": "sk-...",
  "google": "AIz...",
  "anthropic": "sk-ant-..."
}
```

**Notes:**
- Keys encrypted with AES-256-GCM before storage
- Requires `ENCRYPTION_KEY` env var (32-byte hex)

**Source**: `/Users/adam/dev/composer/app/api/user/keys/route.ts`

#### Delete Keys
```
DELETE /api/user/keys
Auth: Required
```

**Source**: `/Users/adam/dev/composer/app/api/user/keys/route.ts`

---

### 2.6 Autopilot (AI Flow Generation)

Natural language flow editing with Claude.

#### Generate Flow Changes
```
POST /api/autopilot
Auth: API keys in body
```

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Add an image generation node"}
  ],
  "flowSnapshot": {
    "nodes": [...],
    "edges": [...]
  },
  "model": "sonnet-4-5",
  "mode": "execute",
  "thinkingEnabled": false,
  "apiKeys": {"anthropic": "sk-ant-..."}
}
```

**Response:** Streaming NDJSON
```
{"type": "thinking", "content": "..."}
{"type": "text", "content": "I'll add an image generation node..."}
{"type": "text", "content": "```json\n{\"actions\": [...]}```"}
```

**Source**: `/Users/adam/dev/composer/app/api/autopilot/route.ts`

#### Validate Changes
```
POST /api/autopilot/evaluate
Auth: None (validation only)
```

**Request:**
```json
{
  "userRequest": "Add image generation",
  "flowSnapshot": {...},
  "changes": {
    "actions": [
      {"type": "addNode", "node": {...}},
      {"type": "addEdge", "edge": {...}}
    ]
  }
}
```

**Source**: `/Users/adam/dev/composer/app/api/autopilot/evaluate/route.ts`

---

### 2.7 MCP Server (Model Context Protocol)

JSON-RPC interface for external tools (Claude Code, Cursor, etc.).

#### Health Check
```
GET /api/mcp
```

**Response:**
```json
{
  "name": "composer",
  "version": "2.0.0",
  "protocol": "2025-03-26",
  "tools": ["get_flow_info", "run_flow", "get_run_status"]
}
```

**Source**: `/Users/adam/dev/composer/app/api/mcp/route.ts`

#### JSON-RPC Endpoint
```
POST /api/mcp
Content-Type: application/json
Accept: text/event-stream (optional for SSE)
```

**Request (get_flow_info):**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "get_flow_info",
    "arguments": {"token": "abc123def456"}
  }
}
```

**Request (run_flow):**
```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/call",
  "params": {
    "name": "run_flow",
    "arguments": {
      "token": "abc123def456",
      "inputs": {"Prompt": "Hello world"}
    }
  }
}
```

**SSE Response (with Accept: text/event-stream):**
```
data: {"jsonrpc":"2.0","method":"notifications/progress","params":{"progress":1,"total":3,"message":"Text Generation: running"}}
data: {"jsonrpc":"2.0","method":"notifications/progress","params":{"progress":2,"total":3,"message":"Text Generation: success"}}
data: {"jsonrpc":"2.0","id":"2","result":{"status":"completed","outputs":{...}}}
```

**Fetch Output:**
```
GET /api/mcp/outputs/[jobId]/[outputKey]
```

Returns raw binary (image/audio) or text content.

**Source**: `/Users/adam/dev/composer/app/api/mcp/route.ts`
**Tools**: `/Users/adam/dev/composer/lib/mcp/tools.ts`

---

### 2.8 Realtime Voice

WebRTC-based voice conversation with OpenAI Realtime API.

#### Get Ephemeral Token
```
POST /api/realtime/session
Auth: API keys or share token
```

**Request:**
```json
{
  "apiKeys": {"openai": "sk-..."},
  "shareToken": "abc123def456",
  "voice": "marin",
  "instructions": "You are a helpful assistant"
}
```

**Response:**
```json
{
  "clientSecret": "ert_...",
  "expiresAt": "2025-01-03T11:00:00Z"
}
```

**Notes:**
- Rate limited: 10 sessions per minute per IP/token
- Use `clientSecret` for WebRTC handshake with OpenAI

**Source**: `/Users/adam/dev/composer/app/api/realtime/session/route.ts`

---

### 2.9 Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

**HTTP Status Codes:**
| Code | Meaning |
|------|---------|
| 400 | Invalid request (bad token, missing fields) |
| 401 | Unauthorized (no auth provided) |
| 403 | Forbidden (not owner, quota exceeded) |
| 404 | Not found (flow, job, output) |
| 429 | Rate limit exceeded (check `Retry-After` header) |
| 500 | Server error |
| 503 | Service unavailable (fail-closed on RPC errors) |

---

## 3. Data Models

### 3.1 Flow Structure

**SavedFlow** - The complete flow document:

```typescript
interface SavedFlow {
  metadata: FlowMetadata;
  nodes: Node[];
  edges: Edge[];
}

interface FlowMetadata {
  name: string;
  description?: string;
  createdAt: string;  // ISO timestamp
  updatedAt: string;
  schemaVersion: number;  // Currently 1
}
```

**Source**: `/Users/adam/dev/composer/lib/flow-storage/types.ts`

**FlowRecord** - Database representation:

```typescript
interface FlowRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  storage_path: string;
  created_at: string;
  updated_at: string;
  // Live sharing
  live_id: string | null;
  share_token: string | null;
  use_owner_keys: boolean;
  allow_public_execute: boolean;
  // Rate limiting
  daily_execution_count: number;
  daily_execution_reset: string;
  last_accessed_at: string;
}
```

**Source**: `/Users/adam/dev/composer/lib/flows/types.ts`

---

### 3.2 Node Types

15 node types organized by category:

**Input Nodes:**
| Type | Description |
|------|-------------|
| `text-input` | User text entry |
| `image-input` | Image upload |
| `audio-input` | Audio recording |

**Processing Nodes:**
| Type | Description |
|------|-------------|
| `text-generation` | LLM text generation |
| `image-generation` | AI image generation |
| `ai-logic` | Custom code transformation |
| `react-component` | AI-generated React UI |
| `threejs-scene` | AI-generated 3D scenes |
| `threejs-options` | 3D configuration |
| `audio-transcription` | Speech-to-text |
| `realtime-conversation` | Real-time voice |
| `string-combine` | String concatenation |

**Utility Nodes:**
| Type | Description |
|------|-------------|
| `comment` | Annotation boxes |
| `switch` | Toggle on/off |
| `preview-output` | Flow exit point |

**Source**: `/Users/adam/dev/composer/types/flow.ts`

---

### 3.3 Node Data Interfaces

**Base execution state** (shared by all processing nodes):

```typescript
interface ExecutionData {
  label: string;
  executionStatus?: "idle" | "running" | "success" | "error";
  executionOutput?: string;
  executionError?: string;
  fromCache?: boolean;
  cacheable?: boolean;
}
```

**PromptNodeData** (text-generation):

```typescript
interface PromptNodeData extends ExecutionData {
  userPrompt?: string;
  systemPrompt?: string;
  imageInput?: string;  // Base64 for vision
  provider?: "openai" | "google" | "anthropic";
  model?: string;
  // Provider-specific options
  verbosity?: "low" | "medium" | "high";  // OpenAI
  thinking?: boolean;  // OpenAI
  googleThinkingConfig?: {
    thinkingLevel?: "low" | "high";
    thinkingBudget?: number;
    includeThoughts?: boolean;
  };
  googleSafetyPreset?: "default" | "strict" | "relaxed" | "none";
  executionReasoning?: string;  // Captured thinking output
}
```

**ImageNodeData** (image-generation):

```typescript
interface ImageNodeData extends ExecutionData {
  prompt?: string;
  style?: string;
  imageInput?: string;  // For image-to-image
  provider?: "openai" | "google";
  model?: string;
  // OpenAI options
  outputFormat?: "webp" | "png" | "jpeg";
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  quality?: "auto" | "low" | "medium" | "high";
  partialImages?: 0 | 1 | 2 | 3;
  // Google options
  aspectRatio?: string;
}
```

**RealtimeNodeData** (realtime-conversation):

```typescript
interface RealtimeNodeData extends ExecutionData {
  instructions?: string;
  voice: "alloy" | "ash" | "ballad" | "coral" | "echo" |
         "sage" | "shimmer" | "verse" | "marin" | "cedar";
  vadMode: "semantic_vad" | "server_vad" | "disabled";
  sessionStatus?: "disconnected" | "connecting" | "connected" | "error";
  transcript?: Array<{
    id: string;
    role: "user" | "assistant";
    text: string;
    timestamp: number;
  }>;
  audioOutStreamId?: string;
  resolvedInstructions?: string;
}
```

**AudioEdgeData** (audio streaming between nodes):

```typescript
interface AudioEdgeData {
  type: "stream" | "buffer";
  streamId?: string;      // MediaStream registry reference
  buffer?: string;        // Base64-encoded audio
  mimeType?: string;      // e.g., "audio/webm"
  sampleRate?: number;    // e.g., 24000
}
```

**Source**: `/Users/adam/dev/composer/types/flow.ts`

---

### 3.4 Port Types

Connection ports are typed for validation:

```typescript
type PortDataType =
  | "string"    // Text data (cyan)
  | "image"     // Image data (purple)
  | "response"  // Preview output (amber)
  | "audio"     // Audio data (emerald)
  | "boolean"   // True/false (rose)
  | "pulse"     // "Done" signal (orange)
  | "three";    // 3D scene data (coral)
```

Processing nodes emit a `done` pulse when execution completes.

**Source**: `/Users/adam/dev/composer/types/flow.ts`

---

### 3.5 Edge Structure

```typescript
interface Edge {
  id: string;
  source: string;       // Source node ID
  sourceHandle?: string; // Source port ID (e.g., "output", "done")
  target: string;       // Target node ID
  targetHandle?: string; // Target port ID (e.g., "prompt", "image")
  data?: {
    dataType: PortDataType;
  };
}
```

**Source**: `/Users/adam/dev/composer/types/flow.ts`

---

### 3.6 AI Model IDs

**OpenAI:**
| Model ID | Use Case |
|----------|----------|
| `gpt-5.2` | Complex reasoning |
| `gpt-5-mini` | Cost-optimized |
| `gpt-5-nano` | High-throughput |
| `gpt-image-1` | Image generation |
| `gpt-4o-transcribe` | Transcription |

**Anthropic:**
| Model ID | Use Case |
|----------|----------|
| `claude-opus-4-5` | Most capable |
| `claude-sonnet-4-5` | Agents/coding |
| `claude-haiku-4-5` | Fast/cheap |

**Google:**
| Model ID | Use Case |
|----------|----------|
| `gemini-3-pro-preview` | Complex tasks |
| `gemini-3-flash-preview` | Cost-optimized |
| `gemini-2.5-flash-image` | Image generation |

**Source**: `/Users/adam/dev/composer/docs/AI_MODELS.md`

---

## 4. Authentication & Security

### 4.1 Supabase Auth Flow

1. **Google OAuth** with PKCE flow
2. **Session stored** in cookies (chunked for large payloads)
3. **Profile created** via database trigger (with retry logic)
4. **Realtime subscriptions** for profile updates

**Source**: `/Users/adam/dev/composer/lib/auth/context.tsx`

### 4.2 API Key Encryption

Keys are encrypted at rest using AES-256-GCM:

```typescript
// Encryption format: base64(IV + ciphertext + authTag)
// IV: 12 bytes (random per encryption)
// Key: 32-byte hex from ENCRYPTION_KEY env var
```

**Source**: `/Users/adam/dev/composer/lib/encryption.ts`

### 4.3 Share Token Generation

```typescript
// Share token: 12 alphanumeric characters
// Generated from: crypto.randomBytes(12)
// Character set: 0-9, a-z, A-Z

// Live ID: 4-digit string (0000-9999)
// Generated from: crypto.randomBytes(2)
```

**Source**: `/Users/adam/dev/composer/lib/encryption.ts`

### 4.4 Rate Limiting

Enforced via Supabase RPCs (atomic operations):

| Limit | Scope | Window |
|-------|-------|--------|
| 10 | Per share_token | Per minute |
| 100 | Per flow | Per day |
| 10 | Realtime sessions | Per minute per IP |

**Fail-closed**: If RPC fails, deny request (don't allow through).

**Source**: `/Users/adam/dev/composer/app/api/live/[token]/execute/route.ts`

---

## 5. Real-Time Collaboration

### 5.1 Architecture

Uses Supabase Realtime with two APIs:

1. **Presence API**: Track online collaborators
2. **Broadcast API**: Send low-latency updates

### 5.2 Channel Subscription

```typescript
// Channel name: live:${shareToken}
const channel = supabase.channel(`live:${shareToken}`)
  .on('presence', { event: 'sync' }, handlePresenceSync)
  .on('broadcast', { event: 'nodes_updated' }, handleNodesUpdated)
  .on('broadcast', { event: 'positions_updated' }, handlePositionsUpdated)
  .on('broadcast', { event: 'edges_updated' }, handleEdgesUpdated)
  .on('broadcast', { event: 'cursor_moved' }, handleCursorMoved)
  .subscribe();
```

**Source**: `/Users/adam/dev/composer/lib/hooks/useCollaboration.ts`

### 5.3 Presence Data

```typescript
interface CollaboratorPresence {
  oderId: string;
  name: string;
  avatar: string | null;
  isOwner: boolean;
  sessionId: string;  // For multi-tab deduplication
}
```

### 5.4 Broadcast Events

| Event | Payload | Throttle |
|-------|---------|----------|
| `nodes_updated` | Full node data | None |
| `positions_updated` | Position + version | 50ms |
| `edges_updated` | Full edge data | None |
| `nodes_deleted` | Node IDs | None |
| `edges_deleted` | Edge IDs | None |
| `cursor_moved` | { x, y, userId } | None |

### 5.5 Anti-Replay Mechanisms

1. **isApplyingRemoteRef**: Prevents re-broadcasting received updates
2. **positionVersionRef**: Ignores stale position updates
3. **draggingNodesRef**: Skips incoming positions for actively dragging nodes
4. **sessionSenderId**: Distinguishes own tabs from other users

### 5.6 Auto-Save

- **Debounce**: 500ms after last change
- **Diff calculation**: Track previous state, send only changes
- **RPC**: `update_live_flow()` handles upsert logic

**Source**: `/Users/adam/dev/composer/lib/hooks/useCollaboration.ts`

---

## 6. Source File Index

Quick reference for key implementation files:

### API Routes
| Path | Purpose |
|------|---------|
| `/Users/adam/dev/composer/app/api/flows/route.ts` | Flow CRUD (list, create) |
| `/Users/adam/dev/composer/app/api/flows/[id]/route.ts` | Flow CRUD (get, update, delete) |
| `/Users/adam/dev/composer/app/api/flows/[id]/publish/route.ts` | Publishing & sharing |
| `/Users/adam/dev/composer/app/api/live/[token]/route.ts` | Live flow access |
| `/Users/adam/dev/composer/app/api/live/[token]/execute/route.ts` | Live execution |
| `/Users/adam/dev/composer/app/api/execute/route.ts` | Node execution engine |
| `/Users/adam/dev/composer/app/api/user/keys/route.ts` | API key storage |
| `/Users/adam/dev/composer/app/api/autopilot/route.ts` | AI flow generation |
| `/Users/adam/dev/composer/app/api/mcp/route.ts` | MCP JSON-RPC server |
| `/Users/adam/dev/composer/app/api/realtime/session/route.ts` | Voice session tokens |

### Core Libraries
| Path | Purpose |
|------|---------|
| `/Users/adam/dev/composer/lib/supabase/client.ts` | Browser Supabase client |
| `/Users/adam/dev/composer/lib/supabase/server.ts` | Server Supabase client |
| `/Users/adam/dev/composer/lib/supabase/service.ts` | Service role client (admin) |
| `/Users/adam/dev/composer/lib/auth/context.tsx` | Auth provider & hooks |
| `/Users/adam/dev/composer/lib/api-keys/context.tsx` | API key management |
| `/Users/adam/dev/composer/lib/encryption.ts` | AES-256-GCM encryption |
| `/Users/adam/dev/composer/lib/flows/api.ts` | Flow API client |
| `/Users/adam/dev/composer/lib/flows/types.ts` | Flow database types |

### Execution Engine
| Path | Purpose |
|------|---------|
| `/Users/adam/dev/composer/lib/execution/engine.ts` | Graph traversal orchestrator |
| `/Users/adam/dev/composer/lib/execution/executor-registry.ts` | Executor lookup |
| `/Users/adam/dev/composer/lib/execution/executors/` | Per-node-type executors |
| `/Users/adam/dev/composer/lib/execution/cache/` | Incremental caching |
| `/Users/adam/dev/composer/lib/execution/types.ts` | Execution types |

### Collaboration
| Path | Purpose |
|------|---------|
| `/Users/adam/dev/composer/lib/hooks/useCollaboration.ts` | Realtime sync hook |
| `/Users/adam/dev/composer/lib/hooks/usePerfectCursor.ts` | Cursor interpolation |
| `/Users/adam/dev/composer/lib/hooks/useRealtimeSession.ts` | Voice session hook |

### Types
| Path | Purpose |
|------|---------|
| `/Users/adam/dev/composer/types/flow.ts` | Node/edge type definitions |
| `/Users/adam/dev/composer/lib/flow-storage/types.ts` | SavedFlow interface |
| `/Users/adam/dev/composer/lib/mcp/types.ts` | MCP job/output types |
| `/Users/adam/dev/composer/lib/autopilot/types.ts` | Autopilot action types |

### Configuration
| Path | Purpose |
|------|---------|
| `/Users/adam/dev/composer/lib/providers.ts` | AI provider/model config |
| `/Users/adam/dev/composer/docs/AI_MODELS.md` | Authoritative model list |

---

## Environment Variables

Required for full functionality:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations |
| `ENCRYPTION_KEY` | API key encryption (32-byte hex) |
| `OPENAI_API_KEY` | OpenAI (dev mode) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google (dev mode) |
| `ANTHROPIC_API_KEY` | Anthropic (dev mode) |

---

## Notes for Native Implementation

1. **Supabase Swift SDK**: Use `supabase-swift` for auth, database, and realtime
2. **Streaming**: Parse NDJSON for execution responses
3. **WebRTC**: Use native WebRTC for realtime voice (ephemeral token from API)
4. **Caching**: Consider Core Data or SQLite for offline flow storage
5. **Share URLs**: Universal links to `composer.design/f/[liveId]/[token]`
