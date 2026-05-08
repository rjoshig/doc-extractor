---
description: Add a new test fixture pair (.docx + expected IR JSON) and wire it into the test suite.
---

# /add-fixture — add a new test fixture

Use this command to grow the end-to-end test corpus. A fixture is a pair of files:

- `test/fixtures/docs/<name>.docx` — the input
- `test/fixtures/expected/<name>.json` — the expected IR

## Steps

1. **Ask the user for the source `.docx` path** (absolute or relative to the repo root). If `$ARGUMENTS` already contains a path, use it without re-asking.
2. **Validate** that the file exists and ends in `.docx`. Stop and report if not.
3. **Pick a fixture name**: derive `<name>` from the source filename (strip extension, kebab-case).
4. **Copy** the file to `test/fixtures/docs/<name>.docx`.
5. **Run extraction** to produce the candidate IR:

   ```bash
   ./bin/extract.js test/fixtures/docs/<name>.docx --out test/fixtures/expected/<name>.json
   ```

6. **Show the user a short summary**: number of sections, content-block counts per section, any `parserNotes` or `warnings`.
7. **Open `test/fixtures/expected/<name>.json` for the user to review** before committing — surface this in your output text. The IR should be edited until it represents the **desired** extraction output, not just the current behavior, so the test will catch regressions.
8. **Wire the fixture into `test/extract.test.js`**:
   - Read the file. If a fixture-driven `it.each` / loop already exists, no change needed.
   - Otherwise add an `it()` block that runs `extract()` on the new file and `expect(ir).toEqual(expected)`.
9. **Run `npm test`** and report results.

## Notes for the assistant

- Do not commit anything. The user reviews and commits.
- If extraction prints validation errors, surface them prominently — the fixture should not be saved as-is until the IR is valid.
- If the user wants a hand-crafted expected IR (e.g. testing a contrived edge case), still save the extracted IR to disk, then guide the user through the diffs they need to make.
