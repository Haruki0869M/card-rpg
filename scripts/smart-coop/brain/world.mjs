// 賢いマルチプレイ検証 bot: 頭「世界マップ」（区切り 1-J は歩くだけ。行き先の網羅・道探し・潮や寒さは区切り 2-Sb）
// 行き先: 画面の「次の目的」（目的地の輪 data-goal-mark と、次の目的の行の data-goal-line / data-goal-short）。
//   霧の中でも輪は画面に出ている（人が見ているのと同じ物）。地形の印（data-terrain など）はまだ無いので、
//   「光っている行けるマス（data-reach）のうち、目的地の輪に画面の上で一番近いマス」を選ぶ（まっすぐ近づく）。
// 仲間: 先頭の人（P1）が、同じマスの仲間を同行に誘う（計画 §4）。誘われた側の返事は brain/common.mjs。
// 決まり: 見るのは View だけ。自分の手番（手番の駒 data-active の席 = この端末の席）でなければ押さない。
import { G, findMark, decide } from './common.mjs';

const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** 次の目的のダンジョンの id（画面の「次の目的」の行の印） */
export function goalDungeon(v) {
  const g = (v.facts.goalId ?? [])[0];
  return g ? g['data-goal-line'] ?? g['data-goal-short'] : null;
}

/**
 * 世界マップの1手。返す物: 決め か null（待つ）
 * board.world: { invited: Set } … 相談の板（同じ人を何度も誘わない）
 */
export function worldBrain(v, board) {
  if (v.screen !== 'game' || v.mode !== 'world') return null;
  const active = (v.facts.activeHero ?? [])[0];
  if (!active || active['data-seat'] !== v.seat) return null; // 自分の手番でない
  board.world ??= { invited: new Set() };
  const goalId = goalDungeon(v);
  // 1. 目的のダンジョンのマスにいる →「〜に入る」
  if (goalId) {
    const enter = findMark(v, 'data-interact-id', goalId);
    if (enter?.enabled && enter.marks.includes('data-interact-kind=dungeon')) return decide(G.interact('dungeon', goalId), `「${enter.text}」`, { turn: true });
  }
  // 2. 先頭の人（P1）は、同じマスの仲間を同行に誘う（誘いは1人1回。返事は相手の端末）
  if (v.seat === 'P1') {
    const inv = v.actions.find((a) => a.enabled && a.marks.includes('data-invite=no'));
    const hero = inv?.marks.find((m) => m.startsWith('data-companion='))?.slice('data-companion='.length);
    if (hero && !board.world.invited.has(hero)) {
      board.world.invited.add(hero);
      return decide(G.invite(hero), `同行に誘う（${hero}）`, { turn: true });
    }
    // 誘いの返事を待っている間は動かない（一緒に動くため）
    if (v.actions.some((a) => a.marks.includes('data-invite=wait'))) return null;
  }
  // 3. 移動の提案の返事を待っている（仲間がまだ同意していない）間は動かない
  if (v.facts.moveProposal) return null;
  // 4. 行き先を選んである →「ここへ進む」
  const go = findMark(v, 'data-move-go');
  if (go?.enabled) return decide(G.moveGo, `「${go.text}」`, { turn: true });
  // 5. サイコロを振る
  const roll = findMark(v, 'data-roll-move');
  if (roll?.enabled) return decide(G.rollMove, 'サイコロを振る', { turn: true });
  // 6. 行けるマスのうち、目的地の輪に一番近いマス（今の場所より近い時だけ。同じ近さなら番号の小さいマス）
  const goal = (v.facts.goalMark ?? [])[0];
  const reach = v.facts.reach ?? [];
  if (goal && reach.length) {
    const here = d2(active, goal);
    let best = null;
    for (const r of reach) {
      const d = d2(r, goal);
      if (d >= here) continue;
      if (!best || d < best.d || (d === best.d && Number(r['data-reach']) < Number(best.r['data-reach']))) best = { r, d };
    }
    if (best) return decide(G.reach(best.r['data-reach']), `行けるマス ${best.r['data-reach']}（移動力 ${best.r['data-cost']}）`, { turn: true, map: true });
  }
  // 7. 近づけるマスが無い・移動力を使い切った →「待機」か「手番を終える」
  const wait = findMark(v, 'data-world-wait');
  if (wait?.enabled) return decide(G.worldWait, `「${wait.text}」`, { turn: true });
  return null;
}
