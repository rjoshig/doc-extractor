/**
 * Extract a table block (IR shape) from a cheerio <table> element.
 *
 * Header detection rules:
 *   - If any cell in the first <tr> is a <th>, treat the first row as the header.
 *   - Else if every cell in the first <tr> is bold (<strong>/<b> wrapping all text), treat as header.
 *   - Otherwise no header — synthesize "Column1", "Column2", ... and set hasHeader=false.
 *
 * Empty cells become "" (never null/undefined).
 * Merged cells (rowspan/colspan): cell content is placed at the first position; other
 * positions get "" and a note is appended to the parserNotes array.
 *
 * Nested tables: flattened to a textual representation with a parserNotes entry.
 */

/**
 * @typedef {Object} TableBlock
 * @property {'table'} type
 * @property {string|null} [name]
 * @property {string[]} columns
 * @property {boolean} hasHeader
 * @property {boolean} [hasMergedHeader]
 * @property {Array<Object<string,string>>} rows
 */

/**
 * @param {import('cheerio').Cheerio<any>} $table  cheerio-wrapped <table>
 * @param {import('cheerio').CheerioAPI} $          the cheerio instance
 * @param {{ name?: string|null, parserNotes?: string[] }} [opts]
 * @returns {TableBlock}
 */
export function extractTable($table, $, opts = {}) {
  const parserNotes = opts.parserNotes ?? [];
  const name = opts.name ?? null;

  const rows = collectRows($table, $);
  if (rows.length === 0) {
    return {
      type: 'table',
      name,
      columns: [],
      hasHeader: false,
      rows: [],
    };
  }

  const headerRow = rows[0];
  const headerLooksLikeHeader = isHeaderRow(headerRow);
  const hasMergedHeader = headerLooksLikeHeader && headerRow.some((c) => c.colspan > 1);

  let columns;
  let dataRows;
  let hasHeader;

  if (headerLooksLikeHeader) {
    columns = expandHeaderCells(headerRow);
    dataRows = rows.slice(1);
    hasHeader = true;
    if (hasMergedHeader) {
      parserNotes.push(
        `Table${name ? ` "${name}"` : ''} has merged header cells; columns expanded best-effort.`
      );
    }
  } else {
    const colCount = maxColumnCount(rows);
    columns = Array.from({ length: colCount }, (_, i) => `Column${i + 1}`);
    dataRows = rows;
    hasHeader = false;
  }

  const outRows = dataRows.map((row) =>
    rowToObject(row, columns, parserNotes, name, $)
  );

  /** @type {TableBlock} */
  const result = {
    type: 'table',
    name,
    columns,
    hasHeader,
    rows: outRows,
  };
  if (hasMergedHeader) result.hasMergedHeader = true;
  return result;
}

/**
 * Read each <tr> into an array of cell objects with text + colspan + rowspan + isHeader.
 *
 * @param {import('cheerio').Cheerio<any>} $table
 * @param {import('cheerio').CheerioAPI} $
 * @returns {Array<Array<{text:string,colspan:number,rowspan:number,isHeader:boolean,isBold:boolean}>>}
 */
function collectRows($table, $) {
  /** @type {Array<Array<{text:string,colspan:number,rowspan:number,isHeader:boolean,isBold:boolean}>>} */
  const rows = [];
  $table.find('tr').each((_, tr) => {
    const $tr = $(tr);
    /** @type {Array<{text:string,colspan:number,rowspan:number,isHeader:boolean,isBold:boolean}>} */
    const cells = [];
    $tr.children('th, td').each((__, cell) => {
      const $cell = $(cell);
      const isHeader = cell.tagName === 'th';
      const colspan = parseSpan($cell.attr('colspan'));
      const rowspan = parseSpan($cell.attr('rowspan'));
      const text = cellText($cell, $);
      const isBold = isCellBold($cell, $);
      cells.push({ text, colspan, rowspan, isHeader, isBold });
    });
    if (cells.length > 0) rows.push(cells);
  });
  return rows;
}

/**
 * Render a cell's text. Nested tables are flattened to a compact textual form.
 *
 * @param {import('cheerio').Cheerio<any>} $cell
 * @param {import('cheerio').CheerioAPI} $
 */
function cellText($cell, $) {
  const $nested = $cell.find('table');
  if ($nested.length > 0) {
    const nestedText = $nested
      .map((_, t) => flattenTableToText($(t), $))
      .get()
      .join(' | ');
    const surrounding = $cell.clone();
    surrounding.find('table').remove();
    const around = collapseWhitespace(surrounding.text());
    return [around, nestedText].filter(Boolean).join(' ');
  }
  return collapseWhitespace($cell.text());
}

/**
 * Best-effort textual flattening of a nested table.
 *
 * @param {import('cheerio').Cheerio<any>} $tbl
 * @param {import('cheerio').CheerioAPI} $
 */
function flattenTableToText($tbl, $) {
  const lines = [];
  $tbl.find('tr').each((_, tr) => {
    const $tr = $(tr);
    const cells = $tr
      .children('th, td')
      .map((__, c) => collapseWhitespace($(c).text()))
      .get();
    if (cells.length > 0) lines.push(cells.join(' / '));
  });
  return lines.join(' ; ');
}

/**
 * @param {import('cheerio').Cheerio<any>} $cell
 * @param {import('cheerio').CheerioAPI} $
 */
function isCellBold($cell, $) {
  const text = collapseWhitespace($cell.text());
  if (text.length === 0) return false;
  // True if entire visible text is wrapped in <strong>/<b>.
  const $strong = $cell.find('strong, b');
  if ($strong.length === 0) return false;
  const strongText = $strong
    .map((_, e) => collapseWhitespace($(e).text()))
    .get()
    .join(' ');
  return collapseWhitespace(strongText) === text;
}

function isHeaderRow(row) {
  if (row.some((c) => c.isHeader)) return true;
  if (row.length > 0 && row.every((c) => c.text === '' || c.isBold)) {
    // All non-empty cells bold AND at least one non-empty cell present.
    return row.some((c) => c.text !== '');
  }
  return false;
}

function expandHeaderCells(row) {
  const out = [];
  for (const cell of row) {
    out.push(cell.text);
    for (let i = 1; i < cell.colspan; i += 1) {
      out.push(`${cell.text}__${i + 1}`);
    }
  }
  return out;
}

function maxColumnCount(rows) {
  let max = 0;
  for (const row of rows) {
    let count = 0;
    for (const cell of row) count += cell.colspan;
    if (count > max) max = count;
  }
  return max;
}

function rowToObject(row, columns, parserNotes, name, _$) {
  /** @type {Record<string,string>} */
  const out = {};
  for (const col of columns) out[col] = '';

  let colIdx = 0;
  let mergedSeen = false;
  for (const cell of row) {
    if (colIdx >= columns.length) {
      // Row has more cells than header columns — note and stop placing.
      parserNotes.push(
        `Table${name ? ` "${name}"` : ''} row has more cells than columns; extra cells dropped.`
      );
      break;
    }
    out[columns[colIdx]] = cell.text;
    if (cell.colspan > 1 || cell.rowspan > 1) {
      mergedSeen = true;
      for (let i = 1; i < cell.colspan && colIdx + i < columns.length; i += 1) {
        out[columns[colIdx + i]] = '';
      }
    }
    colIdx += cell.colspan;
  }
  if (mergedSeen) {
    parserNotes.push(
      `Table${name ? ` "${name}"` : ''} has merged data cells; values placed at first position only.`
    );
  }
  return out;
}

function parseSpan(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 1 ? Math.floor(n) : 1;
}

function collapseWhitespace(s) {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}
