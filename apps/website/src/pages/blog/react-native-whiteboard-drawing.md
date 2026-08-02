---
layout: ../../layouts/Article.astro
title: "A whiteboard for React Native: drawing, Apple Pencil, and palm rejection"
description: "React Native has surprisingly few good drawing options. How to ship a full whiteboard in RN or Expo with pressure-sensitive ink, palm rejection, offline support, and PNG export."
date: 2026-08-01
---

Search for "React Native whiteboard" and the results are thin: abandoned
sketch-canvas wrappers, SVG-based signature pads that choke past a hundred
strokes, and advice to "just use a WebView" with no details. Meanwhile the two
best-known web whiteboard SDKs don't ship React Native packages at all.

Here's the approach that actually works — and a package that does it for you.

## Why native-view drawing keeps disappointing

Naive RN drawing implementations render strokes as SVG paths or per-point
views on the JS thread. Every pointer move crosses the bridge, every stroke
re-renders a component tree, and by the time you add zoom, selection, and
undo, you've rebuilt a graphics engine inside a UI framework that fights you.
The libraries that tried are mostly unmaintained for a reason.

The pragmatic architecture is a **WebView running a real canvas engine**, with
a typed message bridge to the host app. Canvas 2D inside a WebView is
hardware-accelerated, handles thousands of strokes, and — crucially — gets
`PointerEvent` with **pressure** from Apple Pencil and S Pen.

## The five problems you'll hit doing it yourself

1. **Asset loading.** Shipping an HTML file that works in release builds on
   both platforms (and Expo) is fiddly; remote URLs break offline.
2. **Bridge protocol.** You need request/response semantics over
   `postMessage` — for "give me a snapshot" and "export a PNG" — not just
   fire-and-forget events.
3. **Pressure & palm rejection.** Pencil input arrives as pointer events with
   `pointerType: "pen"`; a good engine lets the palm's touches pan the camera
   while the pen draws.
4. **Gesture conflicts.** Pinch-zoom inside the WebView vs. the scroll views
   around it.
5. **Binary export.** Getting a PNG out means base64 across the bridge —
   easy to get slow, easy to get wrong.

## Or: install the package that solved them

[`@quickdrawjs/react-native`](https://www.npmjs.com/package/@quickdrawjs/react-native)
wraps the MIT-licensed [Quickdraw](https://tryquickdraw.com) engine in exactly
this architecture. The engine ships *inside the package* as one
self-contained HTML string — no network, works offline, no asset pipeline.

```bash
npm install @quickdrawjs/react-native react-native-webview
```

```jsx
import { useRef } from 'react'
import { Quickdraw } from '@quickdrawjs/react-native'

export default function Board() {
  const board = useRef(null)
  return (
    <Quickdraw
      ref={board}
      theme="dark"
      onChange={(diff) => console.log('changed', diff)}
      style={{ flex: 1 }}
    />
  )
}
```

You get the full whiteboard — pressure ink, highlighter, shapes, sticky
notes, selection, infinite canvas, undo, themes — with Apple Pencil pressure
and palm rejection handled by the engine.

The bridge is promise-based and typed:

```js
const snapshot = await board.current.getSnapshot()   // plain JSON
await board.current.loadSnapshot(saved)
const png = await board.current.exportPng({ scale: 2 })
```

`onChange` streams the same JSON diffs the web packages emit, so an RN client
and a web client can sync to each other over one relay.

## Expo notes

It's a plain `react-native-webview` consumer — no native modules of its own —
so it works in Expo Go and EAS builds without config plugins.

## When you *shouldn't* use a WebView

If you need strokes composited with native UI (drawing *over* a live camera
feed, for instance) or sub-frame latency guarantees, a Skia-based custom
renderer (`@shopify/react-native-skia`) is the right tool — at the cost of
building the whiteboard layer yourself. For a document-style whiteboard,
notes app, or annotation feature, the WebView architecture is what ships.

*Quickdraw is MIT-licensed and [open to contributions](https://github.com/quickdrawjs/quickdraw).*
