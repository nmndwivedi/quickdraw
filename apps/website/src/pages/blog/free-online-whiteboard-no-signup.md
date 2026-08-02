---
layout: ../../layouts/Article.astro
title: "A free online whiteboard with no sign-up (and no catch)"
description: "Need a whiteboard right now? Quickdraw's web app opens straight to a canvas: no account, autosaves in your browser, exports to PNG, works with Apple Pencil. Here's what it does and how your data is handled."
date: 2026-08-01
---

Sometimes you just need a surface to think on — a quick diagram in a call, a
sketch to explain a bug, a plan drawn out loud. What you don't need is a
sign-up wall, a workspace to name, and an onboarding tour.

[app.tryquickdraw.com](https://app.tryquickdraw.com) opens straight
to a canvas. Draw. That's the product.

## What you get

- **A real pen.** Stroke width follows pressure on an Apple Pencil or S
  Pen, and velocity with a mouse. Strokes taper like ink, not like a
  highlighter set to thin.
- **Shapes, arrows, sticky notes, text, images.** Paste or drag a
  screenshot straight onto the board.
- **An infinite canvas.** Pan forever, pinch or scroll to zoom, press
  <kbd>⇧1</kbd> to fit everything back in view.
- **Undo that behaves.** One <kbd>⌘Z</kbd> per gesture, not per pixel.
- **Light and dark boards**, ruled or dotted grids.
- **PNG export** — the whole board or just a selection, on paper or
  transparent.

## Where your drawings go

Nowhere. The document lives in your browser's local storage: close the tab,
come back tomorrow, your board is still there. Nothing is uploaded, there's
no server copy, and there's no account to attach it to. If you want a file,
export a PNG; if you want to clear out, the board menu has a clear-board
button.

The honest trade-off: local storage means the board belongs to *that
browser*. It won't follow you to another machine, and clearing your
browser data clears the board. For anything you'd be sad to lose, export.

## Why it's free

The app is a demo that turned out to be useful. It runs on
[Quickdraw](https://tryquickdraw.com), an MIT-licensed whiteboard SDK for
developers — the app you draw in is the SDK, unmodified. Keeping the app
free is how people find the project, the same way the small mark in the
corner of embedded boards is.

If you're a developer and want this canvas inside your own product:

```bash
npm install @quickdrawjs/react
```

The [docs](/docs/) take it from there, and the whole thing is
[open source](https://github.com/quickdrawjs/quickdraw).

## Keyboard shortcuts worth knowing

| | |
| --- | --- |
| <kbd>D</kbd> | Pen |
| <kbd>E</kbd> | Eraser |
| <kbd>N</kbd> | Sticky note |
| <kbd>T</kbd> | Text |
| <kbd>V</kbd> | Select |
| <kbd>Space</kbd> (hold) | Pan |
| <kbd>⇧1</kbd> | Zoom to fit |
| <kbd>⌘Z</kbd> / <kbd>⇧⌘Z</kbd> | Undo / redo |

[Open the whiteboard →](https://app.tryquickdraw.com)
