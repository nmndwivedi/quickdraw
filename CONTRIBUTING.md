# Contributing to Quickdraw

Thanks for helping! All contributors are expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md). A few things keep this codebase what
it is:

## Principles

- **Zero runtime dependencies in the core.** The engine is plain ESM that runs
  in any modern browser without a build step. Anything that would add a
  dependency needs a very good reason.
- **Records are immutable.** An update replaces the record object; diffs hold
  `[from, to]` pairs that must stay true. Never mutate a record in place.
- **One undo entry per gesture.** Bracket multi-transaction gestures with
  `beginBatch()` / `endBatch()`.
- **The diff is the wire format.** Changes to its shape are breaking changes
  for every sync and persistence consumer.

## Working on it

```bash
npm install
npm test                # vitest, all packages
npm run dev             # react demo playground
npm run typecheck       # keep types/index.d.ts honest
npm run build           # regenerate the RN WebView bundle after core changes
```

`examples/vanilla/index.html` (served statically from the repo root) is the
fastest way to poke the raw engine.

## Pull requests

- Add or update tests for what you change — engine behavior lives in
  `packages/core/test`, protocol behavior in `packages/react-native/test`.
- Hand-written type declarations live in each package's `types/index.d.ts`;
  update them together with API changes.
- Keep comments in the existing voice: explain *why*, not *what*.

## Add your project to the showcase

Built something with Quickdraw? Add it to the
["Made with Quickdraw" table in the README](README.md#made-with-quickdraw) —
it's the standard drill:

1. Edit `README.md` and add one row to the table, keeping it alphabetical.
2. Link the project name to a live URL (or the repo if it isn't public yet),
   and keep the description to 15 words or fewer, no superlatives.
3. Open a PR titled `showcase: <project name>`. Nothing else in the diff.

Any real project that ships Quickdraw qualifies — side projects included.
We only skip entries that are dead links, NSFW, or pure landing pages with no
product behind them.
