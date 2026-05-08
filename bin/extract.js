#!/usr/bin/env node
/**
 * CLI entry point.
 *
 * Usage:
 *   ./bin/extract.js <path-to-docx>                       Print IR JSON to stdout
 *   ./bin/extract.js <path-to-docx> --out <path>          Write IR to file
 *   ./bin/extract.js --batch <input-dir> --out <out-dir>  Process all .docx in input-dir
 *
 * Exit codes:
 *   0 — success
 *   1 — usage error or fatal extraction error
 *   2 — extraction succeeded but IR failed schema validation (still printed/written)
 */

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { extract } from '../src/extract.js';
import { writeIR } from '../src/output.js';

const USAGE = `Usage:
  extract <path-to-docx>
  extract <path-to-docx> --out <output.json>
  extract --batch <input-dir> --out <output-dir>
`;

main().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.batch && !args.input)) {
    process.stdout.write(USAGE);
    process.exit(args.help ? 0 : 1);
  }

  if (args.batch) {
    if (!args.out) {
      console.error('Error: --batch requires --out <output-dir>');
      process.stdout.write(USAGE);
      process.exit(1);
    }
    const code = await runBatch(args.batch, args.out);
    process.exit(code);
  }

  const code = await runSingle(args.input, args.out);
  process.exit(code);
}

/**
 * @param {string[]} argv
 * @returns {{ input?: string, out?: string, batch?: string, help?: boolean }}
 */
function parseArgs(argv) {
  /** @type {any} */
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out.help = true;
    } else if (a === '--out' || a === '-o') {
      out.out = argv[++i];
    } else if (a === '--batch') {
      out.batch = argv[++i];
    } else if (!a.startsWith('-')) {
      if (!out.input) out.input = a;
    } else {
      console.error(`Unknown flag: ${a}`);
      out.help = true;
    }
  }
  return out;
}

/**
 * @returns {Promise<0 | 1 | 2>}
 */
async function runSingle(inputPath, outPath) {
  if (!inputPath) {
    console.error('Error: missing input .docx path');
    return 1;
  }
  const { ir, validation } = await extract(inputPath);
  if (outPath) {
    const written = await writeIR(ir, outPath);
    console.error(`Wrote ${written}`);
  } else {
    process.stdout.write(JSON.stringify(ir, null, 2) + '\n');
  }
  return validation.valid ? 0 : 2;
}

/**
 * @returns {Promise<0 | 1 | 2>}
 */
async function runBatch(inputDir, outputDir) {
  const inDirAbs = path.resolve(inputDir);
  const inStat = await stat(inDirAbs).catch(() => null);
  if (!inStat || !inStat.isDirectory()) {
    console.error(`Error: ${inputDir} is not a directory`);
    return 1;
  }

  const entries = await readdir(inDirAbs);
  const docxFiles = entries.filter((n) => n.toLowerCase().endsWith('.docx'));
  if (docxFiles.length === 0) {
    console.error(`No .docx files found in ${inDirAbs}`);
    return 0;
  }

  let allValid = true;
  for (const name of docxFiles) {
    const inPath = path.join(inDirAbs, name);
    const outPath = path.join(outputDir, name.replace(/\.docx$/i, '.json'));
    try {
      const { ir, validation } = await extract(inPath);
      const written = await writeIR(ir, outPath);
      const status = validation.valid ? 'ok' : 'INVALID';
      console.error(`[${status}] ${name} → ${written}`);
      if (!validation.valid) allValid = false;
      void ir;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      allValid = false;
    }
  }
  return allValid ? 0 : 2;
}
