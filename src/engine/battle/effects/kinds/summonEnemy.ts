// 敵の増援: 敵が別の敵を戦場に呼ぶ（海賊船長が幽霊の部下を呼ぶなど）。味方のお供を呼ぶ summon とは別の部品。
// 決まり（K4 で決めた初期値）:
// - 戦場の枠は BALANCE.maxEnemies（4）まで。倒れた敵の枠も数える（画面の並びが崩れないように）。空きが無ければ呼ばない
// - 1体の敵が1戦闘で呼べる回数は uses 回（省略は2）。1回に count 体（省略は1）
// - 呼ばれた敵は、呼んだ敵と同じだけレベル・強さ（人数・難易度の補正）を引き継ぐ。次のターンから動く
// - 呼ばれた敵を倒しても、経験値・お金は出ない（EnemyState.summoned）
import { BALANCE } from '../../../../data/balance';
import { getEnemy } from '../../../../data/enemies';
import { fireAbilities } from '../../../abilities';
import { enemyLevelFactors } from '../../levels';
import { emptyStatuses } from '../../statuses';
import { addLog, enemyName, isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    summonEnemy: { enemy: string; count?: number; uses?: number };
  }
}

type Counters = { counters?: Record<string, number> };

export const effect: EffectHandler<'summonEnemy'> = {
  kind: 'summonEnemy',
  defaultTo: 'self',
  apply(ctx, e) {
    const { state, source } = ctx;
    if (!isEnemy(source) || source.dead) return false;
    const c = ((source as Counters).counters ??= {});
    const key = `summonEnemy:${e.enemy}`;
    if ((c[key] ?? 0) >= (e.uses ?? 2)) return false;
    const def = getEnemy(e.enemy);
    const own = getEnemy(source.defId);
    // 呼んだ敵の強さの補正（人数・難易度・レベル）を、呼ばれた敵にもかける
    const ownF = enemyLevelFactors(own, source.level);
    const hpScale = source.maxHp / Math.max(1, own.maxHp * ownF.hp);
    const atkScale = source.attackMul / ownF.attack;
    const level = Math.max(1, source.level - own.baseLevel + def.baseLevel);
    const f = enemyLevelFactors(def, level);
    let made = 0;
    for (let i = 0; i < (e.count ?? 1); i++) {
      if (state.enemies.length >= BALANCE.maxEnemies) break;
      const same = state.enemies.filter((x) => x.defId === e.enemy);
      if (same.length === 1 && !same[0].nameSuffix) same[0].nameSuffix = 'A';
      const hp = Math.max(1, Math.floor(def.maxHp * f.hp * hpScale + 1e-9));
      const enemy = {
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
        summoned: true,
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
  describe: (e) => `${getEnemy(e.enemy).name}を${(e.count ?? 1) > 1 ? `${e.count}体` : ''}呼ぶ（次のターンから動く。戦場は${BALANCE.maxEnemies}体まで・1戦闘${e.uses ?? 2}回まで。倒しても報酬なし）`,
  short: (e) => `+${e.count ?? 1}`,
};
