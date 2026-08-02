// The Quickdraw document: a flat map of records (shapes and image assets)
// that emits diffs — { added, removed, updated: {id: [from, to]} } — after
// every transaction. The diff IS the wire format: sync relays, op logs and
// undo history all speak it. Records are treated as immutable; an update
// replaces the object, so [from, to] pairs stay true.
// Dependency-free ESM: runs in any modern browser as-is, no build step.

let seq = 0
export const newId = (p = 'shape') =>
  p + ':' + Date.now().toString(36) + (seq++ % 1296).toString(36).padStart(2, '0') + Math.random().toString(36).slice(2, 6)

const emptyDiff = () => ({ added: {}, removed: {}, updated: {} })

export const isDiffEmpty = (d) =>
  !d ||
  (Object.keys(d.added).length === 0 && Object.keys(d.removed).length === 0 && Object.keys(d.updated).length === 0)

export const invertDiff = (d) => ({
  added: { ...d.removed },
  removed: { ...d.added },
  updated: Object.fromEntries(Object.entries(d.updated).map(([id, [from, to]]) => [id, [to, from]])),
})

// squash b onto a (both applied in order) into one equivalent diff
export const composeDiff = (a, b) => {
  const out = { added: { ...a.added }, removed: { ...a.removed }, updated: { ...a.updated } }
  for (const [id, rec] of Object.entries(b.added)) {
    if (out.removed[id]) {
      // removed then re-added: net update (or nothing if identical)
      const before = out.removed[id]
      delete out.removed[id]
      out.updated[id] = [before, rec]
    } else out.added[id] = rec
  }
  for (const [id, [from, to]] of Object.entries(b.updated)) {
    if (out.added[id]) out.added[id] = to
    else if (out.updated[id]) out.updated[id] = [out.updated[id][0], to]
    else out.updated[id] = [from, to]
  }
  for (const [id, rec] of Object.entries(b.removed)) {
    if (out.added[id]) delete out.added[id]
    else if (out.updated[id]) {
      out.removed[id] = out.updated[id][0]
      delete out.updated[id]
    } else out.removed[id] = rec
  }
  return out
}

export class Store {
  constructor() {
    this.records = new Map()
    this.listeners = new Set() // { fn, source: 'user' | 'remote' | 'all' }
    this.historyListeners = new Set()
    this.undos = []
    this.redos = []
    this._batch = null // open history batch: composed diff
    this._tx = null // { diff, source } while inside transact
  }

  get(id) { return this.records.get(id) }
  has(id) { return this.records.has(id) }
  ids() { return [...this.records.keys()] }
  all() { return [...this.records.values()] }
  shapes() { return this.all().filter((r) => r.typeName !== 'asset') }
  asset(id) { const r = this.records.get(id); return r && r.typeName === 'asset' ? r : null }
  get size() { return this.records.size }

