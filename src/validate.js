/**
 * Validate an IR object against schemas/document-ir.schema.json using ajv.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(__dirname, '../schemas/document-ir.schema.json');

let cachedValidator = null;

async function loadValidator() {
  if (cachedValidator) return cachedValidator;
  const raw = await readFile(SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(raw);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  cachedValidator = ajv.compile(schema);
  return cachedValidator;
}

/**
 * @param {object} ir
 * @returns {Promise<{ valid: boolean, errors: object[] }>}
 */
export async function validateIR(ir) {
  const validate = await loadValidator();
  const valid = validate(ir);
  return {
    valid: !!valid,
    errors: valid ? [] : (validate.errors ?? []).map((e) => ({ ...e })),
  };
}
