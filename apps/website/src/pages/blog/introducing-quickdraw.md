---
layout: ../../layouts/Article.astro
title: "Introducing Quickdraw: an MIT-licensed whiteboard SDK for React, React Native, and plain JS"
description: "I needed a drawing feature and found the good options either cost money or couldn't be embedded. So I extracted my app's canvas engine into a standalone SDK and MIT-licensed all of it."
date: 2026-08-01
---

[Quickdraw](https://tryquickdraw.com) is an infinite-canvas whiteboard SDK
for React, React Native, and plain JavaScript. It's MIT-licensed — no
license keys, no fees, commercial use included — and you can
[try it right now without signing up](https://app.tryquickdraw.com).

```bash
npm install @quickdrawjs/react
```

```jsx
import { Quickdraw } from '@quickdrawjs/react'
import '@quickdrawjs/core/quickdraw.css'

<Quickdraw theme="light" grid="lines" watermark={false} />
```

That's a complete whiteboard: pressure-sensitive ink, hand-drawn shapes,
sticky notes, arrows, images, selection, infinite pan and zoom, undo/redo,
and PNG export.

## Why I built it

I was building an app that needed a drawing feature — the kind of
requirement that sounds like an afternoon and isn't. I looked at the two
obvious options.

**tldraw** is beautifully engineered. It's also no longer open source. The
licensing has tightened in steps: v2 (2024) went non-commercial, v2.4–3.x
allowed free production use with a mandatory watermark, and since
[SDK 4.0](https://tldraw.dev/blog/tldraw-sdk-4-0) (September 2025)
production use requires a license key outright — a 100-day trial, a free
[hobby license](https://tldraw.dev/community/license) that is
non-commercial and requires the watermark, or a commercial license arranged
through sales. There's no public price list. That's a legitimate business
model, and the tldraw team has been consistently upfront about it. It just
doesn't work if you need MIT.

**Excalidraw** is genuinely MIT and a wonderful piece of software. As an
*app*. Embedding it as an SDK is where it fights you: it's React-only
([the Vue request](https://github.com/excalidraw/excalidraw/issues/1404)
has been open since 2020), customizing the toolbar means CSS override hacks
([#3012](https://github.com/excalidraw/excalidraw/issues/3012), open since
2021, where the reporter describes their own workaround as "gnarly css"),
and there's no React Native path — maintainers have said it's
["likely not [possible] without further tweaks, if even possible"](https://github.com/excalidraw/excalidraw/issues/8664).
Their own [touch-device meta-issue](https://github.com/excalidraw/excalidraw/issues/9705)
says Excalidraw is "primarily optimized for desktop use."

If you want excalidraw.com inside your product, use Excalidraw — it's more
mature than anything I'll ship this year. But I needed a drawing *surface*
with my own chrome, on three platforms, under a license I'd never have to
think about again.

So I kept building my own. Then I pulled it out into a standalone SDK.

## What's in it

A complete whiteboard rather than a toolkit you assemble:

- **Pressure ink** — stroke width breathes with stylus pressure, or with
  velocity for mouse users; strokes taper like a real pen
- **Palm rejection** — once a stylus is seen, fingers steer the camera and
  the pen draws
- **Shapes** with a seeded hand-drawn wobble, four fill styles, editable
  labels; arrows and lines with draggable bend
- **Sticky notes, text, images, highlighter, laser pointer**
- **Selection** — click, shift-click, marquee; move, resize, rotate,
  duplicate, reorder, keyboard nudge
- **Undo/redo** — one entry per gesture, however many events it took
- **Light and dark themes**, grid backdrops, PNG export
- A responsive floating toolbar that sheds tools as the frame narrows — or
  hide it and build your own from the headless API

The core is plain ESM with **zero runtime dependencies** and no build step.

## Three packages, one engine

| Package | For |
| --- | --- |
| [`@quickdrawjs/core`](https://www.npmjs.com/package/@quickdrawjs/core) | any page or framework — framework-free engine |
| [`@quickdrawjs/react`](https://www.npmjs.com/package/@quickdrawjs/react) | `<Quickdraw />` component + hooks |
| [`@quickdrawjs/react-native`](https://www.npmjs.com/package/@quickdrawjs/react-native) | WebView component + typed bridge |

The React Native package ships the engine as a self-contained HTML string
inside the package — no network, works offline, Apple Pencil pressure and
palm rejection included.

## The idea that makes it small

The document is a flat map of immutable records. Every mutation runs in a
transaction and emits a JSON-safe diff:

```js
{ added: { [id]: record }, removed: { [id]: record }, updated: { [id]: [from, to] } }
```

One shape powers everything. Persistence is `store.getSnapshot()` and
`store.loadSnapshot()` — plain JSON round-trips. History entries *are*
diffs, composed per gesture. And sync is a transport problem rather than an
architecture problem:

```js
// a complete sync client
store.listen((diff) => socket.send(JSON.stringify(diff)), { source: 'user' })
socket.onmessage = (e) => store.applyDiff(JSON.parse(e.data), 'remote')
```

Remote diffs are tagged at the source, so they never pollute local undo
history — which is what makes
[collaborative undo behave correctly](/blog/real-time-whiteboard-sync-json-diffs/)
instead of yanking away someone else's work.

## About the badge

There's a small "Made with Quickdraw" badge in the corner of the board by
default. `watermark: false` turns it off — free, no license key, no signup,
no phone-home, and it's in the first code sample in the README.

I want to be precise about this, because it's the exact thing that got
tldraw criticized: their watermark was a *license term* backed by technical
enforcement. This isn't. Quickdraw is MIT, so removing the badge is
legally fine and always will be. It's a default I'd appreciate you keeping,
not a condition of use.

## What's missing

Being honest is more useful than being flattering, so: there is no
first-party multiplayer server yet (the store is sync-ready, but you bring
the transport), no layers, no frames, and no rich text. Excalidraw and
tldraw have years of production hardening and far bigger communities than a
project released today.

The [roadmap is public](https://github.com/quickdrawjs/quickdraw/issues/1).
If the missing feature that sent you back to a paid SDK is on it — or
isn't — say so there.

## Try it

- **Live app, no signup:** [app.tryquickdraw.com](https://app.tryquickdraw.com)
- **Repo:** [github.com/quickdrawjs/quickdraw](https://github.com/quickdrawjs/quickdraw)
- **Docs:** [tryquickdraw.com](https://tryquickdraw.com)

If you've embedded a whiteboard in production before, I'd genuinely like to
know what you hit that I should handle better —
[open an issue](https://github.com/quickdrawjs/quickdraw/issues) or start a
[discussion](https://github.com/quickdrawjs/quickdraw/discussions). And if
it's useful to you, a star helps other people find it.
