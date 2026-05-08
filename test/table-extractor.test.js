import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { extractTable } from '../src/parser/table-extractor.js';

function load(html) {
  const $ = cheerio.load(html);
  return { $, $table: $('table').first() };
}

describe('extractTable', () => {
  it('extracts a basic table with <th> headers', () => {
    const { $, $table } = load(`
      <table>
        <thead>
          <tr><th>A</th><th>B</th><th>C</th></tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>2</td><td>3</td></tr>
          <tr><td>4</td><td>5</td><td>6</td></tr>
        </tbody>
      </table>
    `);
    const notes = [];
    const t = extractTable($table, $, { name: 'Things', parserNotes: notes });
    expect(t).toEqual({
      type: 'table',
      name: 'Things',
      columns: ['A', 'B', 'C'],
      hasHeader: true,
      rows: [
        { A: '1', B: '2', C: '3' },
        { A: '4', B: '5', C: '6' },
      ],
    });
    expect(notes).toEqual([]);
  });

  it('detects bold-only header row even without <th>', () => {
    const { $, $table } = load(`
      <table>
        <tr><td><strong>Col1</strong></td><td><strong>Col2</strong></td></tr>
        <tr><td>x</td><td>y</td></tr>
      </table>
    `);
    const t = extractTable($table, $);
    expect(t.hasHeader).toBe(true);
    expect(t.columns).toEqual(['Col1', 'Col2']);
    expect(t.rows).toEqual([{ Col1: 'x', Col2: 'y' }]);
  });

  it('treats first row as data when there is no header signal', () => {
    const { $, $table } = load(`
      <table>
        <tr><td>a</td><td>b</td></tr>
        <tr><td>c</td><td>d</td></tr>
      </table>
    `);
    const t = extractTable($table, $);
    expect(t.hasHeader).toBe(false);
    expect(t.columns).toEqual(['Column1', 'Column2']);
    expect(t.rows).toEqual([
      { Column1: 'a', Column2: 'b' },
      { Column1: 'c', Column2: 'd' },
    ]);
  });

  it('produces empty strings for empty cells', () => {
    const { $, $table } = load(`
      <table>
        <tr><th>A</th><th>B</th></tr>
        <tr><td></td><td>v</td></tr>
      </table>
    `);
    const t = extractTable($table, $);
    expect(t.rows[0]).toEqual({ A: '', B: 'v' });
  });

  it('flags merged data cells in parserNotes', () => {
    const { $, $table } = load(`
      <table>
        <tr><th>A</th><th>B</th><th>C</th></tr>
        <tr><td colspan="2">spans</td><td>z</td></tr>
      </table>
    `);
    const notes = [];
    const t = extractTable($table, $, { name: 'T', parserNotes: notes });
    expect(t.rows[0]).toEqual({ A: 'spans', B: '', C: 'z' });
    expect(notes.some((n) => n.includes('merged data cells'))).toBe(true);
  });

  it('flags merged header cells', () => {
    const { $, $table } = load(`
      <table>
        <tr><th colspan="2">Group</th><th>Single</th></tr>
        <tr><td>1</td><td>2</td><td>3</td></tr>
      </table>
    `);
    const notes = [];
    const t = extractTable($table, $, { name: 'T', parserNotes: notes });
    expect(t.hasMergedHeader).toBe(true);
    expect(t.columns).toEqual(['Group', 'Group__2', 'Single']);
    expect(notes.some((n) => n.includes('merged header'))).toBe(true);
  });

  it('returns an empty shape for an empty table', () => {
    const { $, $table } = load('<table></table>');
    const t = extractTable($table, $);
    expect(t).toEqual({
      type: 'table',
      name: null,
      columns: [],
      hasHeader: false,
      rows: [],
    });
  });

  it('flattens a nested table inside a cell', () => {
    const { $, $table } = load(`
      <table>
        <tr><th>A</th><th>B</th></tr>
        <tr>
          <td>outer</td>
          <td>
            inner-prefix
            <table>
              <tr><td>i1</td><td>i2</td></tr>
              <tr><td>i3</td><td>i4</td></tr>
            </table>
          </td>
        </tr>
      </table>
    `);
    const t = extractTable($table, $);
    expect(t.rows[0].A).toBe('outer');
    expect(t.rows[0].B).toContain('inner-prefix');
    expect(t.rows[0].B).toContain('i1 / i2');
    expect(t.rows[0].B).toContain('i3 / i4');
  });
});
