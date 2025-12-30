# MCP Server

Model Context Protocol server for programmatic flow execution from AI tools.

## Overview

Composer exposes an MCP server at `/api/mcp` that allows external tools (Claude Code, Cursor, etc.) to discover and execute flows programmatically. Uses JSON-RPC protocol over HTTP with optional SSE streaming for real-time progress.

**Protocol Version**: 2025-03-26 | **Server Version**: 2.0.0

## Execution Modes

The server supports two execution modes:

1. **Polling** (default): Call `run_flow` to get `job_id`, then poll `get_run_status` until complete
2. **SSE Streaming**: Send `Accept: text/event-stream` header with `run_flow` to receive real-time progress events and final result in a single connection

## Architecture

**API Route** (`app/api/mcp/route.ts`): JSON-RPC endpoint handling MCP protocol:
- `initialize`: Returns server capabilities (protocol v2025-03-26)
- `tools/list`: Returns available tools
- `tools/call`: Executes tool by name
- SSE streaming for `run_flow` when `Accept: text/event-stream` header is present
- GET endpoint for health check and server info
- Uses `after()` for background execution to keep serverless function alive

**Tools Module** (`lib/mcp/tools.ts`): Tool implementations:
- `getFlowInfo(token)`: Discover flow metadata, inputs, and outputs
- `runFlow(token, inputs)`: Start async execution, returns job ID (or streams SSE)
- `getRunStatus(jobId, token?)`: Poll for job status and results
- `createFlowExecutionStream()`: Creates SSE stream for real-time execution

**SSE Module** (`lib/mcp/sse.ts`): Server-Sent Events formatting:
- `formatSSEEvent()`: Format JSON-RPC messages as SSE events
- `formatProgressEvent()`: Format `notifications/progress` events
- `formatResultEvent()`: Format final result as JSON-RPC response
- `formatErrorEvent()`: Format JSON-RPC errors
- `formatHeartbeat()`: Keep-alive comments (every 15 seconds)

**Job Store** (`lib/mcp/job-store.ts`): In-memory job tracking with LRU eviction:
- TTL: 1 hour (jobs expire after)
- Max jobs: 10,000
- Cleanup cron: hourly via `/api/mcp/cleanup`
- States: `pending` → `running` → `completed` | `failed`

**Types** (`lib/mcp/types.ts`): TypeScript interfaces for jobs, flow info, results, and streaming types.

**Output Parser** (`lib/mcp/output-parser.ts`): Transforms raw execution outputs to structured format with explicit type information. Converts binary outputs to resource links to prevent context bloat.

## MCP Tools

| Tool | Description |
|------|-------------|
| `get_flow_info` | Returns flow name, description, owner-funded status, input nodes, output nodes |
| `run_flow` | Creates job, validates rate limits, starts background execution |
| `get_run_status` | Returns job status, timestamps, outputs/errors when complete |

## Output Format

Outputs use a hybrid approach to prevent context bloat in MCP clients:

- **Binary data** (image, audio): Returned as **resource links** (fetchable URLs)
- **Small text** (<2KB): Returned **inline** as structured output
- **Large text** (>2KB): Returned as **resource links**

### Resource Links

Binary outputs are returned as resource links that can be fetched separately:

```typescript
interface ResourceLink {
  type: "resource_link";
  uri: string;           // Full URL to fetch the output
  name: string;          // Suggested filename (e.g., "My Image.png")
  mimeType: string;      // MIME type (e.g., "image/png")
  size_bytes: number;    // Size in bytes
  description?: string;  // Optional context
}
```

### Inline Outputs

Small text outputs are returned inline:

```typescript
interface StructuredOutput {
  type: "text" | "image" | "audio" | "code";
  value: string;       // text content or base64-encoded binary
  mimeType?: string;   // for image/audio (e.g., "image/png", "audio/webm")
}
```

### Example Response

