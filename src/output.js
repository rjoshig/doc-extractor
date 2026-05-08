/**
 * Write IR JSON to disk. Creates parent directories as needed.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {object} ir
 * @param {string} outPath  absolute or relative file path
 * @returns {Promise<string>}  the absolute path written
 */
export async function writeIR(ir, outPath) {
  const abs = path.resolve(outPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, JSON.stringify(ir, null, 2) + '\n', 'utf8');
  return abs;
}
