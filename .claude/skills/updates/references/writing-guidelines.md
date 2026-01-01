# Writing Guidelines for Update Announcements

Detailed copywriting guidance for creating polished, user-focused update announcements.

## Voice & Tone

### Senior Copywriter Mindset

Write as a senior copywriter at a design-forward tech company. The goal is to make technical features feel accessible and exciting.

**Core Principles:**
- Lead with user benefits, not technical implementation
- Active voice, present tense
- Concise but warm tone
- Avoid jargon - explain technical concepts simply
- Use "you" to address the user directly
- Bold feature names for scannability

### Examples of Good vs. Bad Copy

**Bad (technical focus):**
> We implemented an LRU cache with fingerprint-based invalidation for the execution engine.

**Good (user benefit focus):**
> Run your workflows faster - unchanged parts of your flow now skip re-execution automatically.

**Bad (passive, vague):**
> A new feature has been added that allows for voice input.

**Good (active, specific):**
> Talk to your workflows with the new Realtime Voice node - it listens, responds, and transcribes in real-time.

## Title Guidelines

**Length:** 3-8 words

**Style:**
- Clear, benefit-focused headline
- Active voice
- No periods at the end
- Capitalize major words (Title Case)

**Good titles:**
- "Real-time Voice Conversations"
- "Faster Image Generation"
- "Smarter Flow Execution"
- "Connect Any AI Model"

**Bad titles:**
- "New Feature Update" (too vague)
- "We added caching to the execution engine" (too technical)
- "Version 2.3.1 Release Notes" (not benefit-focused)

## Content Structure

### Standard Template

```markdown
# [Title]

[1-2 sentence intro explaining the value to users]

## What's new

- **[Feature name]** - [Brief description of what it does and why it matters]
- **[Feature name]** - [Brief description]

[Optional: Tips, getting started info, or call-to-action]
```

### Intro Paragraph

The intro should:
- Be 1-2 sentences maximum
- Immediately convey the main benefit
- Set context for the feature list

**Good intro:**
> Run your workflows faster with our new incremental caching system.

**Bad intro:**
> This release includes several improvements to the execution engine, including a new caching mechanism that stores intermediate results.

### Feature Bullets

Each bullet should follow this pattern:
- **Bold feature name** - What it does and why users care

Keep descriptions to 1-2 lines. If more explanation is needed, add a separate paragraph after the bullet list.

**Good bullets:**
- **Incremental caching** - Nodes remember their outputs, so unchanged parts of your flow skip re-execution
- **Cache badges** - See which nodes used cached results at a glance
- **One-click reset** - Clear all caches and start fresh when you need to

**Bad bullets:**
- **Caching** - We added caching (too vague)
- **Incremental caching using LRU with fingerprint-based invalidation** - Technical description that most users won't understand (too technical)

### Optional Sections

Add when helpful:

**Getting Started:**
> Toggle caching on any node using the new "Cacheable" switch in node settings.

**Tips:**
> Pro tip: Cache input nodes to avoid re-uploading images between runs.

**Call-to-action:**
> Try it out with the example flow in the Templates menu.

## Common Patterns

### Single Feature Updates

Focus deeply on one feature with more detail:

```markdown
# Real-time Voice Conversations

Have natural conversations with AI directly in your workflows.

## What's new

- **Realtime Voice Node** - Connect your microphone and speak naturally. The AI listens, responds, and transcribes everything in real-time.
- **10 voice options** - Choose from voices like Sage, Echo, and Coral to match your workflow's personality
- **Push-to-talk mode** - Control when the AI listens with manual activation

Connect a Realtime node to any text output to add voice interaction to your existing flows.
```

### Multiple Feature Updates

Keep each feature brief, focus on the highlights:

```markdown
# Flow Editing Improvements

Several quality-of-life improvements to make building flows faster.

## What's new

- **Keyboard shortcuts** - Press Cmd+Z to undo, Cmd+Shift+Z to redo
- **Comment nodes** - Add colored annotation boxes to organize your flows
- **Auto-layout** - New nodes automatically avoid overlapping with existing ones
```

### Bug Fix / Performance Updates

Still lead with benefit, acknowledge the fix:

```markdown
# Smoother Streaming

Text generation now streams more reliably across all providers.

## What's fixed

- **Consistent streaming** - All AI models now stream responses at a steady pace
- **Better error recovery** - Interrupted generations now resume cleanly
```

## Writing Checklist

Before finalizing an update:

- [ ] Title is 3-8 words and benefit-focused
- [ ] Intro is 1-2 sentences
- [ ] Feature names are bolded
- [ ] Descriptions focus on user benefits
- [ ] No unexplained jargon
- [ ] Active voice throughout
- [ ] Clear call-to-action or next step (if applicable)

## Anti-Patterns to Avoid

1. **Starting with "We"** - Focus on what users get, not what the team did
2. **Version numbers** - Users don't care about v2.3.1
3. **Technical implementation details** - Save for changelogs
4. **Long paragraphs** - Use bullets for scannability
5. **Generic titles** - "New Features" tells users nothing
6. **Passive voice** - "A feature was added" → "Add images with drag-and-drop"
