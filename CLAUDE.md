# doc-extractor — Claude Code guidance

## Bootstrap on a fresh checkout (READ THIS FIRST)

If you are reading this file in an otherwise empty directory (no `package.json`, no `src/`), the user has dropped this `CLAUDE.md` into a new repo and intends to copy the source code over **manually** from GitHub afterward (organization policy blocks `git pull` from the upstream private repo).

**Your job on first run is to scaffold the full directory tree as empty placeholder files.** Do not invent code. Do not run `npm install`. Just create the structure below so the user has every file in the right place to paste content into.

### Steps

1. Create every directory in the tree below.
2. Create every listed file as an **empty** file (zero bytes), except for the four `.gitkeep` placeholders (also empty — same thing) and any file marked **`(seed content)`** in the notes — for those, write the exact content shown in the "Seed content for non-source files" subsection.
3. After scaffolding, tell the user:
   - "Directory tree created. Paste the source for each file from GitHub, then run `chmod +x bin/extract.js && npm install && npm test`."
4. Do **not** create files that aren't in this tree. Do **not** run `npm init` — `package.json` will be pasted in by the user.

### Directory + file tree

```
doc-extractor/
├── bin/
│   └── extract.js                              # CLI entry (will need chmod +x after paste)
├── data/
│   ├── inputs/
│   │   └── .gitkeep
│   └── outputs/
│       └── .gitkeep
├── schemas/
│   └── document-ir.schema.json
├── scripts/
│   └── generate-sample-input.js                # generates data/inputs/sample-sow.docx
├── src/
│   ├── parser/
│   │   ├── docx-to-html.js
│   │   ├── filename.js
│   │   ├── html-to-ir.js
│   │   ├── section-builder.js
│   │   ├── slug.js
│   │   └── table-extractor.js
│   ├── config.js
│   ├── extract.js
│   ├── output.js
│   └── validate.js
├── test/
│   ├── fixtures/
│   │   ├── docs/
│   │   │   └── README.md
│   │   ├── expected/
│   │   ├── generate.js                         # programmatic .docx fixture generator
│   │   └── save-expected.js                    # refresh expected IR snapshots
│   ├── extract.test.js
│   ├── filename.test.js
│   ├── parser.test.js
│   ├── section-builder.test.js
│   ├── slug.test.js
│   └── table-extractor.test.js
├── .claude/
│   └── commands/
│       └── add-fixture.md
├── .env.example
├── .eslintrc.json
├── .gitignore                                  # (seed content)
├── .nvmrc                                      # (seed content)
├── .prettierrc.json
├── CLAUDE.md                                   # this file (already exists)
├── README.md
├── package.json
└── vitest.config.js
```

Files NOT in the tree above (do not create): `package-lock.json` (npm generates it), `node_modules/`, `coverage/`, generated `.docx`/`.json` artifacts in `data/`, and `.claude/settings.local.json` (auto-managed).

### Seed content for non-source files

Two files are useful enough to seed even before the user pastes code, because they shape what the rest of the workflow does:

**`.nvmrc`**

```
20
```

**`.gitignore`**

```
node_modules
.env
data/inputs/*.docx
data/outputs/*.json
!data/inputs/.gitkeep
!data/outputs/.gitkeep
coverage
*.log
```

Everything else in the tree starts as a zero-byte file. The user will paste each file's content from GitHub.

### After the user has pasted source

Once files are populated, run:

```bash
chmod +x bin/extract.js
npm install
npm test
npm run lint
```

If any of those fail, work with the user to diagnose — most likely a paste was missed or truncated. Cross-reference against this `CLAUDE.md` to spot what's empty when it shouldn't be.

---

## Purpose

`doc-extractor` reads `.docx` files and emits a clean, deterministic JSON intermediate representation (IR) describing the document's sections, headings, paragraphs, lists, and tables. The IR is the contract between this extractor and any downstream consumer (typically an LLM that converts the IR to a target format). **Only the extraction layer lives here** — LLM calls, target-format conversion, and semantic interpretation are explicitly out of scope.

## Tech stack

- Node.js **20+**, ESM (`"type": "module"`)
- `mammoth` ^1.8 — DOCX → HTML
- `cheerio` ^1.0 — HTML walk
- `ajv` ^8 (+ `ajv-formats`) — IR schema validation
- `vitest` ^2 — tests
- `eslint` ^8 + `prettier` ^3
- `docx` ^9 (devDependency) — generates fixture .docx files programmatically

No TypeScript. No other parsing libraries. No LLM dependencies.

## Pipeline

```
.docx → mammoth → HTML → cheerio walk → section tree → IR → ajv validate
```

## Module-by-module responsibilities

