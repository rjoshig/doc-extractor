#!/usr/bin/env node
/**
 * Programmatically generates the .docx fixtures used by the test suite.
 *
 * Run via: npm run fixtures:generate
 *
 * Each fixture is built from a plain JS structure here, so the source of truth
 * for what the document contains lives in code (not in opaque binaries).
 */

import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, 'docs');

const FIXTURES = [
  {
    name: 'simple-sections-and-tables',
    title: 'Sample Statement of Work',
    children: [
      heading('Sample Statement of Work', HeadingLevel.TITLE),
      heading('Product Details', HeadingLevel.HEADING_1),
      para('This section describes the product being delivered.'),
      table(
        ['Column A', 'Column B', 'Column C', 'Column D'],
        [
          ['A1', 'B1', 'C1', 'D1'],
          ['A2', 'B2', 'C2', 'D2'],
        ]
      ),
      para('Additional notes about the product appear after the table.'),
      heading('Deliverables', HeadingLevel.HEADING_1),
      table(
        ['H1', 'H2', 'H3', 'H4', 'H5'],
        [
          ['v1', 'v2', 'v3', 'v4', 'v5'],
          ['w1', 'w2', 'w3', 'w4', 'w5'],
        ]
      ),
    ],
  },
  {
    name: 'headings-only-and-preamble',
    title: null,
    children: [
      // Preamble content (before any heading).
      para('This text appears before any heading and lives in the implicit Preamble.'),
      bullet('First bullet'),
      bullet('Second bullet'),
      heading('Empty Section', HeadingLevel.HEADING_1),
      heading('Section With Prose', HeadingLevel.HEADING_1),
      para('Just one paragraph here.'),
    ],
  },
];

async function main() {
  await mkdir(DOCS_DIR, { recursive: true });
  for (const fx of FIXTURES) {
    const doc = new Document({
      creator: 'doc-extractor fixture generator',
      title: fx.title || fx.name,
      sections: [{ properties: {}, children: fx.children }],
    });
    const buffer = await Packer.toBuffer(doc);
    const outPath = path.join(DOCS_DIR, `${fx.name}.docx`);
    await writeFile(outPath, buffer);
    console.log(`wrote ${outPath} (${buffer.length} bytes)`);
  }
}

function heading(text, level) {
  return new Paragraph({ text, heading: level });
}

function para(text) {
  return new Paragraph({ children: [new TextRun(text)] });
}

function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 } });
}

function table(headers, rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          width: { size: Math.floor(10000 / headers.length), type: WidthType.DXA },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true })],
            }),
          ],
        })
    ),
  });
  const dataRows = rows.map(
    (r) =>
      new TableRow({
        children: r.map(
          (c) =>
            new TableCell({
              width: { size: Math.floor(10000 / headers.length), type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun(c)] })],
            })
        ),
      })
  );
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
