// 賢いマルチプレイ検証 bot: ゲームの「説明書き」を読む（計画 §4 の共通の決まり・直し12）
// カード・ジョブ・装備・属性の、決まった中身だけ（人がカードの字や図鑑を読むのと同じ）。エンジンの状態・乱数・霧の中は読まない。
// scripts/gameData.mjs と同じやり方（vite で src の TypeScript をそのまま読む）。始める前に1回だけ読み、字と数だけの形にして頭に渡す。
// 場面ごとの使い方は content/battle.mjs・content/reward.mjs・content/dungeon.mjs（2人の作業者が同じファイルを触らない。直し12）。
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** 読んだ説明書き（頭はここから読む。読む前は空。selftest では小さな作り物を入れる） */
export const KB = { ready: false, cards: {}, cardByName: {}, classes: {}, classByName: {}, items: {}, itemByName: {}, elements: {}, elementByName: {}, statLabel: {} };

const RARITY_RANK = { common: 0, rare: 1, epic: 2, legend: 3 };
export const rarityRank = (r) => RARITY_RANK[r] ?? 0;

/** 効果の並びから、bot が使う数だけを取り出す（数の合計。見込みの目安で、ゲームの計算ではない） */
function sumEffects(effects = []) {
  const o = { dmg: 0, hits: 0, block: 0, heal: 0, healAll: false, blockAll: false, dmgAll: false, element: null, kinds: [] };
  for (const e of effects) {
    o.kinds.push(e.kind);
    if (e.kind === 'damage') {
      const hits = e.hits ?? 1;
      o.dmg += (e.amount ?? 0) * hits;
      o.hits += hits;
      if (e.element && !o.element) o.element = e.element;
      if (e.to === 'foes') o.dmgAll = true;
    } else if (e.kind === 'block') {
      o.block += e.amount ?? 0;
      if (e.to === 'allies') o.blockAll = true;
    } else if (e.kind === 'heal' || e.kind === 'overflowHeal') {
      o.heal += e.amount ?? 0;
      if (e.to === 'allies') o.healAll = true;
    }
  }
  return o;
}

/** カード1枚の要約（下の段 = 一番少ない成功・上の段 = 完全成功） */
function cardInfo(c) {
  const tiers = (c.tiers ?? []).map((t) => ({ min: t.minSuccesses, ...sumEffects(t.effects) }));
  const top = tiers[tiers.length - 1] ?? sumEffects([]);
  const low = tiers[0] ?? top;
  const element = tiers.find((t) => t.element)?.element ?? null;
  return {
    id: c.id,
    name: c.name,
    category: c.category,
    cost: c.cost,
    target: c.target,
    slots: c.slots,
    baseChance: c.baseChance,
    rarity: c.rarity ?? 'common',
    element,
    exhaust: !!c.exhaust,
    tiers,
    dmg: top.dmg,
    dmgLow: low.dmg,
    block: top.block,
    heal: top.heal,
    healAll: tiers.some((t) => t.healAll),
    aoe: c.target === 'allEnemies' || tiers.some((t) => t.dmgAll),
    kinds: [...new Set(tiers.flatMap((t) => t.kinds))],
  };
}

/** ジョブの要約。mainStat = 基礎の能力値で一番高い物（攻撃に使う力・知力・器用の中から） */
function classInfo(c, cards) {
  const st = c.stats ?? {};
  const mainStat = ['str', 'int', 'dex'].sort((a, b) => (st[b] ?? 0) - (st[a] ?? 0) || ['str', 'int', 'dex'].indexOf(a) - ['str', 'int', 'dex'].indexOf(b))[0];
  const deckIds = (c.deck ?? []).map((d) => d.cardId);
  // 回復役: 最初の山札に、味方を回復するカードがある（データの役割の字は見ない。カードの中身で決める）
  const healer = deckIds.some((id) => (cards[id]?.heal ?? 0) > 0 && cards[id]?.target !== 'enemy');
  return { id: c.id, name: c.name, role: c.role, tier: c.tier ?? 'base', weaponType: c.weaponType, subWeapons: c.subWeapons ?? [], mainStat, healer, deck: deckIds };
}

function itemInfo(i) {
  const stats = i.stats ?? {};
  const statSum = Object.values(stats).reduce((a, b) => a + (b ?? 0), 0);
  const use = Array.isArray(i.use) ? i.use : i.use ? [i.use] : [];
  return {
    id: i.id,
    name: i.name,
    slot: i.slot,
    weaponType: i.weaponType ?? null,
    rarity: i.rarity ?? 'common',
    stats,
    statSum,
    maxHp: i.maxHp ?? 0,
    focusMax: i.focusMax ?? 0,
    ability: !!i.ability,
    heal: use.filter((e) => e.kind === 'heal').reduce((a, e) => a + (e.amount ?? 0), 0),
    useKinds: use.map((e) => e.kind),
  };
}

/** 説明書きを読む（始める前に1回）。返す物: KB */
export async function loadContent() {
  if (KB.ready) return KB;
  const { createServer } = await import('vite');
  const server = await createServer({ root: ROOT, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
  try {
    const { CARDS } = await server.ssrLoadModule('/src/data/cards/index.ts');
    const { CLASSES } = await server.ssrLoadModule('/src/data/classes/index.ts');
    const { ITEMS } = await server.ssrLoadModule('/src/data/items/index.ts');
    const { ELEMENTS } = await server.ssrLoadModule('/src/data/elements/index.ts');
    const { STAT_LABEL } = await server.ssrLoadModule('/src/data/terms.ts');
    fillContent({ cards: CARDS.all, classes: CLASSES.all, items: ITEMS.all, elements: ELEMENTS.all, statLabel: STAT_LABEL });
  } finally {
    await server.close();
  }
  return KB;
}

/** 生のデータから KB を作る（自己テストは小さな作り物を渡す） */
export function fillContent({ cards = [], classes = [], items = [], elements = [], statLabel = {} }) {
  for (const c of cards) {
    KB.cards[c.id] = cardInfo(c);
    KB.cardByName[c.name] ??= c.id;
    KB.cardByName[`${c.name}＋`] ??= c.id;
  }
  for (const c of classes) {
    KB.classes[c.id] = classInfo(c, KB.cards);
    KB.classByName[c.name] ??= c.id;
  }
  for (const i of items) {
    KB.items[i.id] = itemInfo(i);
    KB.itemByName[i.name] ??= i.id;
  }
  for (const e of elements) {
    KB.elements[e.id] = e.name;
    KB.elementByName[e.name] ??= e.id;
  }
  KB.statLabel = { ...statLabel };
  KB.ready = true;
  return KB;
}
