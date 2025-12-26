# Composer

A visual workflow builder for creating AI agent pipelines using drag-and-drop nodes.

**Live at [composer.design](https://composer.design)**

## Features

- **Desktop Only**: Optimized for larger screens; mobile devices show a branded blocker page with animated 3D orb
- **3D Animated Logo**: Fluid sphere logo with rainbow shader effects and liquid deformation
- **Visual Flow Editor**: Build AI workflows by connecting nodes in a React Flow canvas
- **Origami-Style Controls**: Drag to pan, hold spacebar + drag for selection box
- **Node Types**:
  - **Text Input**: Entry point that receives user text input
  - **Image Input**: Entry point for image uploads
  - **Text Generation**: Execute LLM prompts with dual inputs (user prompt + system instructions) and multi-provider support
  - **Image Generation**: AI image generation with OpenAI and Google Gemini
  - **AI Logic**: Custom code transformations using Claude-generated JavaScript with auto-generation and validation
  - **React Component**: AI-generated React components rendered in sandboxed iframe
  - **Comment**: Resizable annotation boxes with color themes and AI-generated suggestions
  - **Preview Output**: Exit point that displays results in the responses sidebar
- **Smart Input Fields**: Textareas disable with "Using connected input" when handles are wired
- **Multi-Provider Support**: Choose from OpenAI, Google Gemini, or Anthropic Claude models
- **OpenAI-Specific Options**: Verbosity control (low/medium/high) and thinking mode for supported models
- **Streaming Responses**: See AI responses and images appear in real-time
- **Resizable Sidebars**: Drag-to-resize sidebars with spring animations using motion.dev
- **Parallel Execution**: Branches execute independently, responses appear as each completes
- **Color-Coded Edges**: Visual data flow with colored connections (cyan=string, purple=image, amber=response)
- **Smart Port Labels**: Color-coded input/output handles with labels that highlight during connections
- **Editable Labels**: Click any node title to rename it inline
- **Execution Tracking**: Visual feedback showing node execution status (running/success/error)
- **Selection Feedback**: Selected nodes show animated yellow glow
- **Cloud Storage**: Save and load flows to the cloud with Supabase (requires sign-in)
- **My Flows Browser**: Browse, load, and delete saved cloud flows
- **Real-time Collaboration**: Google Docs-style live editing with multiple users
  - Publish flows with shareable links
  - See collaborator cursors in real-time with smooth animations
  - Avatar stack shows who's online
  - Crown icon indicates flow owner
  - Owner-funded execution lets collaborators run flows using owner's API keys
  - Rate limiting (10 runs/min, 100 runs/day) for shared key usage
- **AI Autopilot**: Natural language flow editing - describe changes and Claude builds them
  - Add, remove, connect, and insert nodes between existing ones
  - Collapsible JSON preview with syntax highlighting and auto-scroll during streaming
  - **Two modes**: Execute (immediate changes) or Plan (shows step-by-step plan for approval)
  - **Model selection**: Claude Sonnet 4.5 (default) or Claude Opus 4.5
  - **Extended thinking**: Toggle for Claude's extended thinking capability
  - LLM-based validation using Claude Haiku 4.5 with auto-retry on failure
  - Auto-apply with full undo support (restores removed nodes/edges)
  - Dynamic LLM-generated prompt suggestions based on current flow
  - Shimmer loading effects during AI operations
- **Welcome Experience**: Three-step onboarding for new users
  - Interactive demo flow that auto-executes to show capabilities
  - 3D animated hero with provider icons flowing into Composer
  - Google sign-in or continue without account
  - Guided API keys setup with skip options
- **Templates Modal**: Quick-start dialog when creating new flows
  - AI prompt input with mode/model/thinking options
  - Three pre-built templates: Story & Image Gen, Basic Text Gen, Image to Image
  - "Don't show again" option
- **Undo/Redo**: Full undo/redo support for flow changes
  - Keyboard shortcuts: Cmd+Z / Ctrl+Z (undo), Shift+Cmd+Z / Ctrl+Y (redo)
  - Maintains up to 50 history snapshots
- **Debug View**: Detailed request/response inspection in sidebar
  - Collapsible sections for prompts, responses, and raw data
  - Copy-to-clipboard for debugging

### Supported Models

**Text Generation:**
| Provider | Models |
|----------|--------|
| OpenAI | GPT-5.2, GPT-5 Mini, GPT-5 Nano |
| Google | Gemini 3 Pro, Gemini 3 Flash (default) |
| Anthropic | Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 4.5 |

**Image Generation:**
| Provider | Models |
|----------|--------|
| OpenAI | GPT Image 1, DALL-E 3, DALL-E 2 |
| Google | Gemini 2.5 Flash Image (default), Gemini 3 Pro Image |

## Getting Started

### Prerequisites

- Node.js 24+
- API key(s) for the providers you want to use

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file with Supabase and provider API keys:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_publishable_or_anon_key
OPENAI_API_KEY=your_openai_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key
ANTHROPIC_API_KEY=your_anthropic_key
```

Enable Google OAuth in your Supabase project and add redirect URLs:

```
http://localhost:3000/auth/callback
https://your-domain.com/auth/callback
```

### Development

```bash
npm run dev      # Start development server
npm test         # Run unit tests (65 tests)
npm run build    # Production build
```

Open [http://localhost:3000](http://localhost:3000) to use the workflow builder.

## Usage

### Manual Flow Building
1. Click "Add Node" and drag nodes onto the canvas
2. Connect nodes by dragging from output handles to input handles
3. Configure node properties (prompts, models, image settings)
4. Enter input text in the Input node
5. Click "Run" in the responses sidebar to execute the workflow
6. View streaming results in the responses sidebar

### AI Autopilot
1. Click the Autopilot button (sparkles icon) to open the sidebar
2. Describe what you want in natural language (e.g., "Add a translator node between input and output")
3. Claude generates and auto-applies the changes
4. Use "Undo" to revert if needed

### Cloud Storage
1. Sign in with Google using the profile button in the header
2. Use Flow → Save to Cloud to save your current flow
3. Use Flow → My Flows to browse and load saved flows
4. Flows are stored securely in your Supabase account

### Real-time Collaboration
1. Save your flow to the cloud first
2. Click the Live button (globe icon) in the header
3. Enable "Owner-Funded Execution" if you want collaborators to use your API keys
4. Copy and share the link with collaborators
5. Collaborators see your cursor and edits in real-time
6. Click Unpublish to revoke access (auto-unpublishes when you leave)

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework
- [React Flow](https://reactflow.dev/) - Node-based flow editor
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - 3D WebGL rendering for logo
- [motion.dev](https://motion.dev/) - Spring-based animations for sidebars and UI transitions
- [Vercel AI SDK](https://sdk.vercel.ai/) - Streaming LLM responses
- [OpenAI SDK](https://platform.openai.com/docs/libraries) - Image generation with streaming
- [Supabase](https://supabase.com/) - Authentication, cloud storage, and real-time collaboration
- [perfect-cursors](https://github.com/steveruizok/perfect-cursors) - Smooth cursor animations for collaboration
- [Tailwind CSS v4](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [AI Elements](https://registry.ai-sdk.dev/) - AI SDK component registry
- [Vitest](https://vitest.dev/) - Unit testing framework

## Development

### Claude Code Skills

This project includes four Claude Code skills at `.claude/skills/`:

**Supabase** (`/supabase`) - Database development guide:
```
.claude/skills/supabase/
├── SKILL.md           # Router with quick reference
├── SQL_STYLE.md       # SQL naming and formatting
├── FUNCTIONS.md       # Database functions & triggers
├── MIGRATIONS.md      # Migration files & RLS setup
├── RLS.md             # Row Level Security policies
├── EDGE_FUNCTIONS.md  # Deno/TypeScript edge functions
└── REALTIME.md        # Broadcast, presence, triggers
```

**Node Creation** (`/node-creation`) - Step-by-step guide for creating new nodes:
```
.claude/skills/node-creation/
├── SKILL.md           # Router with workflow overview
├── TYPES.md           # Define node data interface and port schema
├── COMPONENT.md       # Create React component with NodeFrame
├── EXECUTION.md       # Add execution logic to engine.ts
├── AUTOPILOT.md       # Integrate with Autopilot system
├── SIDEBAR.md         # Register in sidebar and set defaults
├── VALIDATION.md      # Test and validate implementation
└── TEMPLATES.md       # Copy-paste templates for each node category
```

**Content Design** (`/content-design`) - UI text and content standards:
```
.claude/skills/content-design/
└── SKILL.md           # Capitalization, placeholders, tooltips, labels
```

**Gemini Agents** (`/gemini-agents`) - High-velocity parallel code changes:
```
.claude/skills/gemini-agents/
├── SKILL.md           # Router with workflow overview
├── AGENT_PROMPTS.md   # Template prompts for instructing agents
├── WORK_DIVISION.md   # Strategies for dividing work across agents
├── TASK_TYPES.md      # Task types suited for Gemini vs Claude
├── GEMINI_USAGE.md    # Gemini CLI command patterns
└── EXAMPLES.md        # Real-world usage examples
```
