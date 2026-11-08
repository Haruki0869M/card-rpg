// ===== 同時に鳴る音の数の制限（K6） =====
// 時刻を引数で受ける純粋な計算（テストできる）。スマホで音が重なりすぎないようにする。

export interface LimiterOptions {
  /** 全体で同時に鳴る数 */
  maxTotal: number;
  /** 同じ音が同時に鳴る数 */
  maxSame: number;
  /** 同じ音を続けて鳴らす時に空ける間（ミリ秒） */
  minGapMs: number;
}

export const DEFAULT_LIMITS: LimiterOptions = { maxTotal: 12, maxSame: 2, minGapMs: 50 };

interface Voice { id: string; start: number; end: number }

export interface Limiter {
  /** 鳴らしてよければ true を返し、鳴っている音として数える */
  /** gapMs = この音だけ、続けて鳴らす時に空ける間を長くする（お供の鳴き声など） */
  tryStart(id: string, now: number, durationMs: number, gapMs?: number): boolean;
  /** 今鳴っている数（テスト用） */
  active(now: number): number;
  clear(): void;
}

export function createLimiter(opts: LimiterOptions = DEFAULT_LIMITS): Limiter {
  let voices: Voice[] = [];
  const lastStart = new Map<string, number>();
  const prune = (now: number) => { voices = voices.filter((v) => v.end > now); };
  return {
    tryStart(id, now, durationMs, gapMs) {
      prune(now);
      if (voices.length >= opts.maxTotal) return false;
      const same = voices.filter((v) => v.id === id);
      if (same.length >= opts.maxSame) return false;
      const gap = Math.max(opts.minGapMs, gapMs ?? 0);
      if (lastStart.has(id) && now - lastStart.get(id)! < gap) return false;
      lastStart.set(id, now);
      voices.push({ id, start: now, end: now + Math.max(1, durationMs) });
      return true;
    },
    active(now) { prune(now); return voices.length; },
    clear() { voices = []; lastStart.clear(); },
  };
}
