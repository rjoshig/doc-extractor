# doc-extractor

A Node.js tool that reads `.docx` files and extracts their structured content — sections, headings, paragraphs, lists, and tables — into a clean JSON intermediate representation (IR). The IR is designed to be easy for both humans and downstream LLMs to read.

This repository contains the **extraction layer only**. Conversion of the IR to a target format (via an LLM or otherwise) is out of scope.

## What it does

1. Reads a `.docx` file (DOCX → HTML via [`mammoth`](https://www.npmjs.com/package/mammoth)).
2. Walks the resulting HTML with [`cheerio`](https://www.npmjs.com/package/cheerio).
3. Groups content into named sections (driven by headings).
4. Emits a deterministic JSON IR validated against `schemas/document-ir.schema.json` (via [`ajv`](https://www.npmjs.com/package/ajv)).

## Setup

```bash
nvm use            # uses Node 20 (see .nvmrc)
npm install
```

## Usage

### Single file (print to stdout)

```bash
./bin/extract.js path/to/document.docx
```

### Single file (write to a file)

```bash
./bin/extract.js path/to/document.docx --out /tmp/document.ir.json
```

### Batch a directory

```bash
./bin/extract.js --batch ./data/inputs --out ./data/outputs
```

Every `.docx` in the input directory is processed, producing a sibling `<name>.json` in the output directory.

### NPM scripts

```bash
npm test            # run all tests once
npm run test:watch  # watch mode
npm run lint        # eslint
npm run format      # prettier write
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
