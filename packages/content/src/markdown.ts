/** The small Markdown subset the lessons use: headings, paragraphs, bullet and numbered lists, tables, bold and italic. */
export interface Span {
  text: string;
  bold?: true;
  italic?: true;
}

export type Block =
  | { t: 'h'; level: number; spans: Span[] }
  | { t: 'p'; spans: Span[] }
  | { t: 'ul'; items: Span[][] }
  | { t: 'ol'; items: Span[][] }
  | { t: 'table'; head: Span[][]; rows: Span[][][] };

export function spansOf(text: string): Span[] {
  const out: Span[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;
  let at = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > at) out.push({ text: text.slice(at, m.index) });
    out.push(m[1] !== undefined ? { text: m[1], bold: true } : { text: m[2] ?? '', italic: true });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

const cells = (line: string): string[] => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const isRule = (line: string): boolean => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());
const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBER = /^\s*\d+\.\s+(.*)$/;
const BLOCK_START = /^(#{1,6}\s|\||\s*[-*]\s|\s*\d+\.\s)/;

function takeWhile(lines: string[], from: number, ok: (l: string) => boolean): number {
  let i = from;
  while (i < lines.length && ok(lines[i] ?? '')) i += 1;
  return i;
}

function table(lines: string[]): Block {
  const rows = lines.filter((l) => !isRule(l)).map(cells);
  return { t: 'table', head: (rows[0] ?? []).map(spansOf), rows: rows.slice(1).map((r) => r.map(spansOf)) };
}

function list(lines: string[], re: RegExp): Block {
  const items = lines.map((l) => spansOf(re.exec(l)?.[1] ?? ''));
  return re === BULLET ? { t: 'ul', items } : { t: 'ol', items };
}

/** One block from `lines` starting at `i`, and where the next one starts. */
function nextBlock(lines: string[], i: number): [Block, number] {
  const line = lines[i] ?? '';
  const head = /^(#{1,6})\s+(.*)$/.exec(line);
  if (head !== null) return [{ t: 'h', level: (head[1] ?? '').length, spans: spansOf(head[2] ?? '') }, i + 1];
  if (line.trim().startsWith('|')) {
    const end = takeWhile(lines, i, (l) => l.trim().startsWith('|'));
    return [table(lines.slice(i, end)), end];
  }
  const re = BULLET.test(line) ? BULLET : NUMBER.test(line) ? NUMBER : null;
  if (re !== null) {
    const end = takeWhile(lines, i, (l) => re.test(l));
    return [list(lines.slice(i, end), re), end];
  }
  const end = Math.max(takeWhile(lines, i, (l) => l.trim() !== '' && !BLOCK_START.test(l)), i + 1);
  return [{ t: 'p', spans: spansOf(lines.slice(i, end).join(' ')) }, end];
}

export function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    if ((lines[i] ?? '').trim() === '') {
      i += 1;
      continue;
    }
    const [block, next] = nextBlock(lines, i);
    blocks.push(block);
    i = next;
  }
  return blocks;
}

export const plainText = (spans: readonly Span[]): string => spans.map((s) => s.text).join('');
