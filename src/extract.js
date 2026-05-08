/**
 * Top-level orchestrator: take a .docx path, return its IR + validation result.
 */

import path from 'node:path';
import { docxToHtml } from './parser/docx-to-html.js';
import { buildIR } from './parser/html-to-ir.js';
import { validateIR } from './validate.js';

/**
 * @param {string} filePath  path to a .docx file on disk
 * @param {{ extractedAt?: string }} [opts]
 * @returns {Promise<{ ir: object, validation: { valid: boolean, errors: object[] } }>}
 */
export async function extract(filePath, opts = {}) {
  const { html, warnings } = await docxToHtml(filePath);
  const ir = buildIR(html, {
    filename: path.basename(filePath),
    warnings,
    extractedAt: opts.extractedAt,
  });
  const validation = await validateIR(ir);
  return { ir, validation };
}
