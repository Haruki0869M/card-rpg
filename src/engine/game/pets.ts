// ===== お供（ペット。設計 v2.1 §4） =====
// どのジョブでも1匹まで連れて歩ける。獣使い系統（ClassDef.petMaster）は効果が2倍。
// 懐き度は強さを変えない（見た目とログの言い回しだけ）。
import { BALANCE } from '../../data/balance';
import { getClass } from '../../data/classes';
import { getPet, PETS } from '../../data/pets';
import type { AbilityDef, GameState, Hero, PetExplore } from '../../types';
import type { Rng } from '../rng';
import { addLog } from './common';
import { heroFocusMax } from './hero';
import { heroPlace } from './jobs';

/** お供の扱いが得意なジョブか（獣使い系統） */
export const isPetMaster = (hero: Pick<Hero, 'classId'>) => !!getClass(hero.classId).petMaster;

/** お供の戦闘の能力（名前は「お供の名前の能力名」） */
export function petAbilities(hero: Hero): AbilityDef[] {
  if (!hero.pet) return [];
  const def = getPet(hero.pet.petId);
  const list = isPetMaster(hero) ? def.masterAbilities : def.abilities;
  return list.map((a) => ({ ...a, name: `${hero.pet!.name}の${a.name}`, pet: true, source: { kind: 'pet', id: def.id, label: hero.pet!.name, effectName: a.name } }));
}

/** お供の探索の効果（獣使い系統は数値が2倍） */
export function petExplore(hero: Hero | undefined): PetExplore {
  if (!hero?.pet) return {};
  const e = getPet(hero.pet.petId).explore ?? {};
  const k = isPetMaster(hero) ? 2 : 1;
  return {
    vision: (e.vision ?? 0) * k,
    nightVision: e.nightVision,
    moveBonus: (e.moveBonus ?? 0) * k,
    luckBonus: (e.luckBonus ?? 0) * k,
    eventBonus: (e.eventBonus ?? 0) * k,
    campHeal: (e.campHeal ?? 0) * k,
  };
}

/** 懐き度の段階（♡1〜5） */
export function petLoveLevel(love: number): number {
  let lv = 0;
  BALANCE.petLove.forEach((need, i) => {
    if (love >= need) lv = i + 1;
  });
  return Math.max(1, lv);
}

/** 懐き度を上げる（段階が上がったらログで知らせる） */
export function addPetLove(game: GameState, hero: Hero, n: number) {
  const p = hero.pet;
  if (!p || n <= 0) return;
  const before = petLoveLevel(p.love);
  p.love += n;
  const after = petLoveLevel(p.love);
  if (after > before) addLog(game, `${p.name}が${hero.name}にもっと懐いた！（${'♡'.repeat(after)}）`);
}

/** お供を迎える候補（イベントの後）。species の中から count 匹（めったに出ない子は rareChance% で混ざる） */
export function rollPetOffer(species: string[] | undefined, count: number, rng: Rng, rareChance: number = BALANCE.petRareChance): string[] {
  const pool = (species?.length ? species : PETS.all.map((p) => p.id)).filter((id) => PETS.has(id));
  const out: string[] = [];
  for (let guard = 0; out.length < count && guard < 40; guard++) {
    const id = pool[rng.int(pool.length)];
    if (out.includes(id)) continue;
    if (getPet(id).rare && rng.next() * 100 >= rareChance && pool.some((x) => !getPet(x).rare && !out.includes(x))) continue;
    out.push(id);
  }
  return out;
}

/** 通常2色・珍しい2色。データの順序を明示した重みで抽選する。 */
export function rollPetColor(petId: string, rng: Rng): string {
  const colors = getPet(petId).colors;
  const ordered = [...colors.filter(c => c.rarity === 'normal'), ...colors.filter(c => c.rarity === 'rare')];
  let roll = rng.next() * BALANCE.petColorWeights.reduce((n, v) => n + v, 0);
  for (let i = 0; i < ordered.length; i++) {
    roll -= BALANCE.petColorWeights[i];
    if (roll < 0) return ordered[i].id;
  }
  return ordered[ordered.length - 1].id;
}

/** 候補ごとに毛色を1度だけ抽選する。画面側からは呼ばない。 */
export function rollPetOfferColors(offer: string[], rng: Rng): Record<string, string> {
  return Object.fromEntries(offer.map(id => [id, rollPetColor(id, rng)]));
}

/** お供を迎える（petId が無ければ見送る） */
export function adoptPet(game: GameState, hero: Hero, petId: string | undefined, color: string | undefined, name: string | undefined): string | undefined {
  const offer = hero.petOffer;
  if (!offer?.length) return '迎えられるお供はいません';
  if (!petId) {
    delete hero.petOffer;
    delete hero.petOfferColors;
    addLog(game, `${hero.name}はお供を迎えなかった`);
    return undefined;
  }
  if (!offer.includes(petId)) {
    return 'そのお供は選べません';
  }
  const def = getPet(petId);
  const col = def.colors.find((c) => c.id === hero.petOfferColors?.[petId]);
  if (!col) return 'お供の毛色が保存されていません';
  if (color !== undefined && color !== col.id) return '出会ったお供の毛色は変更できません';
  delete hero.petOffer;
  delete hero.petOfferColors;
  const nm = (name ?? '').trim().slice(0, BALANCE.petNameMax) || def.names[game.nextUid % def.names.length];
  if (hero.pet) addLog(game, `${hero.pet.name}は${hero.name}に見送られて、旅立っていった`);
  hero.pet = { petId, color: col.id, name: nm, love: 0, acts: 0 };
  if (col.rarity === 'rare') addLog(game, `✨珍しい毛色！ ${def.name}の${col.name}`);
  addLog(game, `${def.name}（${col.name}）の「${nm}」が${hero.name}の旅のお供になった！`);
  return undefined;
}

/** お供を撫でる（野営・休憩部屋・町・世界マップ）。1回の冒険で最初の1回だけフォーカス+1 */
export function patPet(game: GameState, hero: Hero): string | undefined {
  const p = hero.pet;
  if (!p) return 'お供がいません';
  if (heroPlace(game, hero) === 'busy') return '今は撫でられません';
  addPetLove(game, hero, BALANCE.petLovePat);
  const bird = getPet(p.petId).perch === 'shoulder';
  if (!p.patted) {
    p.patted = true;
    hero.focus = Math.min(heroFocusMax(hero), hero.focus + 1);
    addLog(game, `${hero.name}は${p.name}を${bird ? 'カキカキ' : 'なでなで'}した。心が和んだ（フォーカス+1）`);
  } else addLog(game, `${hero.name}は${p.name}を${bird ? 'カキカキ' : 'なでなで'}した`);
  return undefined;
}

/** 戦闘で活躍した回数を足す */
export function addPetActs(hero: Hero, n: number) {
  if (hero.pet && n > 0) hero.pet.acts += n;
}
