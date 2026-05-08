/**
 * Centralized config and constants for doc-extractor.
 *
 * Read from process.env at import time. Keep this module dependency-free.
 */

import path from 'node:path';

const repoRoot = process.cwd();

export const INPUT_DIR = process.env.DOC_EXTRACTOR_INPUT_DIR
  ? path.resolve(process.env.DOC_EXTRACTOR_INPUT_DIR)
  : path.resolve(repoRoot, 'data/inputs');

export const OUTPUT_DIR = process.env.DOC_EXTRACTOR_OUTPUT_DIR
  ? path.resolve(process.env.DOC_EXTRACTOR_OUTPUT_DIR)
  : path.resolve(repoRoot, 'data/outputs');

export const PREAMBLE_HEADING = 'Preamble';
export const PREAMBLE_ID = 'preamble';
export const PREAMBLE_LEVEL = 0;
