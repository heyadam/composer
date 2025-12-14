# Content Design Standards

Guidelines for consistent UI text across the application.

## Capitalization

| Element | Style | Example |
|---------|-------|---------|
| Labels | Title Case | User Prompt, System Instructions |
| Placeholders | Sentence case | Enter prompt... |
| Buttons | Title Case | Save, Generate, Run |
| Descriptions | Sentence case | Generate text with AI |
| Tooltips | Title Case | Add Node, Settings |

## Placeholders

- Start with a verb
- Use sentence case
- End with `...`
- Keep concise (2-4 words)

```
✓ Enter text...
✓ Describe transformation...
✓ Enter name...

✗ Enter your input here...
✗ Type something
✗ e.g., 'make uppercase'
```

## Connection Status

Use single word when input is connected:

```
✓ Connected

✗ Using connected input
✗ Using connected image
```

## Descriptions

- Sentence case
- No trailing periods
- Brief and action-oriented

```
✓ Generate text with AI
✓ Custom code transformation
✓ Text entry point

✗ LLM text generation.
✗ Entry point for the flow
```

## Dialogs

- Title: Title Case
- Description: Sentence case, no trailing period
- Keep descriptions brief (one short sentence)

```
✓ Choose a name for your flow
✓ Add at least one API key to get started

✗ Enter a name for your flow. It will be saved as a JSON file.
✗ Configure at least 1 API key to use avy.
```

## Loading States

- Use verb + `...`
- Keep consistent across similar actions

```
✓ Generating...
✓ Processing...

✗ Generating image...
✗ Thinking...
```

## Tooltips

- Single word or two words max
- Title Case

```
✓ Clear
✓ Close
✓ Add Node

✗ Clear chat
✗ Close sidebar
```

## Option Labels

- Title Case
- No parenthetical explanations

```
✓ None
✓ Square
✓ Portrait

✗ 0 (None)
✗ Square (1:1)
```

## Node Naming

| Type | Label |
|------|-------|
| input | Text Input |
| image-input | Image Input |
| magic | Transform |
| prompt | Text Generation |
| image | Image Generation |
| output | Output |
