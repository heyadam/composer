# Composer

Visual workflow builder for AI agent pipelines. **[composer.design](https://composer.design)**

## Node Types

| Category | Node | Description |
|----------|------|-------------|
| **Input** | Text Input | Text entry point |
| | Image Input | Image upload |
| | Audio Input | Audio recording with waveform |
| **AI** | Text Generation | Multi-provider LLM prompts |
| | Image Generation | OpenAI + Google Gemini |
| | React Component | AI-generated components in sandbox |
| | Audio Transcription | Speech-to-text (OpenAI) |
| | Realtime Conversation | Voice chat (OpenAI Realtime API) |
| **Logic** | AI Logic | Claude-generated JavaScript transforms |
| | String Combine | Merge up to 4 strings |
| | Switch | Boolean routing |
| **Other** | Comment | Annotation boxes |
| | Preview Output | Results display |

## Supported Models

| Provider | Text | Image |
|----------|------|-------|
| **OpenAI** | GPT-5.2, GPT-5 Mini/Nano | GPT Image 1, DALL-E 2/3 |
| **Google** | Gemini 3 Pro/Flash ⭐ | Gemini 2.5 Flash Image ⭐ |
| **Anthropic** | Claude Opus/Sonnet/Haiku 4.5 | — |

⭐ = default

## Features

| Feature | Details |
|---------|---------|
| **Editor** | React Flow canvas, drag-to-pan, spacebar+drag for selection |
| **Edges** | Color-coded: cyan=string, purple=image, amber=response, emerald=audio |
| **Execution** | Parallel branches, streaming responses, status tracking |
| **Autopilot** | Natural language editing with Claude (Execute/Plan modes) |
| **Collaboration** | Real-time cursors, owner-funded execution, rate limiting |
| **Storage** | Cloud save/load with Supabase, local JSON export |
| **MCP Server** | Programmatic flow execution from Claude Code/Cursor |

## Quick Start

```bash
npm install && npm run dev
```

### Environment (`.env.local`)

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=...

# AI Providers (at least one)
OPENAI_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
ANTHROPIC_API_KEY=...
```

### Production (Vercel)

```bash
CRON_SECRET=...              # MCP cleanup cron
ENCRYPTION_KEY=...           # Owner-funded execution
SUPABASE_SERVICE_ROLE_KEY=...
```

## Usage

| Task | How |
|------|-----|
| **Build flow** | Add Node → drag to canvas → connect handles → Run |
| **Autopilot** | ✨ button → describe changes → auto-apply |
| **Collaborate** | Save → 🌐 Live → share link |
| **MCP** | Publish + enable owner-funded → configure client |

### MCP Configuration

```json
// ~/.claude/claude_mcp_settings.json
{
  "mcpServers": {
    "composer": { "type": "http", "url": "https://composer.design/api/mcp" }
  }
}
```

Tools: `get_flow_info`, `run_flow`, `get_run_status` · Rate limit: 10/min, 100/day

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16, React Flow, Tailwind v4 |
| AI | Vercel AI SDK, OpenAI SDK |
| Backend | Supabase (auth, storage, realtime) |
| UI | shadcn/ui, motion.dev, React Three Fiber |
| Testing | Vitest |

## Claude Code Skills

Six skills at `.claude/skills/`:

| Skill | Command | Purpose |
|-------|---------|---------|
| Supabase | `/supabase` | SQL, migrations, RLS, Edge Functions |
| Node Creation | `/node-creation` | 8-step guide for new nodes |
| Content Design | `/content-design` | UI text standards |
| Gemini Agents | `/gemini-agents` | Parallel code changes |
| Testing | `/testing` | Vitest patterns and mocking |
| Docs | `/docs` | Nextra documentation |
