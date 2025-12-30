# MDX Conventions

Syntax and patterns for writing Composer documentation in MDX.

## Headings

```mdx
# Page Title (H1)

Only one H1 per page - this becomes the page title.

## Main Section (H2)

Major sections of the page.

### Subsection (H3)

Subdivisions within a section.

#### Minor Heading (H4)

Use sparingly for fine-grained structure.
```

**Guidelines:**
- One `#` (H1) per page
- Use `##` (H2) for major sections
- Don't skip levels (no H2 → H4)

## Code Blocks

### Inline Code

```mdx
Use `backticks` for inline code like `npm run dev` or `page.mdx`.
```

### Fenced Code Blocks

Always specify the language for syntax highlighting:

````mdx
```typescript
const greeting = "Hello, world!";
```
````

**Supported languages:** `typescript`, `javascript`, `json`, `bash`, `tsx`, `jsx`, `css`, `mdx`, `sql`

### Code Block with Title

````mdx
```typescript title="lib/example.ts"
export function example() {
  return "Hello";
}
```
````

### Highlighting Lines

````mdx
```typescript {2,4-6}
const a = 1;
const b = 2;  // highlighted
const c = 3;
const d = 4;  // highlighted
const e = 5;  // highlighted
const f = 6;  // highlighted
```
````

## Tables

```mdx
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |
```

**Tips:**
- Align pipes for readability (optional but nice)
- Use `|` at start and end of each row
- Header separator row is required

### Alignment

```mdx
| Left | Center | Right |
|:-----|:------:|------:|
| L    |   C    |     R |
```

## Links

### Internal Links

```mdx
See [Getting Started](/docs/getting-started) for setup instructions.

Learn about [Text Generation nodes](/docs/nodes/text-generation).
```

### External Links

```mdx
Visit [Composer](https://composer.design) to try it out.

See the [OpenAI documentation](https://platform.openai.com/docs).
```

### Anchor Links

```mdx
See [Configuration](#configuration) below.
```

## Lists

### Unordered Lists

```mdx
- First item
- Second item
  - Nested item
  - Another nested item
- Third item
```

### Ordered Lists

```mdx
1. First step
2. Second step
   1. Sub-step
   2. Another sub-step
3. Third step
```

### Task Lists

```mdx
- [ ] Incomplete task
- [x] Completed task
```

## Blockquotes

### Notes

```mdx
> **Note:** This is important information.
```

### Warnings

```mdx
> **Warning:** Be careful with this operation.
```

### Tips

```mdx
> **Tip:** This will save you time.
```

## Images

```mdx
![Alt text](/images/screenshot.png)
```

**Guidelines:**
- Store images in `public/images/docs/`
- Use descriptive alt text
- Optimize images before adding

## Frontmatter

MDX pages can have YAML frontmatter:

```mdx
---
title: Custom Page Title
description: Custom meta description for SEO
---

# Page Content
```

**Note:** In App Router, metadata is typically handled in `layout.tsx`, not frontmatter.

## JSX in MDX

You can use React components in MDX:

```mdx
import { Callout } from '@/components/Callout'

# Page Title

<Callout type="warning">
  This is a custom callout component.
</Callout>
```

**Guidelines:**
- Import at top of file
- Use for complex interactive elements
- Keep simple content as plain MDX

## Special Characters

### Escaping

```mdx
Use \` to show a literal backtick.

Use \* to show a literal asterisk.

Use \{ and \} for literal braces in JSX context.
```

### HTML Entities

```mdx
&mdash; for em-dash (—)
&ndash; for en-dash (–)
&hellip; for ellipsis (…)
&rarr; for right arrow (→)
```

## Best Practices

1. **Keep paragraphs short** - 2-3 sentences max
2. **Use lists** for steps or multiple items
3. **Use tables** for structured data
4. **Use code blocks** for all code, commands, and file paths
5. **Link liberally** to related documentation
6. **Be consistent** with terminology

## Content Guidelines

Follow the `/content-design` skill for:
- Capitalization rules
- Placeholder text patterns
- UI terminology
