// 賢いマルチプレイ検証 bot: 報酬・取り合いで使う「説明書き」（区切り 2-Sa。直し12: 場面ごとのファイル）
// 成長の選び方・カードの値打ち・戦利品の「欲しい／余れば／いらない」。数字は bot の作戦の【提案】（計画 §4 の報酬・取り合いの行）。
import { KB, rarityRank } from './load.mjs';

/** ジョブの名前（画面のチップの字）→ 説明書き */
export const jobByName = (name) => KB.classes[KB.classByName[name]] ?? null;

/**
 * 成長の選択肢の順（計画 §4: 主に使う能力値 → カードの強化 → 最大 HP → フォーカスの最大 → ほかの能力値）。
 * title = ボタンの字の先頭（「知力 +1」「カード強化」「最大HP +5」「フォーカス最大 +1」）。返す物: 小さいほど先
 */
export function growthRank(text, job) {
  const t = (text ?? '').trim();
  const main = job ? KB.statLabel[job.mainStat] : null;
  if (main && t.startsWith(`${main} +`)) return 0;
  if (t.startsWith('カード強化')) return 1;
  if (t.startsWith('最大HP')) return 2;
  if (t.startsWith('フォーカス最大')) return 3;
  return 4;
}

/** カード1枚の値打ち（報酬で選ぶ・強化する札を選ぶ）。ジョブの得意（回復役は回復）を少し足す */
export function cardValue(id, job) {
  const c = KB.cards[id];
  if (!c) return 0;
  const avgDmg = (c.dmg + c.dmgLow) / 2;
  let v = avgDmg + c.block * 0.8 + c.heal * (job?.healer ? 1.2 : 0.6) + rarityRank(c.rarity) * 4;
  if (c.aoe) v += avgDmg * 0.5;
  if (c.element) v += 1;
  v -= Math.max(0, c.cost - 1) * 2;
  return Math.round(v * 10) / 10;
}

/** 山札の平均の値打ち（bot が覚えている山札 = ジョブの最初の山札＋選んだ札） */
export function deckAverage(ids, job) {
  if (!ids.length) return 0;
  return ids.reduce((a, id) => a + cardValue(id, job), 0) / ids.length;
}

/** 装備の値打ち（格と、主に使う能力値の数。最大 HP は少し） */
export function itemValue(item, job) {
  if (!item) return 0;
  const main = job?.mainStat;
  return rarityRank(item.rarity) * 10 + (item.stats?.[main] ?? 0) * 3 + item.statSum + item.maxHp * 0.2 + (item.ability ? 3 : 0);
}

/**
 * 戦利品の取り合いの答え（計画 §4: 得意な武器 ◎ で今より良い →「欲しい」・使えるが今より良くない／○の武器 →「余れば」・使えない →「いらない」）。
 * gear = bot が覚えている今の装備（{ slot: item }。最初は武器 = ジョブの得意な武器のふつうの品）。返す物: { choice: 'need'|'greed'|'pass', why }
 */
export function claimChoice(itemId, job, gear = {}) {
  const item = KB.items[itemId];
  if (!item) return { choice: 'greed', why: '説明書きに無い品' };
  if (item.slot === 'consumable') return { choice: item.heal > 0 ? 'need' : 'greed', why: item.heal > 0 ? '回復の薬' : '道具' };
  const now = gear[item.slot] ?? null;
  const better = itemValue(item, job) > itemValue(now, job);
  if (item.slot === 'weapon') {
    if (!job) return { choice: 'greed', why: 'ジョブが分からない' };
    if (item.weaponType === job.weaponType) return better ? { choice: 'need', why: `得意な武器（◎ ${item.weaponType}）で今より良い` } : { choice: 'greed', why: `得意な武器（◎）だが今より良くない` };
    if (job.subWeapons.includes(item.weaponType)) return { choice: 'greed', why: `使える武器（○ ${item.weaponType}）` };
    return { choice: 'pass', why: `使えない武器（${item.weaponType}）` };
  }
  return better ? { choice: 'need', why: `${item.slot} が今より良い` } : { choice: 'greed', why: `${item.slot} は今より良くない` };
}

/** 取り合いの字（ボタン）→ 答えの名前 */
export const CLAIM_WORD = { need: '欲しい', greed: '余れば', pass: 'いらない' };
