# Creating Documentation Pages

Step-by-step guide for adding new pages to Composer's docs.

## Checklist

- [ ] Create directory and `page.mdx`
- [ ] Add entry to `_meta.js`
- [ ] Add cross-links from related pages
- [ ] Run `npm run build` to verify
- [ ] Check page renders correctly

## Step 1: Create the Page

### Directory Structure

Each page lives in its own directory with a `page.mdx` file:

```bash
# Create directory
mkdir -p app/docs/my-section

# Create page file
touch app/docs/my-section/page.mdx
```

**URL mapping:**
- `app/docs/page.mdx` → `/docs`
- `app/docs/my-section/page.mdx` → `/docs/my-section`
- `app/docs/nodes/text-input/page.mdx` → `/docs/nodes/text-input`

### Page Template

```mdx
# Page Title

Introduction paragraph explaining what this page covers.

## Main Section

Content here...

### Subsection

More details...

## Another Section

Additional content...
```

## Step 2: Add Navigation

### Top-Level Pages

Edit `app/docs/_meta.js`:

```js
export default {
  index: "Introduction",
  "getting-started": "Getting Started",
  nodes: "Nodes",
  "my-section": "My Section Title",  // Add new entry
};
```

**Important:** The key must exactly match the directory name.

### Nested Section Pages

For pages within a section (like `nodes/`), create a `_meta.js` in that directory:

```js
// app/docs/nodes/_meta.js
export default {
  index: "Overview",
  "text-input": "Text Input",
  "text-generation": "Text Generation",
  "image-generation": "Image Generation",
  // ... more nodes
};
```

## Step 3: Cross-Link

### Link from Introduction

Update `app/docs/page.mdx` to include the new page in "Next Steps":

```mdx
## Next Steps

- [Getting Started](/docs/getting-started) - Create your first flow
- [Nodes](/docs/nodes) - Learn about all available node types
- [My Section](/docs/my-section) - Description of new section
```

### Link from Related Pages

Add contextual links in related documentation:

```mdx
For more details, see [My Section](/docs/my-section).
```

## Page Types

### Overview Pages

For section landing pages (like `/docs/nodes`):

```mdx
# Nodes

Composer provides several node types for building AI workflows.

## Input Nodes

- [Text Input](/docs/nodes/text-input) - Text entry point
- [Image Input](/docs/nodes/image-input) - Image uploads

## Processing Nodes

- [Text Generation](/docs/nodes/text-generation) - LLM prompts
```

### Detail Pages

For individual feature documentation:

```mdx
# Text Generation

Generate text using AI models from multiple providers.

## Configuration

| Setting | Description |
|---------|-------------|
| Provider | OpenAI, Google, or Anthropic |
| Model | Specific model to use |

## Usage

1. Connect an input to the prompt port
2. Select your provider and model
3. Run the flow

## Examples

### Basic Text Generation

Connect a Text Input to Text Generation to Preview Output.
```

### Node Documentation Pages

Follow the established pattern in `app/docs/nodes/`:

```mdx
# Node Name

Brief description of what the node does.

## Inputs

| Port | Type | Description |
|------|------|-------------|
| prompt | string | The prompt text |
| system | string | System instructions (optional) |

## Outputs

| Port | Type | Description |
|------|------|-------------|
| output | string | Generated response |
| done | pulse | Fires when complete |

## Configuration

### Provider & Model

Describe configuration options...

## Examples

### Example 1: Basic Usage

Description and visual if helpful...
```

## Verification

After creating a page:

```bash
# Build to verify
npm run build

# Check output includes your page
# Should see: ○ /docs/my-section

# Start dev server and verify
npm run dev
# Visit http://localhost:3000/docs/my-section
```

## Real Examples

Reference existing pages for patterns:

| Page | Good for |
|------|----------|
| `app/docs/page.mdx` | Introduction with feature list |
| `app/docs/getting-started/page.mdx` | Tutorial-style walkthrough |
| `app/docs/nodes/page.mdx` | Section overview with links |
| `app/docs/nodes/text-generation/page.mdx` | Detailed node documentation |
| `app/docs/mcp/page.mdx` | Integration/API documentation |
