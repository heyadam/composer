---
name: updates
description: This skill should be used when the user asks to "create an update", "announce a feature", "write release notes", "add to the updates modal", "create an announcement", or mentions "/updates". Generates polished markdown announcements in /public/updates/ for the app's updates modal.
version: 1.0.0
---

# Updates Skill

Generate user-facing update announcements for the Composer updates modal. Updates appear in the bell icon notification system and inform users about new features, improvements, and fixes.

## Workflow Overview

1. **Gather context** - Determine what changes to announce
2. **Generate content** - Write polished, user-focused copy
3. **Create files** - Save update markdown and update manifest
4. **Confirm** - Show result to user

## Step 1: Gather Context

Present the user with context options using AskUserQuestion:

**Options:**
1. **Describe changes** - User provides description of what's new
2. **Auto-detect** - Analyze recent git history to identify changes

### Auto-detect Flow

When auto-detecting, run these commands to gather context:

```bash
git diff --stat HEAD~5
git log --oneline -10
```

Analyze the output to identify user-facing changes. Summarize findings and confirm with user before proceeding.

### Context Requirements

Before generating content, establish:
- What feature(s) or fix(es) to announce
- The primary user benefit
- Any tips or getting-started info to include

## Step 2: Generate Content

### Title

- 3-8 words, benefit-focused
- Active voice, Title Case
- Examples: "Real-time Voice Conversations", "Faster Image Generation"

### Structure

```markdown
# [Title]

[1-2 sentence intro - main user benefit]

## What's new

- **[Feature name]** - [What it does and why it matters]
- **[Feature name]** - [Brief description]

[Optional: Tips or getting-started info]
```

### Writing Principles

- Lead with user benefits, not technical details
- Active voice, present tense
- Bold feature names for scannability
- Explain technical concepts simply
- Address user directly with "you"

For detailed writing guidance, see `references/writing-guidelines.md`.

## Step 3: Create Files

### Generate Timestamp

Create filename using current timestamp:

```
YYYY-MM-DD-HHMMSS.md
```

Example: `2026-01-15-143022.md`

### Create Update File

Save markdown content to `/public/updates/[timestamp].md`

### Update Manifest

Edit `/public/updates/manifest.json`:
- Add new entry at the **beginning** of the array (newest first)
- Entry format:

```json
{
  "id": "YYYY-MM-DD-HHMMSS",
  "title": "[Title from update]",
  "date": "YYYY-MM-DDTHH:MM:SSZ"
}
```

## Step 4: Confirm Result

Display confirmation to user:

```
Update created!

File: /public/updates/[filename]
Title: [title]

---
[Show full markdown content]
---

The update will appear in the bell icon modal. Users who haven't seen it will see a notification badge.
```

## Best Practices

### Focus

Keep updates focused on one theme. For multiple unrelated features, consider separate updates.

### Consistency

Follow the content-design skill conventions for UI text consistency.

### Testing

After creating, verify by clicking the bell icon in the header.

## Additional Resources

### Reference Files

- **`references/writing-guidelines.md`** - Detailed copywriting guidance, voice & tone, examples of good vs. bad copy

### Example Files

- **`examples/sample-update.md`** - Complete examples showing expected output format

## Quick Reference

| Element | Guideline |
|---------|-----------|
| Title | 3-8 words, benefit-focused, Title Case |
| Intro | 1-2 sentences, main benefit |
| Bullets | Bold name + brief description |
| Filename | `YYYY-MM-DD-HHMMSS.md` |
| Manifest | Add to beginning of array |
