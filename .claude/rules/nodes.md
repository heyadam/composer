# Node Types

All node components are in `components/Flow/nodes/` with editable labels.

## Input Nodes

**InputNode** (type: `text-input`): Entry point, receives user input text.

**ImageInputNode** (type: `image-input`): Entry point for image upload.

## Processing Nodes

**PromptNode** (type: `text-generation`): LLM prompt execution with three inputs:
- User prompt
- System instructions
- Optional image for vision/multimodal
- Multi-provider support (OpenAI, Google, Anthropic)
- Auto-switches to vision-capable model when image is added
- Default: Google `gemini-3-flash-preview`

**ImageNode** (type: `image-generation`): AI image generation:
- OpenAI with streaming partial images
- Google Gemini
- Default: Google `gemini-2.5-flash-image` with 1:1 aspect ratio

**MagicNode** (type: `ai-logic`): Custom code transformation:
- Uses Claude Haiku-generated JavaScript
- Auto-generates code when transform input is connected at execution time
- Includes validation with test cases
- Collapsible code/eval views

**ReactComponentNode** (type: `react-component`): AI-generated React components rendered in sandboxed iframe.

**RealtimeNode** (type: `realtime-conversation`): Real-time voice conversation using OpenAI's Realtime API:
- Voice selection (10 voices: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar)
- VAD modes (semantic, server, manual PTT)
- Live transcript display
- Audio input/output ports
- Auto-starts session when flow executes if output is connected

## Annotation Nodes

**CommentNode** (type: `comment`): Resizable comment boxes for annotating flows:
- Color themes (gray, blue, green, yellow, purple, pink, orange)
- Editable title/description
- AI-generated suggestions

**Comment System**:
- `CommentEditContext.tsx`: React context for tracking user-edited comments to prevent AI overwrites
- `app/api/comment-suggest/route.ts`: AI-generates title and description for comment nodes based on nearby nodes
- `lib/hooks/useCommentSuggestions.ts`: Manages auto-generation of comment suggestions

## Output Nodes

**OutputNode** (type: `preview-output`): Exit point, displays final result and sends to preview.

## Default Flow

**Example Flow** (`lib/example-flow.ts`): Default flow configuration loaded on startup.
