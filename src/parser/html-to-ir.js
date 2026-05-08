/**
 * Walk an HTML string (the output of mammoth) and build the IR.
 *
 * Pipeline:
 *   1. cheerio-load the HTML.
 *   2. Walk top-level elements in document order, emitting events:
 *        { kind: 'heading', level, text }
 *        { kind: 'block',   block }       // block ∈ paragraph | table | list | unknown
 *      Inline elements (img, etc.) are dropped or noted.
 *   3. Hand the events off to section-builder.
 *   4. Assemble the final IR with metadata, sections, warnings, parserNotes.
 */

import * as cheerio from 'cheerio';
import { buildSections } from './section-builder.js';
import { extractTable } from './table-extractor.js';

/**
 * @typedef {Object} BuildIROptions
 * @property {string} filename
 * @property {object[]} [warnings]      mammoth warnings
 * @property {string} [extractedAt]     ISO timestamp (defaults to now)
 */

/**
 * @param {string} html
 * @param {BuildIROptions} options
 * @returns {object}  the IR
 */
export function buildIR(html, options) {
  const $ = cheerio.load(html ?? '', { decodeEntities: true });
  const parserNotes = [];
  const irWarnings = [];
  const unknownBlocks = [];

  // mammoth warnings → strings on the IR
  for (const w of options.warnings ?? []) {
    irWarnings.push(typeof w === 'string' ? w : (w.message ?? JSON.stringify(w)));
  }

  // Drop images: each <img> becomes a warning.
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    irWarnings.push(`image dropped (out of scope): ${src ? src.slice(0, 80) : '(no src)'}`);
    $(el).remove();
  });

  // Pull a document title: prefer h1.title, else first h1, else null.
  const title = readTitle($);

  // Walk top-level children of <body> (cheerio wraps fragments in html/body).
  const root = $('body').length > 0 ? $('body') : $.root();
  /** @type {Array<{kind:'heading',level:number,text:string} | {kind:'block',block:object}>} */
  const events = [];
  let lastHeadingText = null;

  root.children().each((_, el) => {
    const tag = (el.tagName || '').toLowerCase();
    if (HEADING_TAGS.has(tag)) {
      const text = collapseWhitespace($(el).text());
      const level = Number(tag[1]);
      events.push({ kind: 'heading', level, text });
      lastHeadingText = text;
      return;
    }
    if (tag === 'p') {
      const text = collapseWhitespace($(el).text());
      // Skip truly empty paragraphs.
      if (text === '') return;
      events.push({
        kind: 'block',
        block: { type: 'paragraph', text },
      });
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = $(el)
        .children('li')
        .map((__, li) => collapseWhitespace($(li).text()))
        .get();
      events.push({
        kind: 'block',
        block: { type: 'list', ordered: tag === 'ol', items },
      });
      return;
    }
    if (tag === 'table') {
      const block = extractTable($(el), $, {
        name: lastHeadingText,
        parserNotes,
      });
      events.push({ kind: 'block', block });
      return;
    }
    // Unknown top-level element — preserve raw HTML, log a warning.
    const html = $.html(el);
    parserNotes.push(`unknown element <${tag}> at top level; preserved as raw HTML.`);
    events.push({
      kind: 'block',
      block: { type: 'unknown', html },
    });
    unknownBlocks.push({ sectionId: null, html });
  });

  const { sections, parserNotes: builderNotes } = buildSections(events);
  parserNotes.push(...builderNotes);

  // Backfill sectionId on unknownBlocks now that sections exist.
  if (unknownBlocks.length > 0) {
    for (const u of unknownBlocks) {
      const owner = sections.find((s) =>
        s.content.some((b) => b.type === 'unknown' && b.html === u.html)
      );
      u.sectionId = owner ? owner.id : null;
    }
  }

  /** @type {object} */
  const ir = {
    metadata: {
      filename: options.filename,
      extractedAt: options.extractedAt ?? new Date().toISOString(),
      title: title ?? null,
    },
    sections,
    warnings: irWarnings,
    parserNotes,
  };
  if (unknownBlocks.length > 0) ir.unknownBlocks = unknownBlocks;
  return ir;
}

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/**
 * @param {import('cheerio').CheerioAPI} $
 * @returns {string|null}
 */
function readTitle($) {
  const $titled = $('h1.title').first();
  if ($titled.length > 0) {
    const t = collapseWhitespace($titled.text());
    if (t) return t;
  }
  const $h1 = $('h1').first();
  if ($h1.length > 0) {
    const t = collapseWhitespace($h1.text());
    if (t) return t;
  }
  return null;
}

function collapseWhitespace(s) {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}
