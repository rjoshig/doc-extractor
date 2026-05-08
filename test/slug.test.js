import { describe, it, expect } from 'vitest';
import { slugify, uniqueSlug } from '../src/parser/slug.js';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Product Details')).toBe('product-details');
  });

  it('strips punctuation', () => {
    expect(slugify('Q&A: Things, Stuff!')).toBe('qa-things-stuff');
  });

  it('collapses whitespace', () => {
    expect(slugify('  Lots   of    space  ')).toBe('lots-of-space');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('a -- b -- c')).toBe('a-b-c');
  });

  it('strips leading/trailing hyphens', () => {
    expect(slugify('-edge cases-')).toBe('edge-cases');
  });

  it('handles empty/null/undefined', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
    expect(slugify(undefined)).toBe('');
  });
});

describe('uniqueSlug', () => {
  it('returns the desired slug if unused', () => {
    const used = new Set();
    expect(uniqueSlug('foo', used)).toBe('foo');
    expect(used.has('foo')).toBe(true);
  });

  it('appends -2, -3 on collision', () => {
    const used = new Set(['foo']);
    expect(uniqueSlug('foo', used)).toBe('foo-2');
    expect(uniqueSlug('foo', used)).toBe('foo-3');
  });

  it('falls back to "section" when desired is empty', () => {
    const used = new Set();
    expect(uniqueSlug('', used)).toBe('section');
  });
});