  // fn: (source) => void, fires with (diff, source) after each transaction.
  // source filter: listen only to local edits ('user'), only applied remote
  // diffs ('remote'), or everything ('all', default).
  listen(fn, { source = 'all' } = {}) {
    const l = { fn, source }
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  _emit(diff, source) {
    for (const l of [...this.listeners]) {
      if (l.source !== 'all' && l.source !== source) continue
      try { l.fn(diff, source) } catch (e) { console.warn('board listener failed', e) }
    }
  }

  // fires whenever canUndo/canRedo may have changed — including at the END of
  // a gesture batch, which emits no document diff of its own. Toolbars listen
  // here, not on document changes, or they go stale.
  listenHistory(fn) {
    this.historyListeners.add(fn)
    return () => this.historyListeners.delete(fn)
  }

  _notifyHistory() {
    for (const fn of [...this.historyListeners]) {
      try { fn() } catch (e) { console.warn('board history listener failed', e) }
    }
  }

  // Every mutation happens inside a transaction; nested calls share the outer
  // one. One diff is emitted per outermost transact.
  transact(fn, source = 'user') {
    if (this._tx) { fn(); return }
    this._tx = { diff: emptyDiff(), source }
    try { fn() } finally {
      const { diff } = this._tx
      this._tx = null
      if (!isDiffEmpty(diff)) {
        if (source === 'user' && !this._applyingHistory) {
          if (this._batch) this._batch = composeDiff(this._batch, diff)
          else {
            this.undos.push(diff)
            if (this.undos.length > 256) this.undos.shift()
          }
          this.redos.length = 0
        }
        this._emit(diff, source)
        if (source === 'user') this._notifyHistory()
      }
    }
  }

  put(rec, source = 'user') {
    this.transact(() => {
      const prev = this.records.get(rec.id)
      this.records.set(rec.id, rec)
      const d = this._tx.diff
      if (prev) {
        if (d.added[rec.id]) d.added[rec.id] = rec
        else if (d.updated[rec.id]) d.updated[rec.id] = [d.updated[rec.id][0], rec]
        else d.updated[rec.id] = [prev, rec]
      } else if (d.removed[rec.id]) {
        const before = d.removed[rec.id]
        delete d.removed[rec.id]
        d.updated[rec.id] = [before, rec]
      } else d.added[rec.id] = rec
    }, source)
  }

  // shallow patch; `props` (when given) merges into rec.props
  update(id, patch, source = 'user') {
    const prev = this.records.get(id)
    if (!prev) return
    const next = { ...prev, ...patch, ...(patch.props ? { props: { ...prev.props, ...patch.props } } : {}) }
    this.put(next, source)
  }

  remove(idList, source = 'user') {
    this.transact(() => {
      for (const id of idList) {
        const prev = this.records.get(id)
        if (!prev) continue
        this.records.delete(id)
        const d = this._tx.diff
        if (d.added[id]) delete d.added[id]
        else if (d.updated[id]) { d.removed[id] = d.updated[id][0]; delete d.updated[id] }
        else d.removed[id] = prev
      }
    }, source)
  }

  applyDiff(diff, source = 'remote') {
    this.transact(() => {
      for (const rec of Object.values(diff.added || {})) this.put(rec, source)
      for (const [, [, to]] of Object.entries(diff.updated || {})) this.put(to, source)
      this.remove(Object.keys(diff.removed || {}), source)
    }, source)
  }

  // ---- history: one entry per gesture ---------------------------------------
  // beginBatch/endBatch bracket a gesture (a stroke, a drag, a text edit) so
  // its many transactions undo as one.
  beginBatch() { if (!this._batch) this._batch = emptyDiff() }
  endBatch() {
    const b = this._batch
    this._batch = null
    if (b && !isDiffEmpty(b)) {
      this.undos.push(b)
      if (this.undos.length > 256) this.undos.shift()
      this.redos.length = 0
      this._notifyHistory()
    }
  }

  get canUndo() { return this.undos.length > 0 }
  get canRedo() { return this.redos.length > 0 }

  // Undo applies the inverse as a 'user' diff — peers and the op log see it
  // like any other edit — without re-entering the history stacks.
  // The stacks move BEFORE the apply emits, so listeners reading canUndo /
  // canRedo during the emission (a toolbar refresh) see the settled state.
  undo() {
    this.endBatch()
    const d = this.undos.pop()
    if (!d) return
    this.redos.push(d)
    this._applyingHistory = true
    try { this.applyDiff(invertDiff(d), 'user') } finally { this._applyingHistory = false }
    this._notifyHistory()
  }

  redo() {
    const d = this.redos.pop()
    if (!d) return
    this.undos.push(d)
    this._applyingHistory = true
    try { this.applyDiff(d, 'user') } finally { this._applyingHistory = false }
    this._notifyHistory()
  }

  // ---- snapshots ------------------------------------------------------------
  // Envelope matches what the relay/op-log always carried:
  // { document: { store: { id: record } } }
  getSnapshot() {
    return { document: { store: Object.fromEntries(this.records) } }
  }

  // replace the whole document (remote by default: not undoable, but emitted)
  loadSnapshot(snap, source = 'remote') {
    const recs = snap?.document?.store || {}
    this.transact(() => {
      this.remove(this.ids(), source)
      for (const rec of Object.values(recs)) if (rec && rec.id) this.put(rec, source)
    }, source)
    // this is a document swap, not an edit: history built against the old
    // document is invalid (its diffs reference records that no longer exist),
    // and stale canUndo/canRedo would leave toolbars lit on a fresh board
    this.undos.length = 0
    this.redos.length = 0
    this._batch = null
    this._notifyHistory()
  }

  clear(source = 'user') {
    this.remove(this.ids(), source)
  }

  maxZ() {
    let z = 0
    for (const r of this.records.values()) if (r.z > z) z = r.z
    return z
  }
  minZ() {
    let z = 0
    for (const r of this.records.values()) if (r.z < z) z = r.z
    return z
  }
}
