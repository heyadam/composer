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

Requires `OPENAI_API_KEY` environment variable for flow execution (prompt and condition nodes use OpenAI API).

## Architecture Overview

This is an AI agent workflow builder using Next.js 16 App Router with React Flow for visual flow editing.

### Core Components

**Flow Editor** (`components/Flow/AgentFlow.tsx`): Main visual editor using @xyflow/react. Handles drag-and-drop node creation, edge connections, and flow execution controls.

**Node Types** (`components/Flow/nodes/`): Three custom node components with editable labels:
- `InputNode`: Entry point, receives user input
- `PromptNode`: LLM prompt execution (GPT-5.2, GPT-5 Mini, GPT-5 Nano)
- `ResponseNode` (OutputNode): Exit point, displays final result and sends to preview

**NodeFrame** (`components/Flow/nodes/NodeFrame.tsx`): Shared wrapper for all nodes providing consistent styling, status badges, and inline title editing.

**Preview Modal** (`components/Flow/PreviewModal/`): Floating preview window that displays Response node outputs:
- Always visible in top-right corner
- Draggable and resizable with session persistence
- Auto-grows with content, scrolls when exceeding max height
- Streams responses in real-time as they generate

**Execution Engine** (`lib/execution/engine.ts`): Recursive graph traversal that:
1. Finds input node as start
2. Executes parallel branches independently (responses appear as each completes)
3. Handles condition branching by following matching edges
4. Tracks execution state (running/success/error) per node

**Node Sidebar** (`components/Flow/NodeSidebar.tsx`): Collapsible node palette triggered by "Add Node" button. Nodes are drag-and-drop onto canvas.

**API Route** (`app/api/execute/route.ts`): Server-side execution handler for prompt nodes. Uses Vercel AI SDK with `streamText` for real-time streaming responses.

### Type System

Flow types in `types/flow.ts` define node data interfaces with execution state tracking (`ExecutionStatus`, `executionOutput`, `executionError`).

### UI Components

Uses shadcn/ui components in `components/ui/` with Tailwind CSS v4. Import alias `@/*` maps to project root.
