// React Native bindings for Quickdraw. The engine (canvas + DOM) runs inside
// a WebView from a single self-contained HTML string — no network, works
// offline — and this component speaks a small JSON bridge to it.

import {
  createElement, forwardRef, useEffect, useImperativeHandle, useRef,
} from 'react'
import { WebView } from 'react-native-webview'
import { BOARD_HTML } from './board-html.generated.js'
import { createBridge } from './bridge.js'

export { BOARD_HTML } from './board-html.generated.js'
export { createBridge, encodeDispatch } from './bridge.js'

/**
 * <Quickdraw /> — a complete whiteboard in a React Native view.
 *
 * props:
 *   theme        'light' | 'dark' (live-switchable)
 *   grid         'none' | 'lines' | 'ruled' | 'dots' | 'crosses' | 'iso' — the backdrop (live-switchable)
 *   readonly     lock input (also hides the toolbar)
 *   hideUi       hide the stock toolbar
 *   themeToggle  show the theme switch in the board menu (default true)
 *   gridControl  show the grid switch in the board menu (default true)
 *   watermark    show the corner "Quickdraw" mark (default true)
 *   snapshot     serialized document loaded on mount
 *   styles       initial pen styles { color, size, dash, fill, font }
 *   onReady      () => void — board mounted inside the WebView
 *   onChange     (diff, source) => void — every document change
 *   onSelectionChange  (ids: string[]) => void
 *   onThemeChange      (themeId) => void — the in-board switch moved it
 *   onGridChange       (gridId) => void
 *   onSave       (dataUrl, background) => void — toolbar PNG export
 *   onError      (message) => void
 *   style        RN style for the WebView container
 *   webviewProps extra props spread onto the underlying WebView
 *
 * ref (all safe to call once onReady fired; earlier calls are queued):
 *   loadSnapshot(snapshot), applyDiff(diff), setTool(tool),
 *   setStyle(key, value), setGrid(grid), undo(), redo(), clear(), fitContent(),
 *   getSnapshot() -> Promise<snapshot>,
 *   exportPng(opts) -> Promise<dataUrl | null>
 */
export const Quickdraw = forwardRef(function Quickdraw(props, ref) {
  const {
    theme = 'light',
    grid = 'lines',
    readonly = false,
    hideUi = false,
    themeToggle = true,
    gridControl = true,
    watermark = true,
    snapshot,
    styles,
    onReady,
    onChange,
    onSelectionChange,
    onThemeChange,
    onGridChange,
    onSave,
    onError,
    style,
    webviewProps,
  } = props

  const webRef = useRef(null)
  const stateRef = useRef(null)
  if (!stateRef.current) {
    const queue = []
    const send = (js) => {
      if (stateRef.current.ready) webRef.current?.injectJavaScript(js)
      else queue.push(js)
    }
    stateRef.current = {
      ready: false,
      queue,
      send,
      bridge: createBridge(send),
    }
  }
  const st = stateRef.current

  const cbRef = useRef({})
  cbRef.current = { onReady, onChange, onSelectionChange, onThemeChange, onGridChange, onSave, onError }

  // initial props for the init message (read once, on 'ready')
  const initRef = useRef(null)
  if (!initRef.current) {
    initRef.current = { theme, grid, readonly, hideUi, themeToggle, gridControl, watermark, snapshot, styles }
  }

  const onMessage = (e) => {
    let m
    try {
      m = JSON.parse(e.nativeEvent.data)
    } catch {
      return
    }
    switch (m.type) {
      case 'ready': {
        st.ready = true
        // init first, then anything queued before the page came up
        webRef.current?.injectJavaScript(
          `window.__qdDispatch(${JSON.stringify({ type: 'init', ...initRef.current })}); true;`
        )
        for (const js of st.queue.splice(0)) webRef.current?.injectJavaScript(js)
        break
      }
      case 'mounted': cbRef.current.onReady?.(); break
      case 'change': cbRef.current.onChange?.(m.diff, m.source); break
      case 'selection': cbRef.current.onSelectionChange?.(m.ids); break
      case 'theme': cbRef.current.onThemeChange?.(m.theme); break
      case 'grid': cbRef.current.onGridChange?.(m.grid); break
      case 'save': cbRef.current.onSave?.(m.dataUrl, m.background); break
      case 'snapshot': st.bridge.settle(m.id, m.snapshot); break
      case 'export': st.bridge.settle(m.id, m.dataUrl); break
      case 'error': cbRef.current.onError?.(m.message); break
    }
  }

  // live prop updates (the first run lands before init and is queued behind
  // it, so the board simply re-applies the initial values — harmless)
  useEffect(() => { st.bridge.post({ type: 'setTheme', theme }) }, [theme])
  useEffect(() => { st.bridge.post({ type: 'setGrid', grid }) }, [grid])
  useEffect(() => { st.bridge.post({ type: 'setReadonly', readonly }) }, [readonly])
  useEffect(() => () => st.bridge.dispose(), [])

  useImperativeHandle(ref, () => ({
    loadSnapshot: (snap, fit) => st.bridge.post({ type: 'loadSnapshot', snapshot: snap, fit }),
    applyDiff: (diff) => st.bridge.post({ type: 'applyDiff', diff }),
    setTool: (tool) => st.bridge.post({ type: 'setTool', tool }),
    setStyle: (key, value) => st.bridge.post({ type: 'setStyle', key, value }),
    setGrid: (g) => st.bridge.post({ type: 'setGrid', grid: g }),
    undo: () => st.bridge.post({ type: 'undo' }),
    redo: () => st.bridge.post({ type: 'redo' }),
    clear: () => st.bridge.post({ type: 'clear' }),
    fitContent: (animate) => st.bridge.post({ type: 'fitContent', animate }),
    getSnapshot: () => st.bridge.request({ type: 'getSnapshot' }),
    exportPng: (opts) => st.bridge.request({ type: 'exportPng', opts }),
  }), [])

  return createElement(WebView, {
    ref: webRef,
    source: { html: BOARD_HTML },
    originWhitelist: ['*'],
    onMessage,
    javaScriptEnabled: true,
    scrollEnabled: false,
    bounces: false,
    overScrollMode: 'never',
    setSupportMultipleWindows: false,
    hideKeyboardAccessoryView: true,
    style: [{ flex: 1, backgroundColor: 'transparent' }, style],
    ...webviewProps,
  })
})
