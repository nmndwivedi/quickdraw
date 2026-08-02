# @quickdrawjs/react

React bindings for [Quickdraw](https://tryquickdraw.com) — the MIT-licensed
infinite-canvas whiteboard SDK.

## Install

```bash
npm install @quickdrawjs/react
```

## Quick start

```jsx
import { Quickdraw } from '@quickdrawjs/react'
import '@quickdrawjs/core/quickdraw.css'

export default function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Quickdraw theme="light" grid="lines" />
    </div>
  )
}
```

That's a complete whiteboard: pen with pressure ink, highlighter, shapes,
arrows, text, sticky notes, images, eraser, laser pointer, selection,
pan/zoom/pinch, undo/redo, PNG export, and a responsive floating toolbar.

## Theme & grid

`theme` ('light' | 'dark') and `grid` ('none' | 'lines' | 'dots') are live
props. The ⋮ board menu carries switches for both, so users can change them
without any chrome of yours — the callbacks tell you when they do:

```jsx
const [theme, setTheme] = useState('light')
const [grid, setGrid] = useState('lines')

<Quickdraw
  theme={theme}
  grid={grid}
  onThemeChange={setTheme}
  onGridChange={setGrid}
/>
```

If your app owns its own theme control, drop the in-board ones with
`themeToggle={false}` / `gridControl={false}`. The corner "Quickdraw" mark is
on by default (keeping it helps people find the project); `watermark={false}`
removes it.

## Persistence

```jsx
<Quickdraw
  snapshot={savedSnapshot}
  autoFit
  onChange={(diff, source, editor) => {
    debouncedSave(editor.store.getSnapshot())
  }}
/>
```

## Imperative access

Everything in [`@quickdrawjs/core`](https://www.npmjs.com/package/@quickdrawjs/core)
is re-exported, and the full editor is reachable through a ref or `onMount`:

```jsx
const ref = useRef(null)

<Quickdraw ref={ref} hideUi />
<button onClick={() => ref.current.editor.setTool('draw')}>Pen</button>
<button onClick={() => ref.current.editor.store.undo()}>Undo</button>
```

## Real-time sync

The store emits a JSON-safe diff for every change and can apply diffs from
peers; remote diffs stay out of local undo history.

```jsx
const store = useQuickdrawStore()

useEffect(() => {
  const unsub = store.listen((diff) => socket.send(JSON.stringify(diff)), { source: 'user' })
  socket.onmessage = (e) => store.applyDiff(JSON.parse(e.data), 'remote')
  return unsub
}, [store])

<Quickdraw store={store} />
```

See the [repository README](https://github.com/quickdrawjs/quickdraw) for the
full API.

## License

MIT
