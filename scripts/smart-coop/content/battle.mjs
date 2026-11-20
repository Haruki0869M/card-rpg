// 賢いマルチプレイ検証 bot: 戦闘で使う「説明書き」と、画面の字の読み方（区切り 2-Sa。直し12: 場面ごとのファイル）
// 画面の行（view/scenes/battle.mjs の bEnemies・bAllies）を、頭が使う形にする。数字は字から読む（B組の印が入ったら印に替える）。
// 下の点の数字（弱点 ×1.5・BREAK +30 など）は bot の作戦の【提案】で、ゲームの中身ではない（計画 §4）。
import { KB } from './load.mjs';

const num = (s) => (s === null || s === undefined || s === '' ? null : Number(s));

/** 「12/30」の最初の組 */
export function hpOf(text) {
  const m = /(\d+)\s*\/\s*(\d+)/.exec(text ?? '');
  return m ? { hp: Number(m[1]), max: Number(m[2]) } : { hp: null, max: null };
}

/** 弱点・耐性の札の title「火に弱い」「氷に強い」→ 属性の id */
function elementsOf(titles = []) {
  const weak = [];
  const resist = [];
  for (const t of titles) {
    const m = /^(.+?)に(弱い|強い)$/.exec(t ?? '');
    if (!m) continue;
    const id = KB.elementByName[m[1]] ?? m[1];
    (m[2] === '弱い' ? weak : resist).push(id);
  }
  return { weak, resist };
}

/** 敵の行（bEnemies）→ 頭が使う形。区切り 2-Sb: 最大 HP・攻撃の合計は B2・B3 の印を先に使い、字の「12/30」と違えば mismatch に書く（直し8） */
export function readEnemy(r) {
  const { hp: hpT, max: maxT } = hpOf(r.hpText);
  const maxM = num(r['data-max-hp']);
  const max = maxM ?? maxT;
  const mismatch = r['data-dead'] === null && hpT !== null && maxT !== null && (num(r['data-hp']) !== hpT || (maxM !== null && maxM !== maxT)) ? `敵 ${r['data-enemy']} の HP: 字 ${hpT}/${maxT}・印 ${r['data-hp']}/${r['data-max-hp']}` : null;
  const dmgM = r.intentDamage;
  const lv = /Lv(\d+)/.exec(r.info ?? '');
  const atk = (r.atk ?? []).map((s) => {
    const m = /^(\d+)(?:×(\d+))?$/.exec(s.trim());
    return m ? Number(m[1]) * Number(m[2] ?? 1) : 0;
  });
  const punish = /(\d+)枚以上/.exec(r.brief ?? '');
  const atkText = atk.reduce((a, b) => a + b, 0);
  return {
    uid: r['data-enemy'],
    dead: r['data-dead'] !== null,
    hp: num(r['data-hp']) ?? hpT ?? 0,
    max: max ?? num(r['data-hp']) ?? 1,
    level: lv ? Number(lv[1]) : null,
    name: (r.info ?? '').replace(/^Lv\d+\s*/, '').replace(/[💀👁]\d*/gu, '').trim(),
    ...elementsOf(r.marks),
    big: (r.big ?? 0) > 0,
    broken: (r.broken ?? 0) > 0,
    behavior: r.behavior ?? null,
    frenzy: (r.frenzy ?? 0) > 0,
    // B3: 予告の攻撃の合計（隠れている時は ? = 読まない）。印が無い古い版は字
    atk: dmgM !== null && dmgM !== undefined && dmgM !== '' && dmgM !== '?' && Number.isFinite(Number(dmgM)) ? Number(dmgM) : atkText,
    rank: r['data-rank'] ?? null,
    block: num(r['data-block']) ?? 0,
    mismatch,
    targets: r.targets ?? [],
    countdown: num(r.countdown),
    breakRule: r.breakRule ?? null,
    combo: num(r.combo) ?? 0,
    punishMin: r.behavior === 'punish' ? (punish ? Number(punish[1]) : 4) : null,
  };
}

/**
 * 味方の行（bAllies）→ 頭が使う形。区切り 2-Sb: B1 の印（席・HP・最大 HP・マナ・フォーカス・被弾の予告）を先に使う。
 * mine = この端末のキャラ（印 data-seat = この端末の席。古い版は字「N枚」「済」）。字の HP と印が違えば mismatch に書く（直し8）
 */
export function readAlly(r, seat = null) {
  const t = hpOf(r.text);
  const hp = num(r['data-hp']) ?? t.hp;
  const max = num(r['data-max-hp']) ?? t.max;
  const mismatch = t.hp !== null && r['data-hp'] !== null && r['data-hp'] !== undefined && (t.hp !== hp || t.max !== max) ? `味方 ${r['data-ally']} の HP: 字 ${t.hp}/${t.max}・印 ${hp}/${max}` : null;
  // 区切り 2-Sa の通しの直し: 行の字の最後で見ていた時、状態の印（弱体など）が付くと字の最後が変わり、自分のキャラが分からなくなった
  const mineM = /^(\d+)枚$|^済$/.exec((r.count ?? '').trim());
  return {
    id: r['data-ally'],
    dead: r['data-dead'] !== null,
    done: r['data-done'] !== null,
    hp: hp ?? 0,
    max: max ?? 1,
    incoming: num(r['data-incoming']) ?? num(r.incoming) ?? 0,
    mana: num(r['data-mana']) ?? num((r.mana ?? '').replace(/\D/g, '')),
    focus: num(r['data-focus']) ?? num(/^(\d+)/.exec(r.focus ?? '')?.[1]),
    block: num(r['data-block']) ?? 0,
    seat: r['data-seat'] ?? null,
    mine: seat && r['data-seat'] ? r['data-seat'] === seat : !!mineM,
    name: r.name ?? null,
    mismatch,
  };
}

