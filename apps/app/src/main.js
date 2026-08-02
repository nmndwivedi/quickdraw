import { createQuickdraw } from '@quickdrawjs/core'
import '@quickdrawjs/core/quickdraw.css'

const LEGACY_DOC_KEY = 'quickdraw-app-doc'
const THEME_KEY = 'quickdraw-app-theme'
const INDEX_KEY = 'quickdraw-files'
const fileKey = (id) => `quickdraw-file:${id}`

const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
const theme = localStorage.getItem(THEME_KEY) || (prefersDark ? 'dark' : 'light')

const board = createQuickdraw({
  container: document.getElementById('board'),
  theme,
  grid: 'lines',
})

const { editor } = board
const { store } = editor

// ---- file index -------------------------------------------------------------
// { current: id, files: [{ id, name, updatedAt }] } in localStorage; each
// file's snapshot lives under its own key so one huge board can't corrupt
// the rest.
const newId = () => `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

function loadIndex() {
  try {
    const idx = JSON.parse(localStorage.getItem(INDEX_KEY))
    if (idx && Array.isArray(idx.files) && idx.files.length) return idx
  } catch {}
  return null
}

function saveIndex() {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch {}
}

let index = loadIndex()
if (!index) {
  // First run on the new format: adopt the pre-files-era board, if any.
  const id = newId()
  index = { current: id, files: [{ id, name: 'Untitled', updatedAt: Date.now() }] }
  const legacy = localStorage.getItem(LEGACY_DOC_KEY)
  if (legacy) {
    try { localStorage.setItem(fileKey(id), legacy) } catch {}
    localStorage.removeItem(LEGACY_DOC_KEY)
  }
  saveIndex()
}

const currentFile = () =>
  index.files.find((f) => f.id === index.current) || index.files[0]

// ---- persistence ------------------------------------------------------------
let saveTimer

function saveNow() {
  clearTimeout(saveTimer)
  const file = currentFile()
  try {
    localStorage.setItem(fileKey(file.id), JSON.stringify(store.getSnapshot()))
    file.updatedAt = Date.now()
    saveIndex()
  } catch {
    // Quota exceeded (huge pasted images) — keep drawing, skip the save.
  }
}

function openFile(id, { fit = true } = {}) {
  const file = index.files.find((f) => f.id === id)
  if (!file) return
  index.current = file.id
  saveIndex()
  let snap = null
  try {
    const raw = localStorage.getItem(fileKey(file.id))
    if (raw) snap = JSON.parse(raw)
  } catch {
    // A corrupt document shouldn't brick the app — open it blank.
    localStorage.removeItem(fileKey(file.id))
  }
  store.loadSnapshot(snap || { document: { store: {} } }, 'remote')
  // A fresh file starts with a fresh history — undo shouldn't cross files.
  store.undos.length = 0
  store.redos.length = 0
  if (fit && snap) editor.fitContent()
  nameInput.value = file.name
}

store.listen(() => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveNow, 400)
})

// ---- file bar UI ------------------------------------------------------------
const filebar = document.getElementById('filebar')
const filesBtn = document.getElementById('files-btn')
const newBtn = document.getElementById('new-file-btn')
const nameInput = document.getElementById('file-name')
const menu = document.getElementById('files-menu')

function sizeNameInput() {
  // Grow with the text so the hover pill hugs the name.
  nameInput.style.width = `${Math.min(20, Math.max(4, nameInput.value.length + 1))}ch`
}

function renderMenu() {
  menu.textContent = ''
  const files = [...index.files].sort((a, b) => b.updatedAt - a.updatedAt)
  for (const file of files) {
    const row = document.createElement('div')
    row.className = `qd-file-row${file.id === index.current ? ' current' : ''}`
    row.setAttribute('role', 'menuitem')

    const dot = document.createElement('span')
    dot.className = 'dot'
    const name = document.createElement('span')
    name.className = 'name'
    name.textContent = file.name
    row.append(dot, name)

    if (index.files.length > 1) {
      const del = document.createElement('button')
      del.className = 'del'
      del.type = 'button'
      del.textContent = '×'
      del.title = `Delete “${file.name}”`
      del.setAttribute('aria-label', `Delete ${file.name}`)
      del.addEventListener('click', (e) => {
        e.stopPropagation()
        deleteFile(file.id)
      })
      row.append(del)
    }

    row.addEventListener('click', () => {
      closeMenu()
      if (file.id !== index.current) {
        saveNow()
        openFile(file.id)
      }
    })
    menu.append(row)
  }
}

function openMenu() {
  renderMenu()
  menu.hidden = false
  filesBtn.setAttribute('aria-expanded', 'true')
}

function closeMenu() {
  menu.hidden = true
  filesBtn.setAttribute('aria-expanded', 'false')
}

filesBtn.addEventListener('click', (e) => {
  e.stopPropagation()
  menu.hidden ? openMenu() : closeMenu()
})

document.addEventListener('pointerdown', (e) => {
  if (!menu.hidden && !menu.contains(e.target) && e.target !== filesBtn) closeMenu()
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) closeMenu()
})

function createFile() {
  saveNow()
  const id = newId()
  const n = index.files.length + 1
  index.files.push({ id, name: `Untitled ${n}`, updatedAt: Date.now() })
  openFile(id)
  closeMenu()
  nameInput.focus()
  nameInput.select()
}

newBtn.addEventListener('click', createFile)

function deleteFile(id) {
  const file = index.files.find((f) => f.id === id)
  if (!file || index.files.length <= 1) return
  if (!window.confirm(`Delete “${file.name}”? This can't be undone.`)) return
  index.files = index.files.filter((f) => f.id !== id)
  localStorage.removeItem(fileKey(id))
  if (index.current === id) {
    const next = [...index.files].sort((a, b) => b.updatedAt - a.updatedAt)[0]
    openFile(next.id)
  } else {
    saveIndex()
  }
  renderMenu()
}

// Rename: commit on Enter/blur, never allow an empty name.
nameInput.addEventListener('input', sizeNameInput)
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') nameInput.blur()
  if (e.key === 'Escape') {
    nameInput.value = currentFile().name
    nameInput.blur()
  }
  e.stopPropagation() // keep board shortcuts out of the input
})
nameInput.addEventListener('blur', () => {
  const name = nameInput.value.trim()
  const file = currentFile()
  if (name) {
    file.name = name
  }
  nameInput.value = file.name
  sizeNameInput()
  file.updatedAt = Date.now()
  saveIndex()
})

// Open the current file on load (no fit if the board is brand new).
openFile(currentFile().id)
sizeNameInput()

// Remember the theme across visits; the chrome follows the board through the
// root .dark class (the CSS variables up in index.html key off it).
const syncTheme = () => {
  const dark = editor.theme.id === 'dark'
  localStorage.setItem(THEME_KEY, editor.theme.id)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#1e1e1c' : '#faf8f4')
}
syncTheme()
editor.on('theme', syncTheme)

// Flush the debounced save before leaving.
window.addEventListener('beforeunload', saveNow)

window.board = board // devtools access, same as the examples
