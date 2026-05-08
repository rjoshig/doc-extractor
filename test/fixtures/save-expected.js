#!/usr/bin/env node
/**
 * Run extract() against each generated .docx fixture and write the resulting
 * IR JSON (with a frozen extractedAt) into test/fixtures/expected/.
 *
 * Run after editing the parser if you want to regenerate the expected IR
 * snapshots. Review the diff before committing.
 */

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from '../../src/extract.js';
import { writeIR } from '../../src/output.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, 'docs');
const EXPECTED_DIR = path.resolve(__dirname, 'expected');
const FROZEN_TS = '2026-05-08T00:00:00.000Z';

const files = (await readdir(DOCS_DIR)).filter((n) => n.toLowerCase().endsWith('.docx'));
for (const name of files) {
  const inPath = path.join(DOCS_DIR, name);
  const outPath = path.join(EXPECTED_DIR, name.replace(/\.docx$/i, '.json'));
  const { ir, validation } = await extract(inPath, { extractedAt: FROZEN_TS });
  if (!validation.valid) {
    console.error(`INVALID IR for ${name}:`, validation.errors);
    process.exitCode = 1;
  }
  const written = await writeIR(ir, outPath);
  console.log(`wrote ${written}`);
}