/** 回復のカードか（味方・自分を回復する） */
export const isHealCard = (c) => !!c && c.heal > 0 && c.target !== 'enemy' && c.target !== 'allEnemies';

/**
 * カード1枚の点（このターンにこのカードを使う値打ち）。返す物: { score, why, target? }
 * ctx = { enemies, allies, me, plays, punishMin, guard }
 */
export function cardScore(card, ctx) {
  if (!card) return { score: 2, why: '説明書きに無いカード' };
  const alive = ctx.enemies.filter((e) => !e.dead);
  const cost = card.cost ?? 1;
  // 回復
  if (card.heal > 0 && card.target !== 'enemy') {
    const hurt = ctx.allies.filter((a) => !a.dead).map((a) => ({ a, r: (a.hp - Math.max(0, a.incoming)) / a.max })).sort((x, y) => x.r - y.r || (x.a.id < y.a.id ? -1 : 1));
    const worst = hurt[0];
    if (card.healAll) {
      const low = hurt.filter((h) => h.r < 0.6).length;
      if (low >= 2) return { score: 30 + card.heal, why: `回復（全体・${low}人が6割より下）` };
    }
    if (worst && worst.r <= 0.35) return { score: 40 + card.heal, why: `回復（${worst.a.id} の HP が3割ほど）`, target: worst.a.id };
    if (worst && worst.r < 0.6) return { score: 14 + card.heal * 0.5, why: `回復（${worst.a.id} の HP が6割より下）`, target: worst.a.id };
    if (card.dmg <= 0) return { score: -5, why: '回復（いま要らない）' };
  }
  // 攻撃
  if (card.dmg > 0) {
    const est = (card.dmg + card.dmgLow) / 2;
    const one = (e, solo) => {
      let s = est;
      const tags = [];
      if (card.element && e.weak.includes(card.element)) {
        s = s * 1.5 + 8;
        tags.push('弱点');
      } else if (card.element && e.resist.includes(card.element)) {
        s = s * 0.5 - 5;
        tags.push('耐性');
      }
      if (e.breakRule && !e.broken) {
        const weakHit = !!card.element && e.weak.includes(card.element);
        if (weakHit) {
          s += 30;
          tags.push('BREAK を狙う');
        } else if (e.breakRule === 'any' && card.slots >= 2) {
          s += 10;
          tags.push('完全成功で BREAK を狙う');
        }
      }
      if (est >= e.hp) {
        s += 25;
        tags.push('倒し切れる');
      }
      if (e.combo > 0 && solo) {
        s += 6 * e.combo;
        tags.push(`連携（仲間が殴った敵 +${e.combo}）`);
      }
      if (solo && ['call', 'purify', 'healSeal'].includes(e.behavior)) {
        s += 6;
        tags.push(`先に倒す（${e.behavior}）`);
      }
      if (e.big && !e.broken) s += 4;
      return { s, tags };
    };
    if (card.aoe || card.target === 'allEnemies') {
      let s = 0;
      const tags = new Set();
      for (const e of alive) {
        const r = one(e, false);
        s += r.s;
        r.tags.forEach((t) => tags.add(t));
      }
      return { score: s - cost * 2, why: `全体攻撃（${alive.length}体${tags.size ? `・${[...tags].join('・')}` : ''}）` };
    }
    // 単体: かばう敵がいれば、そこへ当たる（予告の印 data-intent-behavior="guard"）
    const pool = ctx.guard ? alive.filter((e) => e.uid === ctx.guard) : alive;
    let best = null;
    for (const e of pool) {
      const r = one(e, true);
      if (!best || r.s > best.s) best = { ...r, e };
    }
    if (!best) return { score: -1, why: '狙える敵がいない' };
    return { score: best.s - cost * 2, why: `攻撃 ${best.e.uid}${best.tags.length ? `（${best.tags.join('・')}）` : ''}`, target: best.e.uid };
  }
  // 守り
  if (card.block > 0) {
    const me = ctx.me;
    const inc = me ? me.incoming : 0;
    if (ctx.shatter) return { score: -3, why: '守り（盾砕きの予告があるので使わない）' };
    if (inc > 0) {
      const lethal = me && inc >= me.hp;
      return { score: Math.min(card.block, inc) * 1.2 + (lethal ? 15 : 0) - cost * 2, why: `守り（被弾の予告 ${inc}${lethal ? '・倒れる' : ''}）` };
    }
    return { score: card.blockAll ? 1 : 0, why: '守り（いま被弾の予告なし）' };
  }
  // そのほか（引く・フォーカス・強化・状態異常）
  return { score: 4 - cost, why: `補助（${card.kinds.slice(0, 2).join('・') || '効果'}）` };
}
