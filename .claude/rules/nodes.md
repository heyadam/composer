# Node Types

All node components are in `components/Flow/nodes/` with editable labels.

## Input Nodes

**InputNode** (type: `text-input`): Entry point, receives user input text.

**ImageInputNode** (type: `image-input`): Entry point for image upload.

**AudioInputNode** (type: `audio-input`): Entry point for audio recording:
- Real-time waveform visualization during recording
- Automatic recording start when flow executes (if connected)
- Uses pending-input-registry for async user input during execution
- Supports webm, mp4, and aac formats (browser-dependent)
- Outputs audio in `AudioEdgeData` format (base64 buffer with metadata)

## Processing Nodes

**PromptNode** (type: `text-generation`): LLM prompt execution with three inputs:
- User prompt
- System instructions
- Optional image for vision/multimodal
- Multi-provider support (OpenAI, Google, Anthropic)
- Auto-switches to vision-capable model when image is added
- Default: Google `gemini-3-flash-preview`

**ImageNode** (type: `image-generation`): AI image generation with three inputs:
- Prompt input - the subject/description of what to generate
- Style input - style instructions (e.g., "anime style", "oil painting")
- Image input - optional base image for image-to-image transformation
- OpenAI with streaming partial images
- Google Gemini
- Default: Google `gemini-2.5-flash-image` with 1:1 aspect ratio

**MagicNode** (type: `ai-logic`): Custom code transformation:
- Uses Claude Haiku-generated JavaScript
- Auto-generates code when transform input is connected at execution time
- Includes validation with test cases
- Collapsible code/eval views

**ReactComponentNode** (type: `react-component`): AI-generated React components rendered in sandboxed iframe:
- Component description input (prompt)
- Additional instructions input (system)
- Code output port (amber) - connects to preview-output Code input for website preview
- Multi-provider support (OpenAI, Google, Anthropic)

**AudioTranscriptionNode** (type: `audio-transcription`): Speech-to-text using OpenAI transcription:
- Models: `gpt-4o-transcribe` (default), `gpt-4o-mini-transcribe`
- Audio input port (required, emerald)
- Optional language input (ISO 639-1 codes: en, es, fr, etc.)
- Outputs transcribed text as string

**RealtimeNode** (type: `realtime-conversation`): Real-time voice conversation using OpenAI's Realtime API:
- Voice selection (10 voices: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar)
- VAD modes (semantic, server, manual PTT)
- Live transcript display
- Audio input/output ports
- Auto-starts session when flow executes if output is connected

## Utility Nodes

**StringCombineNode** (type: `string-combine`): Combines up to 4 string inputs into one output:
- Four string input ports (input1, input2, input3, input4)
- Configurable separator (default: none)
- Outputs combined string on "output" port
- Has "done" pulse output for execution chaining

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
