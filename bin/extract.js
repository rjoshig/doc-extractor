#!/usr/bin/env node
/**
 * CLI entry point.
 *
 * Usage:
 *   extract <path-to-docx>                              Extract one file → data/outputs/<name>.json
 *   extract <path-to-docx> --out <path>                 Extract one file → custom path
 *   extract --batch [<input-dir>] [--out <out-dir>]     Batch all .docx (defaults: data/inputs → data/outputs)
 *   extract -b      [<input-dir>] [--out <out-dir>]     Same, shorthand
 *
 * Behavior:
 *   - Filenames containing whitespace are renamed at source ("Zoho Temple.docx" → "Zoho_Temple.docx").
 *   - Output is always written to disk; nothing is printed to stdout.
 *   - Progress is logged step-by-step: Reading / Writing / Completed / Failed.
 *
 * Exit codes:
 *   0 — all files succeeded and validated
 *   1 — usage error or fatal extraction error
 *   2 — extraction succeeded but at least one IR failed schema validation
 */

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { extract } from '../src/extract.js';
import { writeIR } from '../src/output.js';
import { ensureSanitizedPath } from '../src/parser/filename.js';
import { INPUT_DIR, OUTPUT_DIR } from '../src/config.js';

const USAGE = `Usage:
  extract <path-to-docx>                              Extract one file → data/outputs/<name>.json
  extract <path-to-docx> --out <path>                 Extract one file → custom path
  extract --batch [<input-dir>] [--out <out-dir>]     Batch all .docx (defaults: data/inputs → data/outputs)
  extract -b      [<input-dir>] [--out <out-dir>]     Same, shorthand
`;

main().catch((err) => {
  console.error(`Failed: ${err.stack || err.message || String(err)}`);
  process.exit(1);
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  if (args.batch) {
    const inDir = args.batchValue ?? INPUT_DIR;
    const outDir = args.out ?? OUTPUT_DIR;
    const code = await runBatch(inDir, outDir);
    process.exit(code);
  }

  if (!args.input) {
    process.stdout.write(USAGE);
    process.exit(1);
  }
  const code = await runSingle(args.input, args.out);
  process.exit(code);
}

/**
 * @param {string[]} argv
 * @returns {{ input?: string, out?: string, batch?: boolean, batchValue?: string, help?: boolean }}
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
    } else if (a === '--batch' || a === '-b' || a === '--b') {
      out.batch = true;
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        out.batchValue = next;
        i += 1;
      }
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
 * @param {string} inputPath
 * @param {string|undefined} explicitOut
 * @returns {Promise<0 | 1 | 2>}
 */
async function runSingle(inputPath, explicitOut) {
  const sanitized = await ensureSanitizedPath(inputPath, (m) => console.log(m));
  const outPath =
    explicitOut ??
    path.join(OUTPUT_DIR, path.basename(sanitized).replace(/\.docx$/i, '.json'));
  return processOne(sanitized, outPath, '[1/1] ');
}

/**
 * @param {string} inputDir
 * @param {string} outputDir
 * @returns {Promise<0 | 1 | 2>}
 */
async function runBatch(inputDir, outputDir) {
  const inDirAbs = path.resolve(inputDir);
  const inStat = await stat(inDirAbs).catch(() => null);
  if (!inStat || !inStat.isDirectory()) {
    console.error(`Failed: ${inputDir} is not a directory`);
    return 1;
  }

  const entries = await readdir(inDirAbs);
  const initial = entries.filter((n) => n.toLowerCase().endsWith('.docx'));
  if (initial.length === 0) {
    console.log(`No .docx files found in ${inDirAbs}`);
    return 0;
  }

  // Sanitize all input filenames in place before processing so the output
  // names derive from the post-rename basenames.
  const sanitizedPaths = [];
  for (const name of initial) {
    const p = path.join(inDirAbs, name);
    sanitizedPaths.push(await ensureSanitizedPath(p, (m) => console.log(m)));
  }

  console.log(`Batch: ${sanitizedPaths.length} file(s) from ${inDirAbs} → ${path.resolve(outputDir)}`);

  let worstCode = 0;
  for (let i = 0; i < sanitizedPaths.length; i += 1) {
    const inPath = sanitizedPaths[i];
    const base = path.basename(inPath);
    const outPath = path.join(outputDir, base.replace(/\.docx$/i, '.json'));
    const tag = `[${i + 1}/${sanitizedPaths.length}] `;
    const code = await processOne(inPath, outPath, tag);
    if (code > worstCode) worstCode = code;
  }
  return worstCode;
}

/**
 * Extract a single file and write the IR. All progress goes through console.log.
 *
 * @param {string} inPath
 * @param {string} outPath
 * @param {string} tag    log-line prefix, e.g. "[1/3] "
 * @returns {Promise<0 | 1 | 2>}
 */
async function processOne(inPath, outPath, tag) {
  console.log(`${tag}Reading: ${inPath}`);
  try {
    const { ir, validation } = await extract(inPath);
    console.log(`${tag}Writing: ${path.resolve(outPath)}`);
    await writeIR(ir, outPath);
    if (validation.valid) {
      console.log(`${tag}Completed successfully`);
      return 0;
    }
    console.log(
      `${tag}Completed with schema-validation issues (${validation.errors.length}); IR still written`
    );
    return 2;
  } catch (err) {
    console.error(`${tag}Failed: ${err.message}`);
    return 1;
  }
}
