# Sample Update: Incremental Caching

This example shows the expected output format for an update announcement.

## Filename

```
2026-01-15-143022.md
```

Format: `YYYY-MM-DD-HHMMSS.md` using current timestamp.

## Update Content

```markdown
# Smarter Flow Execution

Run your workflows faster with our new incremental caching system.

## What's new

- **Incremental caching** - Nodes remember their outputs, so unchanged parts of your flow skip re-execution
- **Cache badges** - See which nodes used cached results at a glance
- **One-click reset** - Clear all caches and start fresh when you need to

Toggle caching on any node using the new "Cacheable" switch in node settings.
```

## Manifest Entry

Add to the **beginning** of the array in `manifest.json`:

```json
{
  "id": "2026-01-15-143022",
  "title": "Smarter Flow Execution",
  "date": "2026-01-15T14:30:22Z"
}
```

## Another Example: Voice Feature

**Filename:** `2026-02-01-091500.md`

```markdown
# Real-time Voice Conversations

Have natural conversations with AI directly in your workflows.

## What's new

- **Realtime Voice Node** - Speak naturally and get AI responses in real-time
- **10 voice options** - Choose from Sage, Echo, Coral, and more
- **Live transcripts** - See the full conversation as it happens

Connect a Realtime node to add voice interaction to any flow.
```

**Manifest entry:**
```json
{
  "id": "2026-02-01-091500",
  "title": "Real-time Voice Conversations",
  "date": "2026-02-01T09:15:00Z"
}
```
