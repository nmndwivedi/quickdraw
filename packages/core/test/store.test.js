import { describe, it, expect, vi } from 'vitest'
import { Store, newId, isDiffEmpty, invertDiff, composeDiff } from '../src/store.js'

const shape = (id, x = 0) => ({
  id, typeName: 'shape', type: 'geo', x, y: 0, rot: 0, z: 1,
  props: { geo: 'rectangle', w: 10, h: 10, color: 'black', size: 'm', dash: 'draw', fill: 'none', font: 'draw' },
})

describe('newId', () => {
  it('produces unique prefixed ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()))
    expect(ids.size).toBe(1000)
    for (const id of ids) expect(id.startsWith('shape:')).toBe(true)
    expect(newId('asset').startsWith('asset:')).toBe(true)
  })
})

describe('Store CRUD + diffs', () => {
  it('put emits an added diff', () => {
    const s = new Store()
    const fn = vi.fn()
    s.listen(fn)
    s.put(shape('a'))
    expect(fn).toHaveBeenCalledTimes(1)
    const [diff, source] = fn.mock.calls[0]
    expect(source).toBe('user')
    expect(Object.keys(diff.added)).toEqual(['a'])
    expect(isDiffEmpty(diff)).toBe(false)
  })

  it('update emits [from, to] pairs and merges props', () => {
    const s = new Store()
    s.put(shape('a'))
    const fn = vi.fn()
    s.listen(fn)
    s.update('a', { x: 5, props: { w: 20 } })
    const [diff] = fn.mock.calls[0]
    const [from, to] = diff.updated.a
    expect(from.x).toBe(0)
    expect(to.x).toBe(5)
    expect(to.props.w).toBe(20)
    expect(to.props.h).toBe(10) // untouched props survive the merge
  })

  it('remove emits removed with the prior record', () => {
    const s = new Store()
    s.put(shape('a'))
    const fn = vi.fn()
    s.listen(fn)
    s.remove(['a', 'missing'])
    const [diff] = fn.mock.calls[0]
    expect(diff.removed.a.id).toBe('a')
    expect(s.has('a')).toBe(false)
  })

  it('transact batches mutations into one diff; nested transacts share it', () => {
    const s = new Store()
    const fn = vi.fn()
    s.listen(fn)
    s.transact(() => {
      s.put(shape('a'))
      s.transact(() => s.put(shape('b')))
      s.update('a', { x: 3 })
    })
    expect(fn).toHaveBeenCalledTimes(1)
    const [diff] = fn.mock.calls[0]
    // a was added then updated inside the same tx: nets to a single add
    expect(diff.added.a.x).toBe(3)
    expect(diff.added.b).toBeTruthy()
    expect(diff.updated).toEqual({})
  })

  it('add + remove in one transaction nets to nothing', () => {
    const s = new Store()
    const fn = vi.fn()
    s.listen(fn)
    s.transact(() => {
      s.put(shape('a'))
      s.remove(['a'])
    })
    expect(fn).not.toHaveBeenCalled()
  })

  it('listener source filter separates user and remote', () => {
    const s = new Store()
    const user = vi.fn(), remote = vi.fn(), all = vi.fn()
    s.listen(user, { source: 'user' })
    s.listen(remote, { source: 'remote' })
    s.listen(all)
    s.put(shape('a'))
    s.put(shape('b'), 'remote')
    expect(user).toHaveBeenCalledTimes(1)
    expect(remote).toHaveBeenCalledTimes(1)
    expect(all).toHaveBeenCalledTimes(2)
  })

  it('shapes() excludes assets; asset() finds only assets', () => {
    const s = new Store()
    s.put(shape('a'))
    s.put({ id: 'as1', typeName: 'asset', src: 'data:x', w: 1, h: 1 })
    expect(s.shapes().map((r) => r.id)).toEqual(['a'])
    expect(s.asset('as1').id).toBe('as1')
    expect(s.asset('a')).toBeNull()
  })
})

