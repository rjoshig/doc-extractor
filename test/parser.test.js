/**
 * Parser-level tests: feed HTML strings to buildIR and verify the resulting IR.
 */

import { describe, it, expect } from 'vitest';
import { buildIR } from '../src/parser/html-to-ir.js';

const META = { filename: 'unit.docx', extractedAt: '2026-05-08T00:00:00.000Z' };

describe('buildIR', () => {
  it('extracts a simple two-section document', () => {
    const html = `
      <h1>Product Details</h1>
      <p>Some prose.</p>
      <table>
        <tr><th>A</th><th>B</th></tr>
        <tr><td>1</td><td>2</td></tr>
      </table>
      <h1>Deliverables</h1>
      <p>More prose.</p>
    `;
    const ir = buildIR(html, META);
    expect(ir.metadata.filename).toBe('unit.docx');
    expect(ir.metadata.title).toBe('Product Details');
    expect(ir.sections.map((s) => s.id)).toEqual(['product-details', 'deliverables']);

    const [s1, s2] = ir.sections;
    expect(s1.content[0]).toEqual({ type: 'paragraph', text: 'Some prose.' });
    expect(s1.content[1]).toMatchObject({
      type: 'table',
      name: 'Product Details',
      columns: ['A', 'B'],
      hasHeader: true,
      rows: [{ A: '1', B: '2' }],
    });
    expect(s2.content).toEqual([{ type: 'paragraph', text: 'More prose.' }]);
  });

  it('preserves order of mixed content blocks within a section', () => {
    const html = `
      <h1>S</h1>
      <p>p1</p>
      <ul><li>x</li><li>y</li></ul>
      <p>p2</p>
      <table><tr><th>A</th></tr><tr><td>v</td></tr></table>
    `;
    const ir = buildIR(html, META);
    const types = ir.sections[0].content.map((b) => b.type);
    expect(types).toEqual(['paragraph', 'list', 'paragraph', 'table']);
  });

  it('puts pre-heading content into a Preamble section', () => {
    const html = `<p>preface</p><h1>First</h1><p>body</p>`;
    const ir = buildIR(html, META);
    expect(ir.sections[0].heading).toBe('Preamble');
    expect(ir.sections[0].content).toEqual([{ type: 'paragraph', text: 'preface' }]);
    expect(ir.sections[1].heading).toBe('First');
  });

  it('returns empty sections for an empty document', () => {
    const ir = buildIR('', META);
    expect(ir.sections).toEqual([]);
    expect(ir.metadata.title).toBe(null);
  });

  it('drops images and notes them in warnings', () => {
    const html = `<h1>S</h1><p>before</p><img src="picture.png" /><p>after</p>`;
    const ir = buildIR(html, META);
    expect(ir.warnings.some((w) => w.startsWith('image dropped'))).toBe(true);
    expect(ir.sections[0].content.map((b) => b.type)).toEqual(['paragraph', 'paragraph']);
  });

  it('handles a list', () => {
    const html = `<h1>S</h1><ol><li>one</li><li>two</li></ol>`;
    const ir = buildIR(html, META);
    expect(ir.sections[0].content[0]).toEqual({
      type: 'list',
      ordered: true,
      items: ['one', 'two'],
    });
  });

  it('preserves heading levels', () => {
    const html = `<h1>A</h1><h2>B</h2><h3>C</h3>`;
    const ir = buildIR(html, META);
    expect(ir.sections.map((s) => s.level)).toEqual([1, 2, 3]);
  });

  it('infers table name from the immediately preceding heading', () => {
    const html = `
      <h1>Outer</h1>
      <p>p</p>
      <h2>Inner Table Name</h2>
      <table><tr><th>A</th></tr><tr><td>v</td></tr></table>
    `;
    const ir = buildIR(html, META);
    const innerSection = ir.sections.find((s) => s.heading === 'Inner Table Name');
    expect(innerSection.content[0]).toMatchObject({
      type: 'table',
      name: 'Inner Table Name',
    });
  });
});
