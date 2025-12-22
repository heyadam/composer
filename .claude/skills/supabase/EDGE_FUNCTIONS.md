# Edge Functions

Use `mcp__supabase__deploy_edge_function` to deploy.

## Guidelines

1. **Prefer Web APIs** - Use `fetch` over Axios, WebSockets API over node-ws
2. **Shared utilities** - Put in `supabase/functions/_shared`, import with relative path
3. **No bare specifiers** - Use `npm:` or `jsr:` prefix with versions
4. **Use Deno.serve** - Not the deprecated `serve` import
5. **Node APIs** - Use `node:` prefix (e.g., `import process from "node:process"`)
6. **File writes** - Only allowed in `/tmp` directory

## Pre-populated Environment Variables

These are available without configuration:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_OR_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

Set custom secrets: `supabase secrets set --env-file path/to/env-file`

## Basic Function

```typescript
interface ReqPayload {
  name: string
}

console.info('server started')

Deno.serve(async (req: Request) => {
  const { name }: ReqPayload = await req.json()
  const data = {
    message: `Hello ${name}!`,
  }

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', Connection: 'keep-alive' },
  })
})
```

## Using Node Built-in APIs

```typescript
import { randomBytes } from 'node:crypto'
import process from 'node:process'

const generateRandomString = (length: number) => {
  const buffer = randomBytes(length)
  return buffer.toString('hex')
}

Deno.serve(async (req: Request) => {
  const randomString = generateRandomString(10)
  return new Response(JSON.stringify({ random: randomString }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

## Using npm Packages

```typescript
import express from 'npm:express@4.18.2'

const app = express()

// Routes must be prefixed with function name
app.get('/my-function/*', (req, res) => {
  res.send('Welcome to Supabase')
})

app.listen(8000)
```

## Using Hono (Recommended)

```typescript
import { Hono } from 'npm:hono@4.0.0'

const app = new Hono().basePath('/my-function')

app.get('/', (c) => c.json({ message: 'Hello!' }))
app.post('/data', async (c) => {
  const body = await c.req.json()
  return c.json({ received: body })
})

Deno.serve(app.fetch)
```

## Generate Embeddings

```typescript
const model = new Supabase.ai.Session('gte-small')

Deno.serve(async (req: Request) => {
  const params = new URL(req.url).searchParams
  const input = params.get('text')
  const output = await model.run(input, { mean_pool: true, normalize: true })

  return new Response(JSON.stringify(output), {
    headers: { 'Content-Type': 'application/json', Connection: 'keep-alive' },
  })
})
```

## Background Tasks

```typescript
Deno.serve(async (req: Request) => {
  // Start background task without blocking response
  EdgeRuntime.waitUntil(
    fetch('https://api.example.com/webhook', {
      method: 'POST',
      body: JSON.stringify({ event: 'processed' }),
    })
  )

  // Return immediately
  return new Response(JSON.stringify({ status: 'accepted' }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```
