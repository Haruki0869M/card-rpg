// 敵の増援: 敵が別の敵を戦場に呼ぶ（海賊船長が幽霊の部下を呼ぶなど）。味方のお供を呼ぶ summon とは別の部品。
// 決まり（K4 で決めた初期値）:
// - 戦場の枠は BALANCE.maxEnemies（4）まで。倒れた敵の枠も数える（画面の並びが崩れないように）。空きが無ければ呼ばない
// - 1体の敵が1戦闘で呼べる回数は uses 回（省略は2）。1回に count 体（省略は1）
// - 呼ばれた敵は、呼んだ敵と同じだけレベル・強さ（人数・難易度の補正）を引き継ぐ。次のターンから動く
// - 呼ばれた敵を倒しても、経験値・お金は出ない（EnemyState.summoned）
// 「仲間を呼ぶ」（敵の特殊な行動・砦の小悪魔。call: true）は、決まりが少し違う（docs/tasks/enemy-behaviors-plan.md §7）:
// - 戦場は BALANCE.maxEnemies 体まで。倒れた敵は数えない（並びの数が増えた時の見せ方は Battlefield.tsx の fieldEnemies）
// - 呼ばれた敵は、呼んだ敵と同じレベル（人数・難易度の補正も同じ）。倒すと、ふつうの敵と同じだけ経験値・お金を落とす
// - 呼べない時（満員・回数切れ）は、orElse の行動（その敵のふつうの攻撃）を代わりに行う。予告を決める時にも見て、
//   呼べないと分かっていれば、予告の時点でその行動に変える（intents.ts の chooseAction）
import { BALANCE } from '../../../../data/balance';
import { getEnemy, getEnemyAction } from '../../../../data/enemies';
import { fireAbilities } from '../../../abilities';
import { enemyLevelFactors } from '../../levels';
import { emptyStatuses } from '../../statuses';
import { addLog, enemyName, isEnemy } from '../../units';
import { applyEffect } from '..';
import type { BattleState, EnemyState } from '../../../../types';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    /** call = 「仲間を呼ぶ」の決まり（上の説明）。orElse = 呼べない時に代わりに行う、同じ敵の行動のID */
    summonEnemy: { enemy: string; count?: number; uses?: number; call?: boolean; orElse?: string };
  }
}

type Counters = { counters?: Record<string, number> };

/** その敵が、今この効果で1体以上呼べるか（回数と戦場の空き。乱数は使わない） */
export function canSummonEnemy(state: BattleState, source: EnemyState, e: { enemy: string; uses?: number; call?: boolean }): boolean {
  if (source.dead) return false;
  const used = (source as Counters).counters?.[`summonEnemy:${e.enemy}`] ?? 0;
  if (used >= (e.uses ?? 2)) return false;
  return fieldCount(state, !!e.call) < BALANCE.maxEnemies;
}

/** 戦場の数（call = 倒れた敵は数えない） */
const fieldCount = (state: BattleState, call: boolean) => (call ? state.enemies.filter((x) => !x.dead).length : state.enemies.length);

export const effect: EffectHandler<'summonEnemy'> = {
  kind: 'summonEnemy',
  defaultTo: 'self',
  apply(ctx, e) {
    const { state, source } = ctx;
    if (!isEnemy(source) || source.dead) return false;
    // 呼べない時: 代わりの行動（ふつうの攻撃）。予告の狙いが無ければ、ここで決める（種から作る乱数）
    if (!canSummonEnemy(state, source, e)) {
      if (!e.orElse) return false;
      const alt = getEnemyAction(source.defId, e.orElse);
      const alive = state.allies.filter((a) => !a.dead);
      if (source.intent && !source.intent.targetId && alive.length) source.intent = { ...source.intent, targetId: alive[ctx.rng.int(alive.length)].id };
      ctx.parts.push(`呼べないので「${alt.name}」`);
      let any = false;
      for (const x of alt.effects) any = applyEffect(ctx, x) || any;
      return any;
    }
    const c = ((source as Counters).counters ??= {});
    const key = `summonEnemy:${e.enemy}`;
    const def = getEnemy(e.enemy);
    const own = getEnemy(source.defId);
    // 呼んだ敵の強さの補正（人数・難易度・レベル）を、呼ばれた敵にもかける
    const ownF = enemyLevelFactors(own, source.level);
    const hpScale = source.maxHp / Math.max(1, own.maxHp * ownF.hp);
    const atkScale = source.attackMul / ownF.attack;
    // 仲間を呼ぶ: 呼んだ敵と同じレベル。増援（今までの決まり）: 元のデータのレベルの差を保つ
    const level = e.call ? source.level : Math.max(1, source.level - own.baseLevel + def.baseLevel);
    const f = enemyLevelFactors(def, level);
    let made = 0;
    for (let i = 0; i < (e.count ?? 1); i++) {
      if (fieldCount(state, !!e.call) >= BALANCE.maxEnemies) break;
      const same = state.enemies.filter((x) => x.defId === e.enemy);
      if (same.length === 1 && !same[0].nameSuffix) same[0].nameSuffix = 'A';
      const hp = Math.max(1, Math.floor(def.maxHp * f.hp * hpScale + 1e-9));
      // uid は並びの長さから決める（倒れた敵も並びに残るので、重ならない）
      const enemy: EnemyState = {
        uid: `e${state.enemies.length}`,
        defId: e.enemy,
        nameSuffix: same.length ? String.fromCharCode(65 + same.length) : undefined,
        level,
        attackMul: f.attack * atkScale,
        hp,
        maxHp: hp,
        block: 0,
        statuses: emptyStatuses(),
        seqIndex: 0,
        history: [],
        dead: false,
        phase: 0,
        // 仲間を呼ぶ: ふつうの敵と同じだけ報酬を落とす（1体の敵が呼べるのは1戦闘に uses 回まで）
        ...(e.call ? {} : { summoned: true }),
      };
      state.enemies.push(enemy);
      made++;
      addLog(state, `${enemyName(enemy)}が現れた！`);
      // 戦闘開始時の特性（開幕のブロックなど）は、現れた時に働く
      if (ctx.depth < 3) fireAbilities(state, ctx.rng, ctx.events, enemy, 'battleStart', { depth: ctx.depth + 1 });
    }
    if (!made) return false;
    c[key] = (c[key] ?? 0) + 1;
    ctx.parts.push(`${def.name}を${made > 1 ? `${made}体` : ''}呼んだ`);
    return true;
  },
  describe: (e) =>
    e.call
      ? `${getEnemy(e.enemy).name}を${(e.count ?? 1) > 1 ? `${e.count}体` : ''}呼ぶ（次のターンから動く。敵は${BALANCE.maxEnemies}体まで・1戦闘${e.uses ?? 2}回まで。呼べない時は${e.orElse ? 'ふつうの攻撃' : '何もしない'}）`
      : `${getEnemy(e.enemy).name}を${(e.count ?? 1) > 1 ? `${e.count}体` : ''}呼ぶ（次のターンから動く。戦場は${BALANCE.maxEnemies}体まで・1戦闘${e.uses ?? 2}回まで。倒しても報酬なし）`,
  short: (e) => `+${e.count ?? 1}`,
};
