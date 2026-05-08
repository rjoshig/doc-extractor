import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sanitizeFilename, ensureSanitizedPath } from '../src/parser/filename.js';

describe('sanitizeFilename', () => {
  it('replaces single spaces with underscores', () => {
    expect(sanitizeFilename('Zoho Temple 2020.docx')).toBe('Zoho_Temple_2020.docx');
  });

  it('collapses runs of whitespace to a single underscore', () => {
    expect(sanitizeFilename('a    b\tc.docx')).toBe('a_b_c.docx');
  });

  it('leaves already-sanitized names alone', () => {
    expect(sanitizeFilename('Already_OK.docx')).toBe('Already_OK.docx');
  });

  it('does not touch non-whitespace special characters', () => {
    expect(sanitizeFilename("Project (v2).docx")).toBe('Project_(v2).docx');
  });
});

describe('ensureSanitizedPath', () => {
  let tmp;

  afterEach(() => {
    if (tmp && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
  });

  it('renames a file with spaces and returns the new path', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'sanitize-'));
    const original = path.join(tmp, 'Zoho Temple 2020.docx');
    writeFileSync(original, 'fake');
    const messages = [];
    const result = await ensureSanitizedPath(original, (m) => messages.push(m));
    expect(result).toBe(path.join(tmp, 'Zoho_Temple_2020.docx'));
    expect(existsSync(original)).toBe(false);
    expect(existsSync(result)).toBe(true);
    expect(messages.some((m) => m.includes('Renamed'))).toBe(true);
  });

  it('is a no-op when the basename has no whitespace', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'sanitize-'));
    const original = path.join(tmp, 'clean.docx');
    writeFileSync(original, 'fake');
    const result = await ensureSanitizedPath(original, () => {});
    expect(result).toBe(original);
    expect(existsSync(original)).toBe(true);
  });

  it('skips the rename when the sanitized target already exists', async () => {
    tmp = mkdtempSync(path.join(tmpdir(), 'sanitize-'));
    const original = path.join(tmp, 'Same Name.docx');
    const conflicting = path.join(tmp, 'Same_Name.docx');
    writeFileSync(original, 'a');
    writeFileSync(conflicting, 'b');
    const messages = [];
    const result = await ensureSanitizedPath(original, (m) => messages.push(m));
    expect(result).toBe(original);
    expect(existsSync(original)).toBe(true);
    expect(existsSync(conflicting)).toBe(true);
    expect(messages.some((m) => m.includes('Skipped'))).toBe(true);
  });
});