describe('undo / redo', () => {
  it('undoes and redoes a put', () => {
    const s = new Store()
    s.put(shape('a'))
    expect(s.canUndo).toBe(true)
    s.undo()
    expect(s.has('a')).toBe(false)
    expect(s.canRedo).toBe(true)
    s.redo()
    expect(s.has('a')).toBe(true)
  })

  it('a batch (gesture) undoes as one step', () => {
    const s = new Store()
    s.beginBatch()
    s.put(shape('a'))
    s.update('a', { x: 1 })
    s.update('a', { x: 2 })
    s.endBatch()
    expect(s.undos.length).toBe(1)
    s.undo()
    expect(s.has('a')).toBe(false)
  })

  it('remote diffs never enter undo history', () => {
    const s = new Store()
    s.put(shape('a'), 'remote')
    expect(s.canUndo).toBe(false)
  })

  it('new edits clear the redo stack', () => {
    const s = new Store()
    s.put(shape('a'))
    s.undo()
    expect(s.canRedo).toBe(true)
    s.put(shape('b'))
    expect(s.canRedo).toBe(false)
  })

  it('undo of an update restores the exact prior record', () => {
    const s = new Store()
    s.put(shape('a'))
    s.update('a', { x: 42 })
    s.undo()
    expect(s.get('a').x).toBe(0)
    s.redo()
    expect(s.get('a').x).toBe(42)
  })

  it('listenHistory fires when a gesture batch closes (no diff of its own)', () => {
    const s = new Store()
    const history = vi.fn(() => ({ undo: s.canUndo, redo: s.canRedo }))
    s.listenHistory(history)
    s.beginBatch()
    s.put(shape('a'))
    s.update('a', { x: 1 })
    const nDuringGesture = history.mock.calls.length
    s.endBatch()
    // the close of the batch itself notified, and canUndo was true by then
    expect(history.mock.calls.length).toBeGreaterThan(nDuringGesture)
    expect(history.mock.results.at(-1).value).toEqual({ undo: true, redo: false })
    s.undo()
    expect(history.mock.results.at(-1).value).toEqual({ undo: false, redo: true })
    s.redo()
    expect(history.mock.results.at(-1).value).toEqual({ undo: true, redo: false })
  })

  it('canUndo/canRedo are already settled when the undo/redo diff emits', () => {
    // a toolbar refreshing from the change event must see the new state
    const s = new Store()
    s.put(shape('a'))
    let redoSeen, undoSeen
    s.listen(() => { redoSeen = s.canRedo; undoSeen = s.canUndo })
    s.undo()
    expect(redoSeen).toBe(true)
    expect(undoSeen).toBe(false)
    s.redo()
    expect(undoSeen).toBe(true)
    expect(redoSeen).toBe(false)
  })

  it('undo emits as a user diff (peers see it like any edit)', () => {
    const s = new Store()
    s.put(shape('a'))
    const fn = vi.fn()
    s.listen(fn, { source: 'user' })
    s.undo()
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn.mock.calls[0][0].removed.a).toBeTruthy()
  })
})

describe('diff algebra', () => {
  it('invertDiff swaps added/removed and flips update pairs', () => {
    const a = shape('a'), a2 = { ...a, x: 9 }
    const d = { added: { b: shape('b') }, removed: { c: shape('c') }, updated: { a: [a, a2] } }
    const inv = invertDiff(d)
    expect(inv.added.c).toBeTruthy()
    expect(inv.removed.b).toBeTruthy()
    expect(inv.updated.a).toEqual([a2, a])
  })

  it('composeDiff squashes sequential diffs', () => {
    const a1 = shape('a'), a2 = { ...a1, x: 1 }, a3 = { ...a1, x: 2 }
    const d1 = { added: {}, removed: {}, updated: { a: [a1, a2] } }
    const d2 = { added: {}, removed: {}, updated: { a: [a2, a3] } }
    const c = composeDiff(d1, d2)
    expect(c.updated.a).toEqual([a1, a3])
  })

  it('composeDiff: add then remove cancels; remove then re-add becomes update', () => {
    const a = shape('a')
    const add = { added: { a }, removed: {}, updated: {} }
    const rem = { added: {}, removed: { a }, updated: {} }
    expect(isDiffEmpty(composeDiff(add, rem))).toBe(true)
    const a2 = { ...a, x: 7 }
    const readd = { added: { a: a2 }, removed: {}, updated: {} }
    const c = composeDiff(rem, readd)
    expect(c.updated.a).toEqual([a, a2])
    expect(c.removed.a).toBeUndefined()
  })

  it('applying diff then its inverse is a no-op on the document', () => {
    const s = new Store()
    s.put(shape('a'))
    let captured
    const unsub = s.listen((d) => { captured = d })
    s.transact(() => {
      s.update('a', { x: 100 })
      s.put(shape('b'))
    })
    unsub() // the applyDiff calls below must not overwrite the capture
    const before = JSON.stringify(s.getSnapshot())
    s.applyDiff(invertDiff(captured), 'remote')
    s.applyDiff(captured, 'remote')
    expect(JSON.stringify(s.getSnapshot())).toBe(before)
  })
})

describe('snapshots', () => {
  it('round-trips the document', () => {
    const s = new Store()
    s.put(shape('a'))
    s.put(shape('b', 5))
    const snap = s.getSnapshot()
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap) // JSON-safe

    const s2 = new Store()
    s2.loadSnapshot(snap)
    expect(s2.size).toBe(2)
    expect(s2.get('b').x).toBe(5)
    expect(s2.canUndo).toBe(false) // remote load is not undoable
  })

  it('loadSnapshot replaces existing content', () => {
    const s = new Store()
    s.put(shape('old'))
    s.loadSnapshot({ document: { store: { a: shape('a') } } })
    expect(s.ids()).toEqual(['a'])
  })

  it('loadSnapshot resets history — a document swap invalidates old undo/redo', () => {
    const s = new Store()
    s.put(shape('old'))
    s.undo()
    expect(s.canRedo).toBe(true)
    s.put(shape('other'))
    expect(s.canUndo).toBe(true)
    let notified = 0
    s.listenHistory(() => notified++)
    s.loadSnapshot({ document: { store: { a: shape('a') } } })
    expect(s.canUndo).toBe(false)
    expect(s.canRedo).toBe(false)
    expect(notified).toBeGreaterThan(0) // toolbars must hear about the reset
  })

  it('clear empties the store (undoably for users)', () => {
    const s = new Store()
    s.put(shape('a'))
    s.clear()
    expect(s.size).toBe(0)
    s.undo()
    expect(s.size).toBe(1)
  })
})

describe('z order helpers', () => {
  it('maxZ / minZ scan records', () => {
    const s = new Store()
    s.put({ ...shape('a'), z: 4 })
    s.put({ ...shape('b'), z: -2 })
    expect(s.maxZ()).toBe(4)
    expect(s.minZ()).toBe(-2)
  })
})
