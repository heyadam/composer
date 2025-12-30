# MCP Streaming with Resource Links

## Problem Statement

SSE streaming was disabled because large responses (2+ MB base64 images) caused context bloat in Cursor, leading to:
1. "Chat context summarized" mid-conversation
2. LLM losing track of job_id
3. Infinite loop calling `run_flow` repeatedly

## Solution: Resource Links Pattern

Instead of embedding large binary data inline, return `resource_link` objects that point to fetchable URLs. This keeps SSE streaming responses small while still providing access to full outputs.

### Before (Inline Base64)
```json
{
  "type": "image",
  "value": "iVBORw0KGgo... (2MB of base64)",
  "mimeType": "image/png"
}
```

### After (Resource Link)
```json
{
  "type": "resource_link",
  "uri": "https://composer.design/api/mcp/outputs/job_xxx/Anime",
  "name": "Anime.png",
  "mimeType": "image/png",
  "size_bytes": 1667072
}
```

## Implementation Plan

### Phase 1: Output Storage API

Create an endpoint to store and retrieve job outputs.

**New file: `app/api/mcp/outputs/[jobId]/[outputKey]/route.ts`**

```typescript
// GET /api/mcp/outputs/:jobId/:outputKey
// Returns the raw binary output (image, audio, etc.)
// Headers: Content-Type based on mimeType, Content-Disposition for download
```

**Changes to `lib/mcp/job-store.ts`:**
- Keep full outputs in database/memory (already done)
- Add method to retrieve single output by key

### Phase 2: Resource Link Response Format

**New type in `lib/mcp/types.ts`:**
```typescript
export interface ResourceLink {
  type: "resource_link";
  uri: string;
  name: string;
  mimeType: string;
  size_bytes: number;
  description?: string;
}

export type OutputContent = StructuredOutput | ResourceLink;
```

**Update `lib/mcp/tools.ts`:**
- Create `transformOutputsToResourceLinks()` function
- For binary outputs (image, audio), return ResourceLink
- For text/code outputs under threshold, return inline
- For text/code outputs over threshold, return ResourceLink

### Phase 3: Re-enable SSE Streaming

**Update `app/api/mcp/route.ts`:**
```typescript
// Re-enable SSE with resource links
const acceptsSSE = request.headers.get("Accept")?.includes("text/event-stream");
```

**Update streaming result format:**
- Progress events stay the same (small)
- Final result uses ResourceLinks for large outputs
- Total response size stays under 10KB

### Phase 4: Polling Mode Alignment

Update `getRunStatus()` to also use ResourceLinks:
- Consistent response format between SSE and polling
- Clients can fetch full data via resource URIs

## Response Size Targets

| Response Type | Target Size | Content |
|---------------|-------------|---------|
| `run_flow` (SSE disabled) | < 500 bytes | job_id, status, message |
| `run_flow` (SSE enabled) | < 10 KB | progress events + resource links |
| `get_run_status` (running) | < 500 bytes | status, message |
| `get_run_status` (completed) | < 2 KB | status + resource links |
| Output fetch | Full size | Raw binary data |

## API Endpoints (Final)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mcp` | POST | JSON-RPC endpoint (tools/call) |
| `/api/mcp` | GET | Health check |
| `/api/mcp/outputs/:jobId/:key` | GET | Fetch full output data |

## Security Considerations

1. **Output URLs are temporary** - Jobs expire after 1 hour, outputs expire with them
2. **No authentication on output URLs** - Anyone with the URL can fetch (job_id is unguessable)
3. **Rate limiting** - Output fetches count against rate limits
4. **Size limits** - Max 10MB per output (existing limit)

## Migration Path

1. ✅ Phase 0: SSE disabled, inline summaries for polling
2. ✅ Phase 1: Add output storage API (`app/api/mcp/outputs/[jobId]/[outputKey]/route.ts`)
3. ✅ Phase 2: Implement resource link format (`lib/mcp/types.ts`, `lib/mcp/output-parser.ts`)
4. ✅ Phase 3: Re-enable SSE with resource links (`app/api/mcp/route.ts`)
5. ✅ Phase 4: Update polling to use resource links (`lib/mcp/tools.ts`)

## Testing Checklist

- [ ] Output fetch API returns correct Content-Type
- [ ] Resource links include accurate size_bytes
- [ ] SSE streaming completes without context bloat
- [ ] Cursor successfully polls and fetches outputs
- [ ] Claude Code can use resource links
- [ ] Jobs/outputs expire correctly after 1 hour
- [ ] Rate limits work with output fetches

## Example Flow (After Implementation)

```
User: "Run the portrait flow with token abc123"

1. LLM calls run_flow(token: "abc123", inputs: {...})

2. SSE Stream:
   - event: progress (node 1 running)
   - event: progress (node 1 complete)
   - event: progress (node 2 running)
   - event: progress (node 2 complete)
   - event: result
     {
       "status": "completed",
       "outputs": {
         "Anime": {
           "type": "resource_link",
           "uri": "https://composer.design/api/mcp/outputs/job_xxx/Anime",
           "name": "Anime.png",
           "mimeType": "image/png",
           "size_bytes": 1667072
         }
       }
     }

3. LLM responds: "The flow completed! Generated a 1.6MB PNG image."
   (Context stays small, no summarization needed)

4. If user wants the image, LLM can provide the URL or
   a client-side component can fetch and display it.
```

## References

- [MCP Tools Specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [Handling large MCP output - GitHub Discussion](https://github.com/orgs/community/discussions/169224)
- [MCP Optimizations - Blockscout](https://www.blog.blockscout.com/mcp-explained-part-2-optimizations/)
