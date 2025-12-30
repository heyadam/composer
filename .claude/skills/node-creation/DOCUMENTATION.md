# Step 8: Documentation

Add user-facing documentation for your node to the Nextra docs site.

> **Tip**: For detailed guidance on Nextra docs, MDX syntax, and common issues, invoke the `/docs` skill which covers the full documentation system.

## When to Write Documentation

All new nodes should have documentation. This helps users understand:
- What the node does
- How to configure it
- What ports it has and how to connect them

## File Structure

Documentation lives in `app/docs/nodes/`. Create a new folder for your node:

```
app/docs/nodes/
├── _meta.js              # Navigation (update this)
├── page.mdx              # Nodes Overview
└── your-node-type/
    └── page.mdx          # Your node's documentation
```

## Create Documentation Page

### 1. Create the folder and page

```bash
mkdir -p app/docs/nodes/your-node-type
```

Create `app/docs/nodes/your-node-type/page.mdx`:

```mdx
# Your Node Title

Brief one-line description of what this node does.

## Overview

Explain what the node does in 2-3 sentences. When would someone use this node? What problem does it solve?

## Ports

| Port | Type | Direction | Description |
|------|------|-----------|-------------|
| Input Name | String (cyan) | In | What this input accepts |
| Output Name | Response (amber) | Out | What this output produces |
| Done | Pulse (orange) | Out | Fires when processing completes |

## Configuration

Describe any configuration options:

- **Option 1**: What it does
- **Option 2**: What it does

## Usage Tips

- Tip 1 about using the node effectively
- Tip 2 about common patterns
```

### 2. Update the navigation

Edit `app/docs/nodes/_meta.js` to add your node:

```javascript
export default {
  index: "Overview",
  "-- Input Nodes": {
    type: "separator",
    title: "Input Nodes",
  },
  // ... existing input nodes ...
  "-- Processing Nodes": {
    type: "separator",
    title: "Processing Nodes",
  },
  // ... existing processing nodes ...
  "your-node-type": "Your Node Title",  // Add in the right category
  // ... rest of the file ...
};
```

**Important**: Add your node entry in the correct category section:
- Input nodes → after `"-- Input Nodes"` separator
- Processing nodes → after `"-- Processing Nodes"` separator
- Output nodes → after `"-- Output Nodes"` separator
- Annotation → after `"-- Annotation"` separator

## Documentation Patterns

### Port Type Colors

Use these color descriptions in the Ports table:

| Data Type | Color Name | Example |
|-----------|------------|---------|
| string | cyan | `String (cyan)` |
| image | purple | `Image (purple)` |
| response | amber | `Response (amber)` |
| audio | emerald | `Audio (emerald)` |
| boolean | rose | `Boolean (rose)` |
| pulse | orange | `Pulse (orange)` |

### Input Nodes

For input nodes, emphasize:
- What type of data they provide
- How users enter or upload data
- Any file type restrictions

### Processing Nodes

For AI processing nodes, include:
- Provider and model options
- Any provider-specific settings
- Vision/multimodal capabilities (if applicable)
- Streaming behavior

### Output Nodes

For output nodes, describe:
- What types of content they can display
- How the output is rendered
- Any formatting behavior

## Documentation Checklist

- [ ] Created `app/docs/nodes/your-node-type/page.mdx`
- [ ] Added entry to `app/docs/nodes/_meta.js`
- [ ] Entry is in the correct category section
- [ ] Ports table includes all inputs and outputs
- [ ] Port colors match actual data types
- [ ] Configuration section covers all options
- [ ] Verified docs render: `npm run dev` then visit `/docs/nodes/your-node-type`

## Example: Simple Input Node

```mdx
# Text Input

Entry point for text data in your workflow.

## Overview

The Text Input node provides a text area where you can enter content that flows to connected nodes. Use this as the starting point for text-based workflows.

## Ports

| Port | Type | Direction | Description |
|------|------|-----------|-------------|
| Output | String (cyan) | Out | The text content entered in the node |

## Tips

- Press Shift+Enter for line breaks within the text area
- Connect to Text Generation nodes for AI processing
- Connect to Preview Output to display the text
```

## Example: AI Processing Node

```mdx
# Text Generation

Generate text using large language models from multiple providers.

## Overview

The Text Generation node sends prompts to AI models and streams back responses. It supports OpenAI, Google Gemini, and Anthropic Claude models.

## Ports

| Port | Type | Direction | Description |
|------|------|-----------|-------------|
| Prompt | String (cyan) | In | User message/prompt |
| System | String (cyan) | In | System instructions |
| Image | Image (purple) | In | Image for vision prompts |
| Output | Response (amber) | Out | Streaming AI response |
| Done | Pulse (orange) | Out | Fires when generation completes |

## Configuration

### Provider & Model

Select your AI provider and model:

- **OpenAI**: GPT-5.2, GPT-5-mini, GPT-5-nano
- **Google**: Gemini 3 Pro, Gemini 3 Flash
- **Anthropic**: Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 4.5

## Inline Inputs

If a port isn't connected, you can enter text directly in the node:
- **User prompt** field for the prompt input
- **System instructions** field for system input

## Streaming

Responses stream in real-time. Connected Preview Output nodes show the response as it generates.
```

## See Also

For more detailed documentation guidance, invoke the `/docs` skill:

| Guide | Covers |
|-------|--------|
| `PAGES.md` | Creating and organizing doc pages, navigation setup |
| `MDX.md` | MDX syntax, components, and conventions |
| `ISSUES.md` | Common errors (hydration, build failures) and fixes |
