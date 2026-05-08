import { describe, it, expect } from 'vitest';
import { buildSections } from '../src/parser/section-builder.js';

const para = (text) => ({ kind: 'block', block: { type: 'paragraph', text } });
const h = (level, text) => ({ kind: 'heading', level, text });

describe('buildSections', () => {
  it('starts a new section on every heading', () => {
    const { sections } = buildSections([
      h(1, 'A'),
      para('a1'),
      h(1, 'B'),
      para('b1'),
    ]);
    expect(sections.map((s) => s.heading)).toEqual(['A', 'B']);
    expect(sections[0].content).toEqual([{ type: 'paragraph', text: 'a1' }]);
    expect(sections[1].content).toEqual([{ type: 'paragraph', text: 'b1' }]);
  });

  it('treats any heading level as a new section (flat)', () => {
    const { sections } = buildSections([
      h(1, 'Top'),
      h(2, 'Sub'),
      para('p'),
    ]);
    expect(sections.map((s) => [s.heading, s.level])).toEqual([
      ['Top', 1],
      ['Sub', 2],
    ]);
    expect(sections[0].content).toEqual([]);
    expect(sections[1].content).toEqual([{ type: 'paragraph', text: 'p' }]);
  });

  it('puts content before the first heading into a Preamble', () => {
    const { sections } = buildSections([
      para('intro'),
      h(1, 'First'),
      para('inside'),
    ]);
    expect(sections.map((s) => s.heading)).toEqual(['Preamble', 'First']);
    expect(sections[0].id).toBe('preamble');
    expect(sections[0].level).toBe(0);
    expect(sections[0].content).toEqual([{ type: 'paragraph', text: 'intro' }]);
  });

  it('does not emit a Preamble when there is no leading content', () => {
    const { sections } = buildSections([h(1, 'First'), para('x')]);
    expect(sections.map((s) => s.heading)).toEqual(['First']);
  });

  it('handles a heading immediately followed by another heading', () => {
    const { sections } = buildSections([h(1, 'A'), h(1, 'B')]);
    expect(sections[0].content).toEqual([]);
    expect(sections[1].content).toEqual([]);
  });

  it('suffixes duplicate slugs', () => {
    const { sections } = buildSections([
      h(1, 'Same Title'),
      h(1, 'Same Title'),
      h(1, 'Same Title'),
    ]);
    expect(sections.map((s) => s.id)).toEqual([
      'same-title',
      'same-title-2',
      'same-title-3',
    ]);
  });

  it('returns empty arrays for empty input', () => {
    expect(buildSections([])).toEqual({ sections: [], parserNotes: [] });
  });
});
