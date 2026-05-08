# Test fixtures

Each fixture is a pair:

- `test/fixtures/docs/<name>.docx` — the input
- `test/fixtures/expected/<name>.json` — the expected IR output

The `.docx` files in this directory are **generated programmatically** by `test/fixtures/generate.js` using the `docx` package. This keeps the corpus reproducible and reviewable — the source of truth for fixture content lives in code, not in opaque binaries.

## Regenerating the fixtures

```bash
npm run fixtures:generate
```

This rewrites every `.docx` in `test/fixtures/docs/` from the definitions in `test/fixtures/generate.js`.

## Adding a new fixture

Two ways:

1. **Programmatic** (preferred for tests): add a new entry to `test/fixtures/generate.js`, regenerate, then add an expected IR JSON to `test/fixtures/expected/`.
2. **Real-world `.docx`**: use the `/add-fixture` slash command (see `.claude/commands/add-fixture.md`). It copies the file, runs extraction, and saves the result as the expected IR for you to review.

## Fixture naming

Use kebab-case, descriptive names. Examples in this corpus:

- `simple-sections-and-tables.docx` — happy path: 2 sections, each with prose + a table of different shape.
- `headings-only.docx` — edge case: heading-only sections, plus the implicit Preamble.
