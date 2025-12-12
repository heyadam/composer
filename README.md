# Avy - AI Agent Workflow Builder

A visual workflow builder for creating AI agent pipelines using drag-and-drop nodes.

## Features

- **Visual Flow Editor**: Build AI workflows by connecting nodes in a React Flow canvas
- **Node Types**:
  - **Input**: Entry point that receives user input
  - **Prompt**: Execute LLM prompts with multi-provider support
  - **Output**: Exit point that displays results in the preview window
- **Multi-Provider Support**: Choose from OpenAI, Google Gemini, or Anthropic Claude models
- **OpenAI-Specific Options**: Verbosity control (low/medium/high) and thinking mode for supported models
- **Streaming Responses**: See AI responses appear word-by-word in real-time
- **Live Preview**: Floating preview modal shows output node results as they stream
- **Parallel Execution**: Branches execute independently, responses appear as each completes
- **Editable Labels**: Click any node title to rename it inline
- **Execution Tracking**: Visual feedback showing node execution status (running/success/error)

### Supported Models

| Provider | Models |
|----------|--------|
| OpenAI | GPT-5, GPT-5 Mini, GPT-5 Nano |
| Google | Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.0 Flash |
| Anthropic | Claude Sonnet 4.5, Claude 3.5 Haiku |

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file:

```
OPENAI_API_KEY=your_api_key_here
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the workflow builder.

## Usage

1. Click "Add Node" and drag nodes onto the canvas
2. Connect nodes by dragging from output handles to input handles
3. Configure node properties (prompts, models)
4. Enter input text in the top bar
5. Click "Run Flow" to execute the workflow
6. View results in the floating preview window

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework
- [React Flow](https://reactflow.dev/) - Node-based flow editor
- [Vercel AI SDK](https://sdk.vercel.ai/) - Streaming LLM responses
- [Tailwind CSS v4](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [AI Elements](https://registry.ai-sdk.dev/) - AI SDK component registry
