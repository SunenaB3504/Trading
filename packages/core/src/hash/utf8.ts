/**
 * UTF-8 encoder written by hand so core does not depend on `TextEncoder`, which is not
 * guaranteed on every Android JS engine. Lone surrogates are encoded as U+FFFD.
 */
export function utf8Encode(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    let cp = text.charCodeAt(i);
    if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) << 10) + (low - 0xdc00);
        i += 1;
      }
    }
    if (cp >= 0xd800 && cp <= 0xdfff) cp = 0xfffd;
    pushCodePoint(out, cp);
  }
  return Uint8Array.from(out);
}

function pushCodePoint(out: number[], cp: number): void {
  if (cp < 0x80) {
    out.push(cp);
  } else if (cp < 0x800) {
    out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
  } else if (cp < 0x10000) {
    out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  } else {
    out.push(
      0xf0 | (cp >> 18),
      0x80 | ((cp >> 12) & 0x3f),
      0x80 | ((cp >> 6) & 0x3f),
      0x80 | (cp & 0x3f),
    );
  }
}
