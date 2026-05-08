/**
 * Filename normalization for inputs.
 *
 * Rule: any whitespace in the basename is replaced with a single underscore.
 * Example: "Zoho Temple 2020.docx" -> "Zoho_Temple_2020.docx".
 *
 * Renames are performed at source — the file on disk is moved — so that
 * downstream output paths derive cleanly from the input name.
 */

import { rename, access } from 'node:fs/promises';
import path from 'node:path';

/**
 * Replace runs of whitespace in a filename with a single underscore.
 * Operates on a basename, not a path.
 *
 * @param {string} name
 * @returns {string}
 */
export function sanitizeFilename(name) {
  return String(name).replace(/\s+/g, '_');
}

/**
 * If the basename of `filePath` contains whitespace, rename the file on disk
 * to its sanitized form. Returns the (possibly new) path.
 *
 * If the sanitized target already exists, leaves the original alone and
 * returns its original path so the caller can decide what to do.
 *
 * @param {string} filePath
 * @param {(msg: string) => void} [log]  defaults to console.error
 * @returns {Promise<string>}
 */
export async function ensureSanitizedPath(filePath, log = (m) => console.error(m)) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const sanitized = sanitizeFilename(base);
  if (sanitized === base) return filePath;

  const newPath = path.join(dir, sanitized);
  try {
    await access(newPath);
    log(`Skipped rename "${base}" → "${sanitized}" (target already exists)`);
    return filePath;
  } catch {
    // Target does not exist — proceed.
  }
  await rename(filePath, newPath);
  log(`Renamed: "${base}" → "${sanitized}"`);
  return newPath;
}
