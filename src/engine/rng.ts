// シード付き乱数（mulberry32）。Math.random() は使わない。
// 状態は 32bit 整数1つなので、BattleState に保存すれば中断・再開しても同じ結果になる。

export interface Rng {
  /** [0, 1) の乱数 */
  next(): number;
  /** [0, n) の整数 */
  int(n: number): number;
  /** 現在の内部状態 */
  readonly state: number;
}

export function createRng(initialState: number): Rng {
  let s = initialState >>> 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n: number) {
      return Math.floor(this.next() * n);
    },
    get state() {
      return s;
    },
  };
}

/** Fisher–Yates シャッフル（新しい配列を返す） */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 新しいシードを作る（暗号乱数を使用。ゲーム内の抽選には使わない） */
export function makeSeed(): number {
  try {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] % 1_000_000_000;
  } catch {
    return Date.now() % 1_000_000_000;
  }
}
