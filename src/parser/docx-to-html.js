/**
 * Wrap mammoth.convertToHtml. Returns the HTML string plus mammoth messages and
 * a separated `warnings` array of those whose type is 'warning'.
 */

import mammoth from 'mammoth';
import { readFile } from 'node:fs/promises';

const STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
  "p[style-name='Title'] => h1.title:fresh",
];

/**
 * @param {string} filePath  path to a .docx file on disk
 * @returns {Promise<{ html: string, messages: object[], warnings: object[] }>}
 */
export async function docxToHtml(filePath) {
  const buffer = await readFile(filePath);
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: STYLE_MAP,
      // Drop images entirely (out of scope) — emit nothing.
      convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' })),
      ignoreEmptyParagraphs: true,
    }
  );
  return {
    html: result.value,
    messages: result.messages,
    warnings: result.messages.filter((m) => m.type === 'warning'),
  };
}