```json
{
  "job_id": "job_abc123xyz45678",
  "status": "completed",
  "outputs": {
    "Generated Image": {
      "type": "resource_link",
      "uri": "https://composer.design/api/mcp/outputs/job_abc123xyz45678/Generated%20Image",
      "name": "Generated Image.png",
      "mimeType": "image/png",
      "size_bytes": 245760
    },
    "Summary": {
      "type": "text",
      "value": "Here is your summary..."
    }
  }
}
```

**Output Types:**
- `text`: Plain text output (inline if <2KB)
- `image`: Image data (always resource link)
- `audio`: Audio data (always resource link)
- `code`: React component code (inline if <2KB)

## Security & Rate Limiting

**Rate Limits** (enforced via Supabase RPCs):
- Per-minute: 10 runs per share token
- Per-day: 100 runs per flow

**Input Validation**:
- Token: 12 alphanumeric characters
- Job ID: `job_` prefix + 16 alphanumeric characters
- Inputs: Max 50 keys, 256 char key length, 100KB value length

**Execution Limits**:
- Timeout: 5 minutes
- Max output size: 10MB (supports larger images)

**Owner-Funded Execution**: Required for MCP execution. Flow owner's API keys are decrypted server-side using `ENCRYPTION_KEY` env var.

## SSE Streaming

When using `Accept: text/event-stream` with `run_flow`, the server returns an SSE stream with:

**Progress Events** (`notifications/progress`):
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "<request-id>",
    "progress": 2,
    "total": 5,
    "message": "Image Generation: success",
    "node": {
      "nodeId": "node-123",
      "nodeLabel": "Image Generation",
      "nodeType": "image-generation",
      "status": "success",
      "timestamp": "2025-01-15T10:30:00Z"
    }
  }
}
```

**Final Result**: JSON-RPC response with `status`, `outputs` (as resource links), `errors`, and `duration_ms`.

**Heartbeats**: Keep-alive comments (`: heartbeat`) every 15 seconds to prevent proxy timeouts.

## API Routes

- `POST /api/mcp`: JSON-RPC endpoint (supports SSE streaming with `Accept: text/event-stream`)
- `GET /api/mcp`: Health check, returns server info and tool list
- `GET /api/mcp/outputs/:jobId/:outputKey`: Fetch raw output data (binary or text)
- `POST /api/mcp/cleanup`: Cron endpoint for expired job cleanup (requires `CRON_SECRET`)

## Configuration

**Claude Code** (`~/.claude/claude_mcp_settings.json`):
```json
{
  "mcpServers": {
    "composer": {
      "type": "http",
      "url": "https://composer.design/api/mcp"
    }
  }
}
```

**Local Development** (`.mcp.json` in project root):
```json
{
  "mcpServers": {
    "composer-local": {
      "type": "http",
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

## Environment Variables

Required for MCP execution:
- `ENCRYPTION_KEY`: 32-byte hex string for API key decryption
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
- `CRON_SECRET`: Secures the cleanup cron endpoint (Vercel auto-sends as bearer token)
- `NEXT_PUBLIC_SITE_URL`: Base URL for resource links (e.g., `https://composer.design`)

## Database Dependencies

**Supabase RPCs** (used by MCP tools):
- `get_live_flow(p_share_token)`: Load flow data for execution
- `get_owner_keys_for_execution(p_share_token)`: Get encrypted owner API keys
- `check_minute_rate_limit(p_share_token, p_limit)`: Check per-minute rate limit
- `execute_live_flow_check(p_share_token, p_daily_limit)`: Check daily quota
- `log_execution(p_share_token)`: Record execution for rate limiting

## Tests

Unit tests in `lib/mcp/__tests__/`:
- `route.test.ts`: API route JSON-RPC protocol tests
- `tools.test.ts`: Tool implementation tests
- `output-parser.test.ts`: Structured output and resource link transformation tests
- `sse.test.ts`: SSE event formatting tests

Run with `npm test`.
