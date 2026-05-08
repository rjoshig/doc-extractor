# doc-extractor

A Node.js tool that reads `.docx` files and extracts their structured content — sections, headings, paragraphs, lists, and tables — into a clean JSON intermediate representation (IR). The IR is designed to be easy for both humans and downstream LLMs to read.

This repository contains the **extraction layer only**. Conversion of the IR to a target format (via an LLM or otherwise) is out of scope.

## What it does

1. Reads a `.docx` file (DOCX → HTML via [`mammoth`](https://www.npmjs.com/package/mammoth)).
2. Walks the resulting HTML with [`cheerio`](https://www.npmjs.com/package/cheerio).
3. Groups content into named sections (driven by headings).
4. Emits a deterministic JSON IR validated against `schemas/document-ir.schema.json` (via [`ajv`](https://www.npmjs.com/package/ajv)).

## Quick start (fresh clone)

```bash
# 1. Clone
git clone git@github.com:rjoshig/doc-extractor.git
cd doc-extractor

# 2. Use Node 20+ (matches .nvmrc)
nvm use            # or: nvm install 20 && nvm use 20

# 3. Install deps
npm install

# 4. Verify everything works
npm test           # 37 tests should pass
npm run lint       # should be clean
```

If you maintain multiple GitHub identities via `~/.ssh/config` host aliases, replace the clone URL with your alias, e.g. `git@github-rjoshig:rjoshig/doc-extractor.git`.

If `./bin/extract.js` complains about permissions after a fresh clone on Windows/WSL, run `chmod +x bin/extract.js` once.

## Try the CLI

### Smoke-test against bundled fixtures

```bash
# Single-file: writes to data/outputs/<name>.json by default
./bin/extract.js test/fixtures/docs/simple-sections-and-tables.docx

# Or specify an explicit destination
./bin/extract.js test/fixtures/docs/simple-sections-and-tables.docx --out /tmp/out.json
```

### Generate and extract the multi-page sample SOW

A larger example document (8+ pages, varied table widths from 2 to 6 columns) can be generated programmatically:

```bash
node scripts/generate-sample-input.js                          # writes data/inputs/sample-sow.docx
./bin/extract.js data/inputs/sample-sow.docx                   # → data/outputs/sample-sow.json
```

### Run on your own documents

```bash
# Drop your .docx files into data/inputs/ (gitignored)
cp /path/to/your-file.docx data/inputs/

# Single file → data/outputs/<same-name>.json (default)
./bin/extract.js data/inputs/your-file.docx

# Batch every .docx in data/inputs/ → data/outputs/ (defaults baked in)
./bin/extract.js --batch
./bin/extract.js -b           # shorthand
```

## CLI behavior

| Mode | Command |
| --- | --- |
| Single file → `data/outputs/<name>.json` | `./bin/extract.js path/to/file.docx` |
| Single file → custom path | `./bin/extract.js path/to/file.docx --out out.json` |
| Batch (defaults: `data/inputs` → `data/outputs`) | `./bin/extract.js --batch` or `-b` |
| Batch with custom dirs | `./bin/extract.js --batch <in-dir> --out <out-dir>` |

Notes:

- **Filenames are normalized at source.** If an input filename contains whitespace, the file is renamed in place ("Zoho Temple 2020.docx" → "Zoho_Temple_2020.docx") before extraction. The output JSON inherits the sanitized name. If a sanitized target already exists, the rename is skipped and a warning is logged.
- **Output is always written to disk** — nothing is printed to stdout. Progress is logged step-by-step:
  ```
  [1/3] Reading: data/inputs/Zoho_Temple_2020.docx
  [1/3] Writing: data/outputs/Zoho_Temple_2020.json
  [1/3] Completed successfully
  ```
- **Exit codes:** `0` all OK, `1` usage / fatal error, `2` extraction succeeded but at least one IR failed schema validation (the IR is still written).

## NPM scripts

```bash
npm test                              # run all tests once
npm run test:watch                    # vitest watch mode
npm run lint                          # eslint
npm run format                        # prettier write
node test/fixtures/generate.js        # rebuild bundled test .docx fixtures
node test/fixtures/save-expected.js   # refresh expected IR snapshots after a parser change
node scripts/generate-sample-input.js # regenerate data/inputs/sample-sow.docx
```

## IR shape (overview)

```json
{
  "metadata": {
    "filename": "example.docx",
    "extractedAt": "2026-05-08T12:00:00.000Z",
    "title": "Example Document"
  },
  "sections": [
    {
      "id": "product-details",
      "heading": "Product Details",
      "level": 1,
      "content": [
        { "type": "paragraph", "text": "Some prose." },
        {
          "type": "table",
          "name": "Product Details",
          "columns": ["A", "B", "C", "D"],
          "hasHeader": true,
          "rows": [{ "A": "1", "B": "2", "C": "3", "D": "4" }]
        },
        { "type": "list", "ordered": false, "items": ["one", "two"] }
      ]
    }
  ],
  "parserNotes": [],
  "warnings": []
}
```

The full schema is in [`schemas/document-ir.schema.json`](./schemas/document-ir.schema.json).

## Project structure

```
bin/extract.js          CLI entry, executable
src/extract.js          orchestrator: file → IR
src/parser/             docx-to-html, html-to-ir, table-extractor, section-builder, slug
src/validate.js         ajv-based IR validation
src/output.js           writes IR JSON
src/config.js           env / constants
schemas/                JSON Schema for the IR
data/inputs/            drop .docx here for ad-hoc use (gitignored)
data/outputs/           IR JSONs written here (gitignored)
test/fixtures/docs/     sample .docx files for tests
test/fixtures/expected/ paired expected IR JSON
.claude/commands/       Claude Code slash commands (e.g. /add-fixture)
```

## Limitations

This MVP intentionally drops:

- Images (noted in `warnings`)
- Comments and track-changes markup
- Footnotes / endnotes
- Embedded objects, OCR
- Nested tables (the inner table content is flattened to a string in its parent cell, with a note in `parserNotes`)

Section nesting is **flat** — any heading (h1–h6) starts a new section. Pages are not semantic boundaries.

## Where to look next

- [`CLAUDE.md`](./CLAUDE.md) — Claude Code guidance for working in this repo.
- [`.claude/commands/add-fixture.md`](./.claude/commands/add-fixture.md) — `/add-fixture` slash command for adding a new test fixture pair.
- [`schemas/document-ir.schema.json`](./schemas/document-ir.schema.json) — the IR contract.
