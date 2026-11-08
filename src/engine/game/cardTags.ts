// ===== カードの印と、報酬のスマート抽選（設計 v2 §2） =====
// カードの印は効果から自動で付ける（属性・状態異常・ブロック・回復・連撃・一撃・コスト…）＋ カードの tags。
// 報酬の3枚のうち2枚は、今の山札・装備の印と重なるほど出やすい。残り1枚は完全ランダム（新しい方向の発見）。
import { BALANCE } from '../../data/balance';
import { CARDS } from '../../data/cards';
import { CLASSES, getClass } from '../../data/classes';
import { getItem } from '../../data/items';
import type { CardDef, Effect, Hero } from '../../types';
import type { Rng } from '../rng';
import { equippedItems } from './hero';

const cache = new Map<string, string[]>();

/** カードの印（効果から自動で付くもの＋手で付けたもの） */
export function cardTags(card: CardDef): string[] {
  const hit = cache.get(card.id);
  if (hit) return hit;
  const t = new Set<string>([card.category, ...(card.tags ?? [])]);
  const top = card.tiers[card.tiers.length - 1]?.effects ?? [];
  const all: Effect[] = card.tiers.flatMap((x) => x.effects);
  let dmg = 0;
  let hits = 0;
  for (const e of top) {
    if (e.kind === 'damage') {
      hits++;
      dmg += e.amount;
    }
  }
  for (const e of all) {
    const r = e as Effect & { element?: string; status?: string };
    if (r.kind === 'damage' && r.element) t.add(r.element);
    if (r.kind === 'applyStatus' && r.status) t.add(r.status);
    if (r.kind === 'block') t.add('block');
    if (r.kind === 'heal' || r.kind === 'healPctOfDealt') t.add('heal');
    if (r.kind === 'gainFocus') t.add('focus');
    if (r.kind === 'gainMana') t.add('mana');
    if (r.kind === 'draw') t.add('draw');
    if (r.kind === 'steal') t.add('steal');
    if (r.to === 'allies' || r.to === 'otherAllies' || r.to === 'lowestAlly') t.add('support');
  }
  if (hits >= 3) t.add('multi');
  if (dmg >= 15) t.add('heavy');
  if (card.cost >= 2) t.add('highCost');
  if (card.cost === 0) t.add('free');
  if (card.target === 'allEnemies') t.add('aoe');
  const out = [...t];
  cache.set(card.id, out);
  return out;
}

/** 最初の山札のカード（どのジョブでも持つ基本のカードは、好みの判断に使わない） */
let starters: Set<string> | undefined;
const starterIds = () => (starters ??= new Set(CLASSES.all.flatMap((c) => c.deck.map((d) => d.cardId))));

/** キャラの好み: 山札（最初のカード以外）と装備の印の数 */
export function heroTagProfile(hero: Hero): Map<string, number> {
  const m = new Map<string, number>();
  const add = (tags: string[], n = 1) => tags.forEach((x) => m.set(x, (m.get(x) ?? 0) + n));
  for (const c of hero.deck) if (!starterIds().has(c.cardId) && CARDS.has(c.cardId)) add(cardTags(CARDS.get(c.cardId)));
  for (const it of equippedItems(hero)) {
    add(it.tags ?? [], 2);
    for (const c of it.cards ?? []) if (CARDS.has(c.cardId)) add(cardTags(CARDS.get(c.cardId)));
  }
  return m;
}

/** そのカードの出やすさ（1 + 重なった印の数 × 係数。上限あり）。strength = 係数の倍率（ショップは弱め） */
export function synergyWeight(card: CardDef, profile: Map<string, number>, strength = 1): number {
  const S = BALANCE.smartDraw;
  // 種類（物理・魔法・技）だけの重なりは数えない（どのカードにも付くので）
  const overlap = cardTags(card).filter((x) => x !== card.category && (profile.get(x) ?? 0) > 0).length;
  return Math.min(S.maxWeight, 1 + S.perTag * strength * overlap);
}

/** 候補の基本の重み: ジョブ専用は1、武器種・系統のカードは balance.cardPoolWeight（候補が増えても専用カードが埋もれないように） */
export function poolWeight(card: CardDef, hero: Hero): number {
  const W = BALANCE.cardPoolWeight;
  if (card.weaponType) return getClass(hero.classId).weaponType === card.weaponType ? W.mainWeapon : W.subWeapon;
  if (card.lineage) return W.lineage;
  return 1;
}

/** 候補から1枚選ぶ。smart = 好みで重み付けする */
export function pickCard(cands: string[], hero: Hero, rng: Rng, smart: boolean, strength = 1): string {
  if (cands.length < 2) return cands[rng.int(cands.length)];
  const profile = smart ? heroTagProfile(hero) : undefined;
  const w = cands.map((id) => poolWeight(CARDS.get(id), hero) * (profile ? synergyWeight(CARDS.get(id), profile, strength) : 1));
  const total = w.reduce((a, b) => a + b, 0);
  let x = rng.next() * total;
  for (let i = 0; i < cands.length; i++) {
    x -= w[i];
    if (x < 0) return cands[i];
  }
  return cands[cands.length - 1];
}

export const itemTags = (itemId: string) => getItem(itemId).tags ?? [];
