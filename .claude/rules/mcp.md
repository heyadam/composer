# MCP Server

Model Context Protocol server for programmatic flow execution from AI tools.

## Overview

Composer exposes an MCP server at `/api/mcp` that allows external tools (Claude Code, Cursor, etc.) to discover and execute flows programmatically. Uses JSON-RPC protocol over HTTP.

## Architecture

**API Route** (`app/api/mcp/route.ts`): JSON-RPC endpoint handling MCP protocol:
- `initialize`: Returns server capabilities
- `tools/list`: Returns available tools
- `tools/call`: Executes tool by name
- GET endpoint for health check and server info
- Uses `after()` for background execution to keep serverless function alive

**Tools Module** (`lib/mcp/tools.ts`): Tool implementations:
- `getFlowInfo(token)`: Discover flow metadata, inputs, and outputs
- `runFlow(token, inputs)`: Start async execution, returns job ID
- `getRunStatus(jobId, token?)`: Poll for job status and results

**Job Store** (`lib/mcp/job-store.ts`): In-memory job tracking with LRU eviction:
- TTL: 1 hour (jobs expire after)
- Max jobs: 10,000
- Cleanup cron: hourly via `/api/mcp/cleanup`
- States: `pending` → `running` → `completed` | `failed`

**Types** (`lib/mcp/types.ts`): TypeScript interfaces for jobs, flow info, and results.

**Output Parser** (`lib/mcp/output-parser.ts`): Transforms raw execution outputs to structured format with explicit type information.

## MCP Tools

| Tool | Description |
|------|-------------|
| `get_flow_info` | Returns flow name, description, owner-funded status, input nodes, output nodes |
| `run_flow` | Creates job, validates rate limits, starts background execution |
| `get_run_status` | Returns job status, timestamps, outputs/errors when complete |

## Structured Output Format

Outputs are returned as structured objects with explicit type information:

```typescript
interface StructuredOutput {
  type: "text" | "image" | "audio" | "code";
  value: string;       // text content or base64-encoded binary
  mimeType?: string;   // for image/audio (e.g., "image/png", "audio/webm")
}
```

**Example response from `get_run_status`:**
```json
{
  "job_id": "job_abc123...",
  "status": "completed",
  "outputs": {
    "My Image": {
      "type": "image",
      "value": "iVBORw0KGgo...",
      "mimeType": "image/png"
    },
    "Text Result": {
      "type": "text",
      "value": "Hello world"
    }
  }
}
```

**Output Types:**
- `text`: Plain text output
- `image`: Base64-encoded image (PNG, JPEG, WebP, GIF)
- `audio`: Base64-encoded audio (WebM, MP4)
- `code`: Generated React component code (`mimeType: "text/jsx"`)

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
- Max output size: 5MB (supports larger images)

**Owner-Funded Execution**: Required for MCP execution. Flow owner's API keys are decrypted server-side using `ENCRYPTION_KEY` env var.

## API Routes

- `POST /api/mcp`: JSON-RPC endpoint
- `GET /api/mcp`: Health check, returns server info and tool list
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
- `output-parser.test.ts`: Structured output transformation tests

Run with `npm test`.