- `bin/extract.js` — CLI entry; parses argv; dispatches single-file or batch mode.
- `src/extract.js` — orchestrates a single file end-to-end (path → IR + validation).
- `src/parser/docx-to-html.js` — wraps `mammoth.convertToHtml`; returns `{ html, messages, warnings }`.
- `src/parser/html-to-ir.js` — top-level integrator: cheerio-loads HTML, extracts blocks in document order, hands off to `section-builder`.
- `src/parser/section-builder.js` — groups an ordered list of blocks under their parent headings; produces the final `sections` array.
- `src/parser/table-extractor.js` — turns a single cheerio `<table>` element into the IR table shape.
- `src/parser/filename.js` — `sanitizeFilename` + `ensureSanitizedPath`; replaces whitespace in basenames with `_` and renames the file on disk.
- `src/parser/slug.js` — `slugify(text)` utility; handles duplicate-slug suffixing at the section level.
- `src/validate.js` — ajv-based IR validation. Returns `{ valid, errors }`.
- `src/output.js` — writes IR JSON to disk (UTF-8, 2-space indent).
- `src/config.js` — reads env, exposes constants.
- `scripts/generate-sample-input.js` — one-shot generator for a multi-page sample SOW into `data/inputs/sample-sow.docx`.
- `test/fixtures/generate.js` — programmatic `.docx` test fixtures.
- `test/fixtures/save-expected.js` — refreshes `test/fixtures/expected/*.json` from the current parser.

## Coding conventions

- ESM only.
- Named exports; no `export default`.
- Plain functions; **no classes**.
- `async`/`await`; do not use `.then`.
- JSDoc on every exported function (param/return types).
- `console` for logging (no extra logging library).
- Keep modules small and single-purpose.

## The IR is the contract

Any change to the IR shape **must** update `schemas/document-ir.schema.json` AND the corresponding tests in lockstep. Tests are paired fixture-by-fixture: `test/fixtures/docs/<name>.docx` + `test/fixtures/expected/<name>.json`.

## How to run

```bash
npm install
npm test                                                # run all tests
./bin/extract.js test/fixtures/docs/<file>.docx         # → data/outputs/<file>.json
./bin/extract.js <file>.docx --out /tmp/out.json        # → custom path
./bin/extract.js --batch                                # data/inputs → data/outputs (defaults)
./bin/extract.js -b                                     # shorthand
./bin/extract.js --batch <in-dir> --out <out-dir>       # custom dirs
```

### CLI invariants

- Filenames with whitespace are **renamed at source** before extraction (`"Zoho Temple.docx"` → `Zoho_Temple.docx`). Implemented in `src/parser/filename.js` (`sanitizeFilename`, `ensureSanitizedPath`).
- Default output for a single file is `data/outputs/<sanitized-input-basename>.json`.
- `--batch` / `-b` defaults the input dir to `INPUT_DIR` (`data/inputs`) and output dir to `OUTPUT_DIR` (`data/outputs`); both are overridable.
- The CLI never writes IR to stdout. Progress is logged via `console.log`: `Reading: …` / `Writing: …` / `Completed successfully` (or `Failed: <reason>`). The orchestrator (`src/extract.js`) is silent — all logging is owned by `bin/extract.js`.

## Adding a new test fixture

Use the `/add-fixture` slash command (see `.claude/commands/add-fixture.md`). The command:

1. Asks for a `.docx` path.
2. Copies it into `test/fixtures/docs/`.
3. Runs extraction and saves the IR into `test/fixtures/expected/<same-name>.json`.
4. Prompts you to manually review the expected JSON before committing.
5. Adds an `it()` block to `test/extract.test.js` if not already covered.

To generate the bundled programmatic fixtures: `npm run fixtures:generate`.

## Handling unknown structures

The parser must **never crash** on weird input. Instead:

- Log a warning to `console.warn`.
- Append a string to `ir.parserNotes` describing the situation.
- For genuinely unrecognized HTML elements, append `{ type: 'unknown', html: '...' }` to the current section's `content` and add an entry to the IR-level `unknownBlocks` array containing the raw HTML.

Always keep the IR valid against the schema.

## Out of scope (do NOT add)

- LLM calls or any AI/embedding dependency.
- Target-format conversion (e.g., DOCX → some other format).
- Semantic interpretation of content (do not classify, summarize, or transform values).
- OCR of images.
- Embedded objects (OLE, charts, equations beyond text).
- Comments and track-changes markup — drop them.
- Footnotes / endnotes — drop them for MVP.

## Known edge cases the parser handles

- Document with no headings → single "Preamble" section.
- Section with only a heading → empty `content` array (NOT omitted).
- Tables before any heading → live in the implicit Preamble section.
- Nested tables → flatten the inner table to text in the parent cell; record in `parserNotes`.
- Empty document → IR with `sections: []`, still schema-valid.
- Heading immediately followed by another heading → first section's `content` is `[]`.
- Tables with merged header cells → `hasMergedHeader: true`, best-effort columns, warning recorded.
- Duplicate slugs → suffixed `-2`, `-3`, ...

## Pre-commit checklist

- `npm run lint` clean.
- `npm test` green.
- If the IR shape changed: schema + fixtures + tests all updated together.
