// Fast drop-in for csv-reader 1.0.0 (make.fun's own reference CSV reader).
//
// Semantics mirror vendor/csv-reader/index.js exactly (see RULES.txt):
//   - a U+FEFF at the very start is dropped;
//   - a record ends at LF or CRLF, and a line left with no characters is no record;
//   - outside quotes a CR not followed by LF is dropped (stray_cr);
//   - a field that opens with a quote runs to the next quote that is not doubled,
//     "" inside it one quote, each CRLF or lone CR inside it read as LF; what
//     follows its closing quote, up to the next comma or line break, is appended
//     as it stands (quote_junk, when the field ends); a quote that never closes
//     is a literal character, and the text after it is read again as unquoted
//     (unterminated_quote);
//   - a quote inside an unquoted field is a literal character; fields stay
//     strings, never trimmed or converted;
//   - columns is the first record when header is true, else null; rows holds the
//     records after it, each padded (short_row, with fields: its count) or cut
//     (long_row, with extra: the cut fields) to the first record's width;
//   - each error is {code, line, row}, in the order met.
//
// Speed: instead of one character at a time with per-character string
// concatenation, each field is read by jumping straight to its next delimiter
// with a native regex scan and slicing the field out in one piece. A field is
// therefore usually one regex exec + one slice; only broken pieces (a stray CR,
// a doubled quote, a line break inside quotes) cost extra steps.

const reUnq = /[,\r\n]/g; // next delimiter of an unquoted field
const reQuo = /["\r\n]/g; // next special character inside a quoted field

const COMMA = 0;
const BREAK = 1;
const END = 2;

/** csv-reader 1.0.0's answer for one case's input: {columns, rows, errors}. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  const n = text.length;
  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  if (text.charCodeAt(0) === 0xfeff) pos = 1;

  // The record being read: the line it starts on and the index in rows it takes (null: the header).
  let recordLine = 1;
  let recordRow = null;
  // How the field being read ended: COMMA, BREAK or END.
  let fieldEnded = COMMA;

  // Reads unquoted characters onto `value` up to the next comma or line break:
  // a CR not followed by LF is dropped (stray_cr). Returns the field; sets fieldEnded.
  function readUnquoted(value) {
    let start = pos;
    while (true) {
      reUnq.lastIndex = pos;
      const m = reUnq.exec(text);
      if (m === null) {
        if (start < n) value += text.slice(start);
        pos = n;
        fieldEnded = END;
        return value;
      }
      const idx = m.index;
      const ch = m[0];
      if (ch === ',') {
        value += text.slice(start, idx);
        pos = idx + 1;
        fieldEnded = COMMA;
        return value;
      }
      if (ch === '\n') {
        value += text.slice(start, idx);
        pos = idx + 1;
        line += 1;
        fieldEnded = BREAK;
        return value;
      }
      // A CR: CRLF ends the record, a lone CR is dropped (stray_cr).
      if (text.charCodeAt(idx + 1) === 10) {
        value += text.slice(start, idx);
        pos = idx + 2;
        line += 1;
        fieldEnded = BREAK;
        return value;
      }
      value += text.slice(start, idx);
      errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
      pos = idx + 1;
      start = idx + 1;
    }
  }

  // Reads a quoted field whose opening quote is at pos. Returns the field; sets fieldEnded.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let value = '';
    let seg = pos + 1; // start of the not-yet-appended segment inside the quotes
    let cur = pos + 1; // where the next scan starts
    while (true) {
      reQuo.lastIndex = cur;
      const m = reQuo.exec(text);
      if (m === null) {
        // The quote never closes: it is a literal character, and the text after
        // it is read again as unquoted.
        pos = open + 1;
        line = openLine;
        errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
        return readUnquoted('"');
      }
      const idx = m.index;
      const ch = m[0];
      if (ch === '"') {
        if (text.charCodeAt(idx + 1) === 34) {
          // A doubled quote is one quote.
          value += text.slice(seg, idx);
          value += '"';
          cur = idx + 2;
          seg = idx + 2;
          continue;
        }
        // The closing quote.
        value += text.slice(seg, idx);
        pos = idx + 1;
        if (pos >= n) {
          fieldEnded = END;
          return value;
        }
        const c = text.charCodeAt(pos);
        if (c === 44) {
          pos += 1;
          fieldEnded = COMMA;
          return value;
        }
        if (c === 10) {
          pos += 1;
          line += 1;
          fieldEnded = BREAK;
          return value;
        }
        if (c === 13 && text.charCodeAt(pos + 1) === 10) {
          pos += 2;
          line += 1;
          fieldEnded = BREAK;
          return value;
        }
        // What follows the closing quote is appended as it stands, up to the
        // next comma or line break.
        const before = value.length;
        const junk = readUnquoted(value);
        if (junk.length > before) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
        return junk;
      }
      if (ch === '\r') {
        // CRLF and a lone CR inside quotes are each one LF.
        value += text.slice(seg, idx);
        value += '\n';
        line += 1;
        cur = idx + 1;
        if (text.charCodeAt(cur) === 10) cur += 1;
        seg = cur;
        continue;
      }
      // An LF inside quotes: one more line, and it stays in the value.
      line += 1;
      cur = idx + 1;
    }
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === 34;
      fields.push(quoted ? readQuoted() : readUnquoted(''));
    } while (fieldEnded === COMMA);

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
