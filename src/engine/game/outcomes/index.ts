// ===== 冒険の効果の登録表 =====
// 新しい結果の種類: kinds/ にファイルを1つ置くだけで、イベント・祠・依頼のデータから使える。
// 戦闘の効果と同じ名前の種類（heal / gainFocus / cleanse）は、消費アイテムを戦闘の外で使った時にも使われる。
import { livingHeroes } from '../heroes';
import type { EventOutcome, GameState, Hero, Loot } from '../../../types';
import type { Rng } from '../../rng';
import type { OutcomeCtx, OutcomeHandler } from './types';

export type { OutcomeCtx, OutcomeHandler } from './types';

const HANDLERS = new Map<string, OutcomeHandler>();
for (const [path, mod] of Object.entries(import.meta.glob('./kinds/*.ts', { eager: true }) as Record<string, { outcome?: OutcomeHandler }>).sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  const h = mod.outcome;
  if (!h) throw new Error(`outcome file without "export const outcome": ${path}`);
  if (HANDLERS.has(h.kind)) throw new Error(`Duplicate outcome kind: ${h.kind}`);
  HANDLERS.set(h.kind, h as OutcomeHandler);
}

export const hasOutcomeKind = (kind: string) => HANDLERS.has(kind);
export function outcomeHandler(kind: string): OutcomeHandler {
  const h = HANDLERS.get(kind);
  if (!h) throw new Error(`Unknown outcome kind: ${kind}`);
  return h;
}

export function makeOutcomeCtx(game: GameState, rng: Rng, actor?: Hero): OutcomeCtx {
  return {
    game,
    rng,
    actor,
    loot: [],
    targets: (all) => (all ? livingHeroes(game) : actor ? [actor] : livingHeroes(game).slice(0, 1)),
  };
}

export function applyOutcome(ctx: OutcomeCtx, o: EventOutcome) {
  outcomeHandler(o.kind).apply(ctx, o as never);
}

export function checkOutcome(ctx: OutcomeCtx, o: EventOutcome): string | null {
  return outcomeHandler(o.kind).check?.(ctx, o as never) ?? null;
}

export const describeOutcome = (o: EventOutcome) => outcomeHandler(o.kind).describe(o as never);

export type { Loot };
