/**
 * Minimal .xlsx writer — a real Excel workbook, no dependency.
 *
 * KEAN opens the member exports in Excel to print address labels, and a
 * `;`-separated CSV lands in a single column on any machine whose list
 * separator isn't `;`. An .xlsx has the columns baked in, so it opens the
 * same everywhere.
 *
 * An .xlsx is a ZIP of XML parts. We store entries uncompressed (ZIP
 * method 0), which costs file size but means no deflate implementation —
 * only a CRC-32. Exports are a few thousand rows, so the trade is fine.
 */

export type Cell = string | number | null | undefined;

/* ───────────────────────── zip ───────────────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface Entry { name: string; data: Uint8Array }

/** Store-only ZIP (method 0). Enough for an .xlsx Excel will open. */
function zip(entries: Entry[]): Blob {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);   // signature
    lv.setUint16(4, 20, true);           // version needed
    lv.setUint16(6, 0x0800, true);       // UTF-8 names
    lv.setUint16(8, 0, true);            // method: stored
    lv.setUint16(10, 0, true);           // mod time
    lv.setUint16(12, 0x21, true);        // mod date (1980-01-01)
    lv.setUint32(14, crc, true);
    lv.setUint32(18, e.data.length, true);
    lv.setUint32(22, e.data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    locals.push(local, e.data);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);           // version made by
    cv.setUint16(6, 20, true);           // version needed
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, e.data.length, true);
    cv.setUint32(24, e.data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);      // local header offset
    central.set(name, 46);
    centrals.push(central);

    offset += local.length + e.data.length;
  }

  const cdSize = centrals.reduce((n, c) => n + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);

  return new Blob([...locals, ...centrals, eocd] as BlobPart[], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/* ──────────────────────── sheet ──────────────────────── */

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))
    // Excel rejects most control characters outright.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/** 0 -> A, 25 -> Z, 26 -> AA */
function colName(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  }
  return s;
}

function sheetXml(rows: Cell[][]): string {
  const body = rows.map((row, r) => {
    const cells = row.map((v, c) => {
      const ref = `${colName(c)}${r + 1}`;
      if (v === null || v === undefined || v === '') return '';
      if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<sheetData>${body}</sheetData></worksheet>`;
}

/* ──────────────────────── export ──────────────────────── */

/**
 * Build a one-sheet workbook. `rows[0]` is treated as the header row by
 * Excel's autofilter, nothing more — no styling is emitted.
 */
export function toXlsx(rows: Cell[][], sheetName = 'Φύλλο1'): Blob {
  const enc = new TextEncoder();
  const f = (name: string, xml: string): Entry => ({ name, data: enc.encode(xml) });
  // Excel caps sheet names at 31 chars and forbids : \ / ? * [ ]
  const safeName = esc(sheetName.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31)) || 'Sheet1';

  return zip([
    f('[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
      + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
      + `<Default Extension="xml" ContentType="application/xml"/>`
      + `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
      + `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      + `</Types>`),
    f('_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
      + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`
      + `</Relationships>`),
    f('xl/workbook.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
      + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" `
      + `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
      + `<sheets><sheet name="${safeName}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    f('xl/_rels/workbook.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
      + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>`
      + `</Relationships>`),
    f('xl/worksheets/sheet1.xml', sheetXml(rows)),
  ]);
}

/** Build the workbook and hand it to the browser as a download. */
export function downloadXlsx(filename: string, rows: Cell[][], sheetName?: string) {
  const url = URL.createObjectURL(toXlsx(rows, sheetName));
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`,
  });
  a.click();
  // Revoke on the next tick — Safari needs the URL alive through the click.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
