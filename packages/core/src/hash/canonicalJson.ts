/**
 * Deterministic JSON: object keys sorted by UTF-16 code unit, no whitespace, no `undefined`,
 * no non-finite numbers. The same value always serialises to the same bytes, which is what
 * hashes, snapshots and bundles need (NFR-1).
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'string':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError('canonicalJson: non-finite number');
      return JSON.stringify(value === 0 ? 0 : value);
    case 'object':
      return Array.isArray(value) ? canonicalArray(value) : canonicalObject(value);
    default:
      throw new TypeError(`canonicalJson: unsupported type ${typeof value}`);
  }
}

function canonicalArray(items: readonly unknown[]): string {
  return `[${items.map(canonicalJson).join(',')}]`;
}

function canonicalObject(obj: object): string {
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`);
  return `{${parts.join(',')}}`;
}
