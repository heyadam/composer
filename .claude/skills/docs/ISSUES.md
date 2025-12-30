# Common Issues

Troubleshooting guide for Nextra documentation with Next.js App Router.

## Hydration Errors

### `<head>` cannot be a child of `<body>`

**Error Message:**
```
In HTML, <head> cannot be a child of <body>.
This will cause a hydration error.
```

**Cause:** Using `<Head />` component from `nextra/components` in App Router layouts.

**Why it happens:** The `<Head>` component renders a literal `<head>` element, but in App Router the layout is already inside `<body>`. This creates invalid HTML.

**Fix:** Remove `<Head />` and use the `metadata` export instead.

```tsx
// ❌ DON'T - causes hydration error
import { Head } from "nextra/components";

export default function DocsLayout({ children }) {
  return (
    <>
      <Head />  {/* This renders <head> inside <body>! */}
      <Layout>{children}</Layout>
    </>
  );
}

// ✅ DO - use metadata export
export const metadata = {
  title: {
    default: "Composer Docs",
    template: "%s - Composer Docs",
  },
  description: "Documentation for Composer...",
};

export default function DocsLayout({ children }) {
  return (
    <Layout>{children}</Layout>
  );
}
```

**Files to check:** `app/docs/layout.tsx`

---

## Navigation Issues

### Page Not Appearing in Sidebar

**Symptoms:** New page exists at correct URL but doesn't show in navigation.

**Cause:** Missing entry in `_meta.js`.

**Fix:** Add the page to the appropriate `_meta.js`:

```js
// app/docs/_meta.js
export default {
  index: "Introduction",
  "getting-started": "Getting Started",
  nodes: "Nodes",
  "new-section": "New Section Title",  // Key must match directory name
};
```

**Common mistakes:**
- Key doesn't match directory name exactly
- Using spaces instead of hyphens
- Forgetting to add nested `_meta.js` for sections

### Wrong Navigation Order

**Fix:** Reorder entries in `_meta.js`. Order in object = order in sidebar.

---

## Build Errors

### `Cannot find module` for MDX imports

**Cause:** Path alias not working or wrong import path.

**Fix:** Use `@/` prefix for absolute imports:

```tsx
// ❌ Wrong
import { Component } from "../../components/Component";

// ✅ Correct
import { Component } from "@/components/Component";
```

### `Export 'metadata' is not defined`

**Cause:** Trying to export metadata from `.mdx` file.

**Fix:** Metadata exports only work in `.tsx` layout files. For MDX pages, use frontmatter:

```mdx
---
title: Page Title
description: Page description
---

# Page Content
```

---

## Layout Issues

### Sidebar Not Collapsing Properly

**Check:** `sidebar` prop in layout:

```tsx
<Layout
  sidebar={{ defaultMenuCollapseLevel: 1 }}
>
```

### Missing Styles

**Check:** CSS imports in layout:

```tsx
import "nextra-theme-docs/style.css";  // Base theme
import "./docs.css";                    // Custom overrides
```

---

## Content Issues

### Code Blocks Not Highlighting

**Fix:** Add language identifier:

````mdx
```json
{ "key": "value" }
```
````

Not:
````mdx
```
{ "key": "value" }
```
````

### Tables Not Rendering

**Fix:** Ensure proper spacing around pipes and hyphens:

```mdx
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

---

## Debugging Steps

1. **Check build output:** `npm run build` shows all routes
2. **Check console:** Look for hydration or React errors
3. **Verify file structure:** `ls -la app/docs/[section]/`
4. **Check `_meta.js`:** Ensure keys match directory names
5. **Clear cache:** Delete `.next/` and rebuild

## Prevention Checklist

Before committing docs changes:

- [ ] `npm run build` succeeds
- [ ] No console errors on page load
- [ ] Page appears in navigation
- [ ] All links work
- [ ] Code blocks have syntax highlighting
