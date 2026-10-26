/** A file split into its `key: value` header and its body. Throws on a file with no header. */
export function splitFrontMatter(text: string, file: string): { meta: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text.replace(/\r\n/g, '\n'));
  if (m === null) throw new Error(`${file}: no front matter`);
  const meta: Record<string, string> = {};
  for (const line of (m[1] ?? '').split('\n')) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv === null) throw new Error(`${file}: bad front matter line "${line}"`);
    meta[kv[1] ?? ''] = (kv[2] ?? '').trim();
  }
  return { meta, body: (m[2] ?? '').trim() };
}

export function need(meta: Record<string, string>, key: string, file: string): string {
  const v = meta[key];
  if (v === undefined || v === '') throw new Error(`${file}: front matter needs "${key}"`);
  return v;
}
