# @quickdrawjs/react-native

React Native bindings for [Quickdraw](https://tryquickdraw.com) — the
MIT-licensed infinite-canvas whiteboard SDK.

The engine runs inside a `react-native-webview` from a single self-contained
HTML string (engine + styles inlined at build time — no network, works
offline), and this component gives you a typed bridge to it: props for theme
and readonly, callbacks for changes, and an imperative ref for snapshots,
tools, undo/redo and PNG export.

## Install

```bash
npm install @quickdrawjs/react-native react-native-webview
```

(`react-native-webview` is a peer dependency; follow its install steps for
your RN / Expo setup. In Expo: `npx expo install react-native-webview`.)

## Quick start

```jsx
import { Quickdraw } from '@quickdrawjs/react-native'

export default function Board() {
  return <Quickdraw theme="light" grid="lines" style={{ flex: 1 }} />
}
```

That's a complete whiteboard: pen with pressure ink (Apple Pencil / stylus
pressure included), highlighter, shapes, arrows, text, sticky notes, eraser,
laser pointer, selection, pan/zoom/pinch, undo/redo and the floating toolbar.
Palm rejection is built in: once a stylus is seen, fingers steer the camera
and the pen draws.

## Persistence & control

```jsx
const board = useRef(null)

<Quickdraw
  ref={board}
  snapshot={savedSnapshot}
  onChange={(diff, source) => scheduleSave()}
  onSave={(dataUrl) => shareImage(dataUrl)}
/>

// later:
const snapshot = await board.current.getSnapshot()
const png = await board.current.exportPng({ scale: 2 })
board.current.undo()
board.current.setTool('draw')
```

## Theme & grid

`theme` ('light' | 'dark') and `grid` ('none' | 'lines' | 'dots') are live
props, and the ⋮ board menu carries switches for both. `onThemeChange` /
`onGridChange` report in-board changes back so your state can follow;
`themeToggle={false}` / `gridControl={false}` remove the switches, and
`watermark={false}` removes the corner "Quickdraw" mark (on by default —
keeping it helps people find the project).

## Real-time sync

Ship the `onChange` diffs to peers and feed theirs to `applyDiff` — remote
changes stay out of local undo history.

```jsx
<Quickdraw
  ref={board}
  onChange={(diff, source) => { if (source === 'user') socket.send(JSON.stringify(diff)) }}
/>
// socket.onmessage: board.current.applyDiff(JSON.parse(data))
```

See the [repository README](https://github.com/quickdrawjs/quickdraw) for the
full API.

## License

MIT
