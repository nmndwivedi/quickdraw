---
layout: ../../layouts/Article.astro
title: "Open-source tldraw alternatives in 2026"
description: "tldraw's SDK requires a paid business license for some production use. Here are the genuinely MIT-licensed whiteboard libraries — Excalidraw, Quickdraw, and the DIY route — compared."
date: 2026-08-01
---

tldraw is probably the best-known infinite-canvas SDK for React, and it's
good software. It's also not open source in the way many developers assume:
the licensing has tightened in steps — v2 (2024) went non-commercial, v2.4–3.x
allowed free production use with a mandatory watermark, and since
[SDK 4.0](https://tldraw.dev/blog/tldraw-sdk-4-0) (September 2025) production
use requires a license key outright: a 100-day trial, a free
[hobby license](https://tldraw.dev/community/license) (non-commercial,
watermark required), or a commercial license via sales. There's no public
price list; users on Hacker News have reported quotes around $6k/year for
small teams.

That's a legitimate business model. But if you searched for an *alternative*,
you probably want one of two things: a genuinely free license, or a library
that fits a stack tldraw doesn't cover (plain JavaScript, React Native).
Here's the landscape.

## What "open source" means here

Three license situations get conflated:

- **MIT / Apache** — use it commercially, modify it, no fees, irrevocably.
  This is what most people mean by open source.
- **Source-available with conditions** — you can read and modify the code,
  but shipping to production carries terms. tldraw is here (a required
  watermark in 3.x; a required license key since 4.0).
- **Copyleft (GPL/AGPL)** — free, but with obligations many commercial teams
  can't accept for an embedded SDK.

Everything below is MIT.

## Excalidraw

[Excalidraw](https://github.com/excalidraw/excalidraw) is the heavyweight
MIT option: a hugely popular hand-drawn-style whiteboard with an embeddable
React component (`@excalidraw/excalidraw`). It's mature, actively
maintained, and battle-tested at scale.

Where it fits less well: it's React-only, the embed brings Excalidraw's own
look and UX, and the component is a heavy dependency — 344 kB minified and
gzipped across 31 runtime dependencies, per
[Bundlephobia](https://bundlephobia.com/package/@excalidraw/excalidraw).
Collaboration runs through the separate `excalidraw-room` server. If you
want "the Excalidraw experience inside my app," it's an excellent choice.

## Quickdraw

[Quickdraw](https://tryquickdraw.com) — this project — is an MIT-licensed
whiteboard SDK built to be embedded. The core engine is plain ESM with zero
runtime dependencies (~25 kB minified + gzipped — about 14× lighter than
the Excalidraw component), and the same engine ships as three packages:

- `@quickdrawjs/core` — any web page, no framework, no build step
- `@quickdrawjs/react` — a `<Quickdraw />` component with an imperative ref
- `@quickdrawjs/react-native` — a WebView component with a typed bridge,
  Apple Pencil pressure, and palm rejection

You get pressure-sensitive ink, shapes with a hand-drawn wobble, arrows,
sticky notes, images, a laser pointer, per-gesture undo, light and dark
themes, grids, and PNG export — plus a diff-emitting store designed for
persistence and real-time sync. A small "Made with Quickdraw" badge sits in
the board's corner by default; unlike tldraw's attribution, turning it off is
a boolean (`watermark: false`) — free, no license key, no phone-home.

Where it fits less well: it's young. Excalidraw and tldraw have years of
production hardening and much bigger communities. If you need rich text,
frames, or a first-party sync server today, the older projects are ahead.

## The DIY route: perfect-freehand + your own canvas

If you only need *drawing* — not selection, shapes, undo, and export —
[perfect-freehand](https://github.com/steveruizok/perfect-freehand) (MIT, by
tldraw's author) turns pointer input into pressure-sensitive stroke
outlines, and you render them yourself. Many teams start here and then meet
the rest of the iceberg: hit-testing, camera math, undo semantics, touch
gestures, palm rejection. Budget for that before you commit.

## Quick comparison

| | Quickdraw | Excalidraw | tldraw SDK |
|---|---|---|---|
| License | MIT | MIT | Custom |
| React | Yes | Yes | Yes |
| No-framework JS | **Yes** | No | No |
| React Native | **Yes** | No | No |
| Bundle (min + gzip) | **~25 kB** | ~344 kB | ~496 kB |
| Runtime dependencies | **Zero** | 31 | 14 |
| Community size | Young | Very large | Large |
| First-party sync server | Not yet | excalidraw-room | Paid (tldraw sync) |

Sizes are minified + gzipped, from
[Bundlephobia](https://bundlephobia.com/package/tldraw) (Excalidraw 0.18.1,
tldraw 5.2.5) with Quickdraw measured the same way. Both alternatives are
heavier because both do more — that trade is the whole point of this page,
not a knock on either project.

## Choosing

- **You want maximum maturity and MIT:** Excalidraw.
- **You want a lightweight embed, plain-JS support, or React Native:**
  Quickdraw.
- **You only need ink and enjoy building canvases:** perfect-freehand.
- **The license cost is fine for your business:** tldraw remains excellent.

Quickdraw is [open to contributions](https://github.com/quickdrawjs/quickdraw).
If the missing feature that sent you back to a paid SDK is on the
[roadmap](https://github.com/quickdrawjs/quickdraw/issues/1), tell us — or
build it with us.
