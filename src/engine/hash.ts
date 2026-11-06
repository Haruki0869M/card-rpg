// ===== 状態の要約（オンライン協力で、全員の状態がずれていないかを比べる。spec §7.2） =====
// キーの順番に左右されない文字列にしてから、短い値（FNV-1a 32bit の16進8桁）にする。

/** キーを並べ替えた JSON（undefined の項目は無いものとして扱う） */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : stableStringify(x))).join(',')}]`;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`;
}

/** 状態の要約 */
export function stateHash(v: unknown): string {
  const s = stableStringify(v);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
