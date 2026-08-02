---
layout: ../../layouts/Article.astro
title: "How an infinite canvas works: the camera math behind pan and zoom"
description: "The core of every whiteboard app is one transform: screen space to page space. How to implement pan, zoom-at-cursor, pinch, and zoom-to-fit without accumulating drift."
date: 2026-08-01
---

Every infinite-canvas app — Figma, tldraw, Excalidraw,
[Quickdraw](https://tryquickdraw.com) — is built on one small idea: shapes
live in an unbounded coordinate system called **page space**, and a
**camera** decides which part of it your screen shows. Get the camera math
right and pan, zoom, pinch, and zoom-to-fit all fall out of one transform.
Get it wrong and your canvas drifts, jitters, or zooms toward the corner
instead of the cursor.

This is the math Quickdraw uses. It fits in a page.

## The camera is three numbers

```js
camera = { x, y, z }   // z is zoom; x, y are the pan offset in page units
```

The transform between a point on screen and a point on the page:

```js
const toPage = (sx, sy) => ({
  x: sx / camera.z - camera.x,
  y: sy / camera.z - camera.y,
})
const toScreen = (px, py) => ({
  x: (px + camera.x) * camera.z,
  y: (py + camera.y) * camera.z,
})
```

Everything below is just algebra on these two functions.

## Rendering

Don't transform your shapes — transform the canvas context once per frame
and draw shapes at their page coordinates:

```js
ctx.setTransform(dpr * camera.z, 0, 0, dpr * camera.z,
                 dpr * camera.z * camera.x, dpr * camera.z * camera.y)
drawShapes(ctx)   // page coordinates, no per-shape math
```

(`dpr` is `devicePixelRatio` — bake it into the transform and your lines
stay crisp on retina screens.)

## Pan

A drag of `(dx, dy)` screen pixels moves the camera by that distance *in
page units*, so divide by zoom:

```js
camera.x += dx / camera.z
camera.y += dy / camera.z
```

Forgetting the division is the classic bug: panning feels right at 100%
zoom, then twice as fast at 50%.

## Zoom at the cursor

The rule: **the page point under the cursor must stay under the cursor.**
Solve for the new camera position from that constraint:

```js
function zoomAt(sx, sy, nextZ) {
  const p = toPage(sx, sy)        // before
  camera.z = nextZ
  camera.x = sx / nextZ - p.x     // after: same p under (sx, sy)
  camera.y = sy / nextZ - p.y
}
```

Wheel zoom is then one line — exponential, so each notch feels equal:

```js
zoomAt(e.clientX, e.clientY, camera.z * Math.exp(-e.deltaY * 0.0025))
```

Clamp `z` to something like `[0.05, 8]` and you're done.

## Pinch

A two-finger pinch is a zoom *and* a pan at once. Track the midpoint and
distance between the touches; each frame, apply the distance ratio as zoom
at the midpoint, then the midpoint's movement as a pan. Because both
operations are expressed through the same camera, they compose without
drift — there's no accumulated error, since every frame recomputes from the
two current touch points.

## Zoom to fit

Compute the bounding box of all shapes in page space, then pick the zoom
that fits it with a margin and center it:

```js
const z = Math.min((vw - pad * 2) / bounds.w, (vh - pad * 2) / bounds.h)
camera.z = clamp(z, MIN_Z, 1)   // never zoom *in* past 100% to fit
camera.x = (vw / camera.z - bounds.w) / 2 - bounds.x
camera.y = (vh / camera.z - bounds.h) / 2 - bounds.y
```

## The part people forget: hit-testing

Clicks arrive in screen space; shapes live in page space. Convert the
pointer with `toPage` *once* at the top of your event handler and do all
hit-testing in page coordinates. Mixing spaces — testing a page-space shape
against a screen-space point — is the source of most "selection stops
working when zoomed" bugs.

## See it running

All of this is implemented in
[Quickdraw's editor](https://github.com/quickdrawjs/quickdraw), MIT-licensed
— `editor.js` has the camera, `shapes.js` the hit-testing. If you'd rather
not build the rest of the whiteboard (undo, selection, styles, export...),
that's the [point of the SDK](/docs/):

```bash
npm install @quickdrawjs/core
```
