# Avy

A visual workflow builder for creating AI agent pipelines using drag-and-drop nodes.

## Features

- **3D Animated Logo**: Fluid sphere logo with rainbow shader effects and liquid deformation
- **Visual Flow Editor**: Build AI workflows by connecting nodes in a React Flow canvas
- **Origami-Style Controls**: Drag to select multiple nodes, hold spacebar to pan
- **Node Types**:
  - **Input**: Entry point that receives user input
  - **Prompt**: Execute LLM prompts with dual inputs (user prompt + system instructions) and multi-provider support
  - **Image**: AI image generation with OpenAI and Google Gemini
  - **Output**: Exit point that displays results in the responses sidebar
- **Smart Input Fields**: Textareas disable with "Using connected input" when handles are wired
- **Multi-Provider Support**: Choose from OpenAI, Google Gemini, or Anthropic Claude models
- **OpenAI-Specific Options**: Verbosity control (low/medium/high) and thinking mode for supported models
- **Streaming Responses**: See AI responses and images appear in real-time
- **Resizable Responses Sidebar**: Drag-to-resize sidebar shows output node results as they stream
- **Parallel Execution**: Branches execute independently, responses appear as each completes
- **Color-Coded Edges**: Visual data flow with colored connections (cyan=string, purple=image, amber=response)
- **Smart Port Labels**: Color-coded input/output handles with labels that highlight during connections
- **Editable Labels**: Click any node title to rename it inline
- **Execution Tracking**: Visual feedback showing node execution status (running/success/error)
- **Selection Feedback**: Selected nodes show animated yellow glow
- **AI Autopilot**: Natural language flow editing - describe changes and Claude builds them
  - Add, connect, and insert nodes between existing ones
  - Model selector (Sonnet 4.5 / Opus 4.5)
  - Auto-apply with undo support
  - Suggested prompts for quick starts

### Supported Models

**Text Models:**
| Provider | Models |
|----------|--------|
| OpenAI | GPT-5, GPT-5 Mini, GPT-5 Nano |
| Google | Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.0 Flash |
| Anthropic | Claude Sonnet 4.5, Claude 3.5 Haiku |

**Image Models:**
| Provider | Models |
|----------|--------|
| OpenAI | GPT-5 (streaming partial images) |
| Google | Gemini 2.5 Flash, Gemini 3 Pro |

## Getting Started

### Prerequisites

- Node.js 18+
- API key(s) for the providers you want to use

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file with API keys for the providers you want to use:

```
OPENAI_API_KEY=your_openai_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Development

```bash
npm run dev
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

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework
- [React Flow](https://reactflow.dev/) - Node-based flow editor
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - 3D WebGL rendering for logo
- [Vercel AI SDK](https://sdk.vercel.ai/) - Streaming LLM responses
- [OpenAI SDK](https://platform.openai.com/docs/libraries) - Image generation with streaming
- [Tailwind CSS v4](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [AI Elements](https://registry.ai-sdk.dev/) - AI SDK component registry
