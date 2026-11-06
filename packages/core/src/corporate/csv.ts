/** Incremental reader for RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF, blank lines dropped. */
class CsvReader {
  readonly rows: string[][] = [];
  private row: string[] = [];
  private field = '';
  private quoted = false;

  private endField(): void {
    this.row.push(this.field);
    this.field = '';
  }

  private endRow(): void {
    this.endField();
    if (this.row.length > 1 || (this.row[0] ?? '') !== '') this.rows.push(this.row);
    this.row = [];
  }

  /** Handles the character at `i` and returns the index of the next one to read. */
  step(text: string, i: number): number {
    const ch = text[i] as string;
    if (this.quoted) return this.inQuotes(text, i, ch);
    if (ch === '"') this.quoted = true;
    else if (ch === ',') this.endField();
    else if (ch === '\n' || ch === '\r') {
      this.endRow();
      return ch === '\r' && text[i + 1] === '\n' ? i + 2 : i + 1;
    } else this.field += ch;
    return i + 1;
  }

  private inQuotes(text: string, i: number, ch: string): number {
    if (ch !== '"') {
      this.field += ch;
      return i + 1;
    }
    if (text[i + 1] === '"') {
      this.field += '"';
      return i + 2;
    }
    this.quoted = false;
    return i + 1;
  }

  finish(): string[][] {
    if (this.field !== '' || this.row.length > 0) this.endRow();
    return this.rows;
  }
}

/** Parses CSV text into rows of strings. A trailing comma yields an empty last field. */
export function parseCsv(text: string): string[][] {
  const reader = new CsvReader();
  let i = 0;
  while (i < text.length) i = reader.step(text, i);
  return reader.finish();
}

/** Maps header names to column indexes; throws if a required column is missing. */
export function columnIndex(
  header: readonly string[],
  required: readonly string[],
): Record<string, number> {
  const index: Record<string, number> = {};
  header.forEach((name, i) => {
    index[name.trim()] = i;
  });
  for (const name of required) {
    if (index[name] === undefined) throw new Error(`missing column "${name}"`);
  }
  return index;
}
