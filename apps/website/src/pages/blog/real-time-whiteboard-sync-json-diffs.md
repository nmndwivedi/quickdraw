---
layout: ../../layouts/Article.astro
title: "Real-time whiteboard sync with JSON diffs (no CRDT required)"
description: "How Quickdraw's store makes multiplayer whiteboards simple: diff-emitting transactions, source-tagged changes, and collaborative undo that actually behaves."
date: 2026-08-01
---

Multiplayer is where whiteboard architectures go to die. Reach for a CRDT
library on day one and you inherit its document model, its bundle size, and
its opinions. Roll your own and you usually discover too late that undo,
persistence, and sync all wanted the same primitive — and you built three
different ones.

Quickdraw's answer is boring on purpose: **the diff is the wire format.** This
post explains the model and walks through a working sync setup.

## The data model

A Quickdraw document is a flat map of immutable records — shapes, strokes,
notes, images. Every mutation happens in a transaction, and every transaction
emits a diff:

```js
{
  added:   { [id]: record },
  removed: { [id]: record },
  updated: { [id]: [from, to] }
}
```

Three properties make this shape powerful:

1. **It's JSON-safe.** Records are plain objects; a diff survives
   `JSON.stringify` untouched. Any transport works.
2. **It's invertible.** `invertDiff(diff)` swaps added/removed and flips the
   `[from, to]` pairs — that's undo, for free.
3. **It's composable.** `composeDiff(a, b)` merges consecutive diffs — that's
   how a multi-event gesture becomes one undo entry.

## Sync in four lines

```js
store.listen((diff) => socket.send(JSON.stringify(diff)), { source: 'user' })
socket.onmessage = (e) => store.applyDiff(JSON.parse(e.data), 'remote')
```

The `source` tag is the load-bearing detail. Local changes are `'user'`;
changes applied from the network are `'remote'`. The listener filter means
you only broadcast what *this* client did — no echo loops — and the store
keeps `'remote'` diffs **out of the local undo stack**.

That last part is what most homemade implementations get wrong. If a peer
draws while you're working and you hit ⌘Z, you expect *your* last stroke to
vanish — not theirs. Source-tagged history gives you collaborative undo
semantics without a CRDT.

## The relay is trivial

The server doesn't interpret documents at all — it forwards bytes:

```js
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 8080 })
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    for (const peer of wss.clients) {
      if (peer !== ws && peer.readyState === 1) peer.send(data.toString())
    }
  })
})
```

New peers catch up with a snapshot: send `store.getSnapshot()` to joiners,
they call `store.loadSnapshot(snap, 'remote')`, then live diffs flow.

## What about conflicts?

Records are updated whole, so concurrency resolves at record granularity —
last writer wins per shape. For a whiteboard this matches user intuition:
two people rarely edit the *same* shape simultaneously, and when they do,
one of them winning cleanly beats a merge artifact. (Freehand strokes are
append-only in practice — each stroke is a new record — so drawing never
conflicts at all.)

If you outgrow that — offline-first editing, large shared boards with heavy
contention — you can layer a CRDT or server reconciliation *on top of the
same diff stream*, because the diff already captures intent. Nothing in the
engine assumes a transport or an authority model.

## Persistence falls out of the same primitive

`getSnapshot()` / `loadSnapshot()` are the same records, whole:

```js
localStorage.setItem('doc', JSON.stringify(store.getSnapshot()))
store.loadSnapshot(JSON.parse(saved), 'remote')   // restores outside undo history
```

And because diffs are just data, logging the stream gives you replay — an
audit trail of a board, stroke by stroke.

## Try it

The [roadmap](https://github.com/quickdrawjs/quickdraw/issues/1) includes a
runnable two-browser sync example, and
[issue #4](https://github.com/quickdrawjs/quickdraw/issues/4) is open if you'd
like to build it with us. Quickdraw is MIT-licensed:
[github.com/quickdrawjs/quickdraw](https://github.com/quickdrawjs/quickdraw).
