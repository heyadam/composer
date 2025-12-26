# AI Models Reference

Quick reference for AI model IDs used in API calls. Only use these models, don't call anything else.

## OpenAI

### GPT-5 Family (Latest)
| Model ID | Best For |
|----------|----------|
| `gpt-5.2` | Complex reasoning, broad knowledge, multi-step agentic tasks |
| `gpt-5-mini` | Cost-optimized reasoning and chat |
| `gpt-5-nano` | High-throughput, simple tasks, classification |

### Image Generation
| Model ID | Description |
|----------|-------------|
| `gpt-image-1` | GPT Image - best instruction following, text rendering |
| `dall-e-3` | Higher quality, larger resolutions |
| `dall-e-2` | Lower cost, supports edits/variations |

### Transcription
| Model ID | Description |
|----------|-------------|
| `gpt-4o-transcribe` | High quality transcription (default) |
| `gpt-4o-mini-transcribe` | Cost-optimized transcription |


---

## Anthropic (Claude)

### Claude 4 Family (Latest)
| Model ID | Description |
|----------|-------------|
| `claude-opus-4-5` | Most capable model |
| `claude-sonnet-4-5` | Best for agents and coding |
| `claude-haiku-4-5` | Fast, cost-effective (used by AI Logic node) |


---

## Google (Gemini)

### Gemini 3 (Latest)
| Model ID | Description |
|----------|-------------|
| `gemini-3-pro-preview` | Complex tasks, advanced reasoning |
| `gemini-3-pro-image-preview` | Image generation, multimodal tasks |
| `gemini-3-flash-preview` | Cost-optimized reasoning and chat |


### Native Image Generation (Gemini)
| Model ID | Description |
|----------|-------------|
| `gemini-2.5-flash-image` | Fast image generation (1024px) |
| `gemini-3-pro-image-preview` | High quality image generation (up to 4096px) |

### Image Generation (Imagen)
| Model ID | Description |
|----------|-------------|
| `imagen-4.0-generate-001` | Standard quality |
| `imagen-4.0-ultra-generate-001` | Ultra quality |
| `imagen-4.0-fast-generate-001` | Fast generation |
| `imagen-3.0-generate-002` | Previous generation |
