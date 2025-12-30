---
name: docs
description: Writing and updating Composer's Nextra documentation site. Use when creating docs pages, fixing doc issues, or updating user-facing documentation.
---

# Documentation Skill

Guide for maintaining Composer's documentation at `app/docs/` using Nextra with Next.js App Router.

## When to Use

- Creating new documentation pages
- Updating existing docs content
- Fixing documentation build errors
- Adding navigation entries

## Quick Reference

| Guide | Purpose |
|-------|---------|
| [PAGES.md](PAGES.md) | Creating and organizing doc pages |
| [ISSUES.md](ISSUES.md) | Common errors and how to fix them |
| [MDX.md](MDX.md) | MDX syntax and conventions |

## Directory Structure

```
app/docs/
├── _meta.js           # Navigation order and labels
├── layout.tsx         # Docs layout (navbar, footer, sidebar)
├── docs.css           # Custom styles
├── page.mdx           # Introduction (/docs)
├── getting-started/
│   └── page.mdx
├── nodes/
│   ├── _meta.js       # Section navigation
│   └── [node-type]/
│       └── page.mdx
└── [section]/
    └── page.mdx
```

## Key Files

| File | Purpose |
|------|---------|
| `app/docs/_meta.js` | Top-level navigation |
| `app/docs/layout.tsx` | Layout with navbar/footer/sidebar |
| `app/docs/nodes/_meta.js` | Nodes section navigation |

## Quick Start: Add a Page

1. `mkdir -p app/docs/[section-name]`
2. Create `page.mdx` with content
3. Add to `_meta.js`
4. Run `npm run build` to verify
