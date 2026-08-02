---
layout: ../../layouts/Article.astro
title: "How to add a whiteboard to your React app in 5 minutes"
description: "A step-by-step tutorial: install a free, MIT-licensed React whiteboard component, persist drawings as JSON, handle exports, and go headless with a custom toolbar."
date: 2026-08-01
---

You need a drawing surface in your React app — for annotations, a
brainstorming feature, a teaching tool, a support sketch. Building one from
scratch is a multi-month project (camera math, hit-testing, undo semantics,
touch gestures). Embedding one takes five minutes. This tutorial uses
[Quickdraw](https://tryquickdraw.com), which is MIT-licensed and free for
commercial use — but the persistence and sync patterns apply to any
whiteboard SDK.

## 1. Install

```bash
npm install @quickdrawjs/react
```

That pulls in `@quickdrawjs/core` (the engine — zero dependencies of its own).

## 2. Render a board

```jsx
import { Quickdraw } from '@quickdrawjs/react'
import '@quickdrawjs/core/quickdraw.css'

export default function Board() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Quickdraw theme="light" grid="lines" />
    </div>
  )
}
```

The component fills its container — the only real gotcha is that the container
needs actual dimensions. `position: fixed; inset: 0` gives you a full-page
board; a plain `<div style={{ height: 500 }}>` gives you an inline one.

You now have a complete whiteboard: pen with pressure, highlighter, shapes,
arrows, sticky notes, text, image paste/drop, selection, infinite pan/zoom,
undo/redo, light and dark themes, and PNG export. Try it before writing more
code.

## 3. Persist the drawing

The document is plain JSON. Save on change, restore on mount:

```jsx
import { useRef } from 'react'
import { Quickdraw } from '@quickdrawjs/react'
import '@quickdrawjs/core/quickdraw.css'

export default function Board() {
  const ref = useRef(null)
  const saved = localStorage.getItem('board')

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Quickdraw
        ref={ref}
        snapshot={saved ? JSON.parse(saved) : undefined}
        autoFit
        onChange={(diff, source, editor) => {
          localStorage.setItem('board', JSON.stringify(editor.store.getSnapshot()))
        }}
      />
    </div>
  )
}
```

`onChange` fires with a diff on every document change; grabbing a full
snapshot there is the simplest durable save. In production you'd debounce and
send to your API — the snapshot is just JSON, so it drops into any database
column.

## 4. Handle exports your way

By default the toolbar's export downloads a PNG. Intercept it to upload
instead:

```jsx
<Quickdraw onSave={async (blob) => {
  const form = new FormData()
  form.append('file', blob, 'board.png')
  await fetch('/api/upload', { method: 'POST', body: form })
}} />
```

## 5. Drive it imperatively

The ref exposes the whole engine:

```jsx
ref.current.editor.setTool('draw')     // switch tools from your own UI
ref.current.editor.setTheme('dark')
ref.current.editor.fitContent()        // zoom to fit
ref.current.editor.store.undo()
```

Want your own toolbar entirely? Pass `hideUi` and the canvas renders bare —
every tool above is reachable from these calls.

## 6. (Optional) Make it collaborative

Every change emits a JSON-safe diff, and applying a remote diff never touches
local undo history:

```js
const { store } = ref.current.editor
store.listen((diff) => socket.send(JSON.stringify(diff)), { source: 'user' })
socket.onmessage = (e) => store.applyDiff(JSON.parse(e.data), 'remote')
```

That's a working multiplayer whiteboard over a dumb WebSocket relay. For the
deeper story — why diffs beat operational transforms for this use case — read
[Real-time whiteboard sync with JSON diffs](/blog/real-time-whiteboard-sync-json-diffs/).

## Where to go next

- [Documentation](/docs/) — persistence, headless mode, React Native
- [Try the hosted app](https://app.tryquickdraw.com) — the same SDK, deployed
- [GitHub](https://github.com/quickdrawjs/quickdraw) — MIT, open to contributions
