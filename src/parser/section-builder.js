/**
 * Group an ordered list of blocks under their parent headings.
 *
 * Input: an array of typed events produced by the HTML walker, in document order:
 *   { kind: 'heading', level, text }
 *   { kind: 'block', block }                 // block ∈ paragraph | table | list | unknown
 *
 * Output: { sections, parserNotes } where sections is the IR sections array.
 *
 * Rules:
 *   - Any heading (h1–h6) starts a new section. Flat structure — no nesting.
 *   - Blocks before the first heading land in an implicit "Preamble" section.
 *     The Preamble is only emitted if it actually contains blocks.
 *   - Heading immediately followed by another heading → first section's content is [].
 *   - Duplicate slugs are suffixed -2, -3, ...
 */

import { slugify, uniqueSlug } from './slug.js';
import { PREAMBLE_HEADING, PREAMBLE_ID, PREAMBLE_LEVEL } from '../config.js';

/**
 * @param {Array<{kind:'heading',level:number,text:string} | {kind:'block',block:object}>} events
 * @returns {{ sections: Array<object>, parserNotes: string[] }}
 */
export function buildSections(events) {
  /** @type {Array<object>} */
  const sections = [];
  /** @type {string[]} */
  const parserNotes = [];
  /** @type {Set<string>} */
  const usedSlugs = new Set();

  /** @type {object|null} */
  let current = null;
  /** @type {object|null} */
  let preamble = null;

  for (const ev of events) {
    if (ev.kind === 'heading') {
      const id = uniqueSlug(slugify(ev.text), usedSlugs);
      current = {
        id,
        heading: ev.text,
        level: ev.level,
        content: [],
      };
      sections.push(current);
    } else if (ev.kind === 'block') {
      if (current === null) {
        if (preamble === null) {
          preamble = {
            id: uniqueSlug(PREAMBLE_ID, usedSlugs),
            heading: PREAMBLE_HEADING,
            level: PREAMBLE_LEVEL,
            content: [],
          };
          sections.push(preamble);
        }
        preamble.content.push(ev.block);
      } else {
        current.content.push(ev.block);
      }
    }
  }

  return { sections, parserNotes };
}
