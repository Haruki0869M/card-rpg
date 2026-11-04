import { BALANCE } from '../data/balance';
import type { Affinity, CardDef, CardTier } from '../types';

/** 最終成功率 = 基礎成功率 + 適性補正（5%〜95%に制限） */
export function finalChance(card: CardDef, affinity: Affinity): number {
  const raw = card.baseChance + affinity[card.category];
  return Math.max(BALANCE.chanceMin, Math.min(BALANCE.chanceMax, raw));
}

/** 成功数に対応するTier（minSuccesses 以下で最大のもの） */
export function selectTier(card: CardDef, successes: number): CardTier {
  let chosen = card.tiers[0];
  for (const t of card.tiers) {
    if (t.minSuccesses <= successes && t.minSuccesses >= chosen.minSuccesses) chosen = t;
  }
  return chosen;
}

/** Tierのインデックス */
export function tierIndex(card: CardDef, successes: number): number {
  return card.tiers.indexOf(selectTier(card, successes));
}

function binom(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/**
 * 成功数ごとの確率（index = 成功数）。
 * フォーカス枠は確定成功、残りは成功率pの二項分布。
 */
export function successDistribution(slots: number, focusUsed: number, chancePct: number): number[] {
  const f = Math.min(focusUsed, slots);
  const n = slots - f;
  const p = chancePct / 100;
  const dist = new Array(slots + 1).fill(0);
  for (let k = 0; k <= n; k++) {
    dist[f + k] = binom(n, k) * p ** k * (1 - p) ** (n - k);
  }
  return dist;
}

/** Tierごとの確率（card.tiers と同じ並び） */
export function tierDistribution(card: CardDef, focusUsed: number, chancePct: number): number[] {
  const dist = successDistribution(card.slots, focusUsed, chancePct);
  const out = new Array(card.tiers.length).fill(0);
  dist.forEach((p, s) => {
    out[tierIndex(card, s)] += p;
  });
  return out;
}

/**
 * 確率を表示用の整数%に丸める（合計が100%になるよう最大剰余法で調整）。
 * 0より大きい確率は最低でも「<1」と分かるよう呼び出し側で扱う。
 */
export function toPercents(probs: number[]): number[] {
  const raw = probs.map((p) => p * 100);
  const floors = raw.map(Math.floor);
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (rest <= 0) break;
    floors[i] += 1;
    rest--;
  }
  return floors;
}
