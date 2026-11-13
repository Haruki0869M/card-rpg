// 敵の特殊な行動の種類ごとの、予告の札と、いつも出す1行の案内（敵の特殊な行動の直し・docs/tasks/enemy-behaviors-fix-plan.md §3）。
// 行動のデータの behavior で選ぶ。1行の案内は、行動の brief があればそれ、無ければ下の既定の文（数字は行動の効果から作る）。
// 長押しの長い文は、行動の hint（今のまま）
import type { EnemyActionDef, EnemyBehaviorId } from '../types';
import { BALANCE } from './balance';

export interface EnemyBehaviorDef {
  /** 札の絵文字 */
  icon: string;
  /** 札の名前 */
  label: string;
  /** 敵が3体以上で予告の枠が狭い時の、札の短い名前（3文字まで。2026-11-13） */
  short: string;
  /** いつも出す1行の案内の既定（行動の効果から作る） */
  brief: (action: EnemyActionDef) => string;
}

export const ENEMY_BEHAVIORS: Record<EnemyBehaviorId, EnemyBehaviorDef> = {
  punish: {
    icon: '⚠️',
    label: '手数読み',
    short: '手数',
    brief: (a) => {
      const e = a.effects.find((x) => x.kind === 'punishPlays');
      return `${e && e.kind === 'punishPlays' ? e.min : 4}枚以上使うと反撃`;
    },
  },
  guard: { icon: '🛡️', label: 'かばう', short: 'かばう', brief: () => '単体攻撃を代わりに受ける' },
  healSeal: { icon: '🚫', label: '癒し封じ', short: '癒封じ', brief: () => '回復が2ターン半分' },
  call: { icon: '📢', label: '増援', short: '増援', brief: () => '仲間を1体呼ぶ' },
  hunt: { icon: '🎯', label: '手負い狙い', short: '手負い', brief: () => 'HPの低い味方を狙う' },
  shatter: { icon: '🔨', label: '盾砕き', short: '盾砕き', brief: () => 'ブロックを全部壊す' },
  purify: { icon: '✨', label: '浄化', short: '浄化', brief: () => '状態異常を消して回復' },
};

/**
 * 強敵の本気の予告の札（2026-11-13 docs/tasks/elite-plan.md 柱1）。紫の札（特殊な行動）・赤い札（大技）と見分けられる橙の札。
 * brief = いつも出す1行の案内、long = 長押しの説明
 */
export const FRENZY_BADGE = {
  icon: '🔥',
  label: '本気',
  short: '本気',
  brief: `威力×${BALANCE.eliteFrenzy.power}`,
  long: `HPが半分を切って本気になった。次の攻撃は${BALANCE.eliteFrenzy.power}倍。BREAK するか、守りを固めるか、その前に倒すか`,
  /** 本気の行動が大技でない時（BREAK できない）の長押しの説明 */
  longNoBreak: `HPが半分を切って本気になった。次の攻撃は${BALANCE.eliteFrenzy.power}倍。守りを固めるか、その前に倒すか`,
} as const;

/** 行動の札と1行の案内（特殊な行動でなければ undefined） */
export function behaviorBadge(action: EnemyActionDef): { id: EnemyBehaviorId; icon: string; label: string; short: string; brief: string } | undefined {
  if (!action.behavior) return undefined;
  const def = ENEMY_BEHAVIORS[action.behavior];
  return { id: action.behavior, icon: def.icon, label: def.label, short: def.short, brief: action.brief ?? def.brief(action) };
}

/**
 * 行動の効果から見た、特殊な行動の種類（データの behavior の付け忘れを、テストで見つけるため）。
 * 手数読み = punishPlays・かばう = guardAllies・浄化 = purify・増援 = 仲間を呼ぶ（summonEnemy の call）・盾砕き = shieldBreak・
 * 癒し封じ = 癒し封じの状態異常を付ける・手負い狙い = HPが半分以下の相手に倍率のかかるダメージ
 */
export function behaviorFromEffects(action: EnemyActionDef): EnemyBehaviorId | undefined {
  for (const e of action.effects) {
    if (e.kind === 'punishPlays') return 'punish';
    if (e.kind === 'guardAllies') return 'guard';
    if (e.kind === 'purify') return 'purify';
    if (e.kind === 'summonEnemy' && e.call) return 'call';
    if (e.kind === 'shieldBreak') return 'shatter';
    if (e.kind === 'applyStatus' && e.status === 'healSeal') return 'healSeal';
    if (e.kind === 'damage' && e.lowHpMul) return 'hunt';
  }
  return undefined;
}
