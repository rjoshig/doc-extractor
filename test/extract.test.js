/**
 * End-to-end tests against generated fixture .docx files.
 *
 * Strategy:
 *   - Run extract() on each fixture in test/fixtures/docs/.
 *   - Assert the IR validates against the schema.
 *   - Assert the resulting IR (with extractedAt normalized) matches the JSON in
 *     test/fixtures/expected/<name>.json if such a file exists.
 *   - If no expected JSON exists yet, the test still passes the schema check —
 *     so end-to-end coverage exists from day one and `/add-fixture` can grow it.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from '../src/extract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, 'fixtures/docs');
const EXPECTED_DIR = path.resolve(__dirname, 'fixtures/expected');

const FROZEN_TS = '2026-05-08T00:00:00.000Z';

let docxFiles = [];

beforeAll(async () => {
  if (!existsSync(DOCS_DIR)) return;
  docxFiles = readdirSync(DOCS_DIR).filter((n) => n.toLowerCase().endsWith('.docx'));
  if (docxFiles.length === 0) {
    // Generate them on-demand so a fresh clone passes `npm test` immediately.
    await import('./fixtures/generate.js');
    docxFiles = readdirSync(DOCS_DIR).filter((n) => n.toLowerCase().endsWith('.docx'));
  }
});

describe('extract (e2e against fixtures)', () => {
  it('finds at least 2 fixture .docx files', () => {
    expect(docxFiles.length).toBeGreaterThanOrEqual(2);
  });

  it.each([
    'simple-sections-and-tables.docx',
    'headings-only-and-preamble.docx',
  ])('extracts %s into a schema-valid IR', async (name) => {
    const inputPath = path.join(DOCS_DIR, name);
    expect(existsSync(inputPath)).toBe(true);

    const { ir, validation } = await extract(inputPath, { extractedAt: FROZEN_TS });
    expect(validation.valid, JSON.stringify(validation.errors, null, 2)).toBe(true);

    expect(ir.metadata.filename).toBe(name);
    expect(ir.metadata.extractedAt).toBe(FROZEN_TS);
    expect(Array.isArray(ir.sections)).toBe(true);

    const expectedPath = path.join(EXPECTED_DIR, name.replace(/\.docx$/i, '.json'));
    if (existsSync(expectedPath)) {
      const expected = JSON.parse(await readFile(expectedPath, 'utf8'));
      expect(ir).toEqual(expected);
    }
  });

  it('simple-sections-and-tables produces the expected high-level shape', async () => {
    const { ir } = await extract(
      path.join(DOCS_DIR, 'simple-sections-and-tables.docx'),
      { extractedAt: FROZEN_TS }
    );
    const headings = ir.sections.map((s) => s.heading);
    expect(headings).toContain('Product Details');
    expect(headings).toContain('Deliverables');

    const productDetails = ir.sections.find((s) => s.heading === 'Product Details');
    const tableBlock = productDetails.content.find((b) => b.type === 'table');
    expect(tableBlock).toBeDefined();
    expect(tableBlock.columns).toEqual(['Column A', 'Column B', 'Column C', 'Column D']);
    expect(tableBlock.hasHeader).toBe(true);
    expect(tableBlock.rows.length).toBe(2);
    expect(tableBlock.rows[0]['Column A']).toBe('A1');
  });

  it('headings-only-and-preamble emits a Preamble section', async () => {
    const { ir } = await extract(
      path.join(DOCS_DIR, 'headings-only-and-preamble.docx'),
      { extractedAt: FROZEN_TS }
    );
    expect(ir.sections[0].heading).toBe('Preamble');
    expect(ir.sections[0].content.length).toBeGreaterThan(0);

    const empty = ir.sections.find((s) => s.heading === 'Empty Section');
    expect(empty).toBeDefined();
    expect(empty.content).toEqual([]);
  });
});
