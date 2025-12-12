# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

## Environment Setup

Requires API keys for the AI providers you want to use:
- `OPENAI_API_KEY` - For OpenAI models (GPT-5, GPT-5 Mini, GPT-5 Nano)
- `GOOGLE_GENERATIVE_AI_API_KEY` - For Google Gemini models
- `ANTHROPIC_API_KEY` - For Anthropic Claude models

## Architecture Overview

This is an AI agent workflow builder using Next.js 16 App Router with React Flow for visual flow editing.

### Core Components

**Flow Editor** (`components/Flow/AgentFlow.tsx`): Main visual editor using @xyflow/react. Handles drag-and-drop node creation, edge connections, and flow execution controls.

**Node Types** (`components/Flow/nodes/`): Three custom node components with editable labels:
- `InputNode`: Entry point, receives user input
- `PromptNode`: LLM prompt execution with multi-provider support
- `OutputNode`: Exit point, displays final result and sends to preview

**Provider Configuration** (`lib/providers.ts`): Centralized config for AI providers and models:
- OpenAI: GPT-5, GPT-5 Mini, GPT-5 Nano (with verbosity and thinking options)
- Google: Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.0 Flash
- Anthropic: Claude Sonnet 4.5, Claude 3.5 Haiku

**NodeFrame** (`components/Flow/nodes/NodeFrame.tsx`): Shared wrapper for all nodes providing consistent styling, status badges, and inline title editing.

**NodeStatusBadge** (`components/Flow/nodes/NodeStatusBadge.tsx`): Visual indicator for node execution status (running/success/error).

**Preview Modal** (`components/Flow/PreviewModal/`): Floating preview window that displays output node results:
- `PreviewModal.tsx`: Main container with drag/resize functionality
- `PreviewHeader.tsx`: Title bar with close button
- `PreviewContent.tsx`: Scrollable content area
- `PreviewEntry.tsx`: Individual output entry display
- Always visible in top-right corner
- Draggable and resizable with session persistence
- Auto-grows with content, scrolls when exceeding max height
- Streams responses in real-time as they generate

**Execution Engine** (`lib/execution/engine.ts`): Recursive graph traversal that:
1. Finds input node as start
2. Executes parallel branches independently (responses appear as each completes)
3. Tracks execution state (running/success/error) per node

**Execution Types** (`lib/execution/types.ts`): Type definitions for the execution engine.

**Node Sidebar** (`components/Flow/NodeSidebar.tsx`): Collapsible node palette triggered by "Add Node" button. Nodes are drag-and-drop onto canvas.

**Example Flow** (`lib/example-flow.ts`): Default flow configuration loaded on startup.

**API Route** (`app/api/execute/route.ts`): Server-side execution handler for prompt nodes. Uses Vercel AI SDK with `streamText` for real-time streaming responses. Supports OpenAI, Google, and Anthropic providers with provider-specific options (verbosity, thinking).

### Type System

Flow types in `types/flow.ts` define node data interfaces with execution state tracking (`ExecutionStatus`, `executionOutput`, `executionError`).

### UI Components

Uses shadcn/ui components in `components/ui/` with Tailwind CSS v4. Import alias `@/*` maps to project root.

**AI Elements**: Use the AI Elements MCP (`mcp__ai-elements__get_ai_elements_components` and `mcp__ai-elements__get_ai_elements_component`) to discover and add UI components. AI Elements registry is configured at `@ai-elements` for components from `https://registry.ai-sdk.dev/`.
