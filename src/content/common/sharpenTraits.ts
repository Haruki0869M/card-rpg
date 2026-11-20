// 区切りD-5: 《研ぎ澄まし》（完全成功時フォーカス+1。25枚に同じ物が付いていた）を、ジョブの戦闘の力に合う力へ差し替えた物
// 表: docs/tasks/lineup-stageD5-table.md（オーナーの OK 2026-11-12）。きっかけは全部「完全成功時」のまま。数値は【提案】
import { BALANCE } from '../../data/balance';
import type { AbilityDef, Effect } from '../../types';

const perfect = (name: string, ...effects: Effect[]): AbilityDef => ({ name, effect: { when: 'perfect', do: effects } });
const status = (s: string, amount: number, to: 'self' | 'allies' | 'foes' | 'lowestAlly'): Effect => ({ kind: 'applyStatus', status: s, amount, to });
const gold = (amount: number): Effect => ({ kind: 'gainGold', amount });

/** カードの id → 新しい特殊能力 */
export const SHARPEN_TRAITS: Record<string, AbilityDef> = {
  // 巫女・占星術師・機工士・吟遊詩人・賭博師
  maidenPurify: perfect('清め', status('regen', 1, 'allies')),
  starGift: perfect('星の巡り', { kind: 'refundPreview' }),
  machineVolley: perfect('弾幕', { kind: 'extendSummons', turns: 1, only: ['turret'], label: '砲台' }),
  bardStrike: perfect('共鳴', status('songInspired', 1, 'lowestAlly')),
  bardFinale: perfect('余韻', { kind: 'heal', amount: 3, to: 'allies' }),
  gambleTwin: perfect('ゾロ目', gold(5)),
  gambleFinale: perfect('一か八か', gold(15)),
  // 侍・魔剣士・時魔道士・死霊術師・暗黒騎士
  samuraiSwallow: perfect('残心', { kind: 'chargeAttack', factor: 2, max: BALANCE.specialJobs.chargeMax, category: 'physical' }),
  bladeThunder: perfect('雷を宿す', { kind: 'rememberElement' }),
  bladeRelease: perfect('魔剣の循環', { kind: 'grantAbility', turns: 0, abilities: [{ name: '魔剣の循環', effect: { modifier: 'cardCost', delta: -1, turnKey: 'bladeRelease', if: [{ kind: 'cardCategory', category: 'magic' }] } }] }),
  timeMend: perfect('巻き戻し', { kind: 'grantAbility', turns: 1, abilities: [{ name: '巻き戻し', effect: { when: 'turnStart', do: [{ kind: 'gainMana', amount: 1 }] } }] }),
  graveFeast: perfect('魂の収穫', { kind: 'summon', id: 'skeletonSoldier', name: '屍兵', icon: '💀', damage: BALANCE.specialJobs.minionDamage, turns: 99, stackLimit: BALANCE.specialJobs.minionLimit }),
  bloodDrain: { name: '血の契り', effect: { when: 'perfect', if: [{ kind: 'perBattle', key: 'bloodDrain', max: 1 }], do: [{ kind: 'grantAbility', turns: 0, abilities: [{ name: '血の契り', effect: { modifier: 'endure' } }] }] } },
  // 最上位13職
  saintFinale: perfect('極意', status('inspired', 2, 'self')),
  fistFlurry: perfect('連打', { kind: 'countPlayed', n: 1 }),
  elementRevelation: { name: '万象', effect: { when: 'perfect', if: [{ kind: 'weakHit' }], do: [{ kind: 'gainMana', amount: 1 }] } },
  royalPhoenix: perfect('不死鳥', { kind: 'extendSummons', turns: 1 }),
  phantomLegion: perfect('進軍', { kind: 'summonStrike' }),
  royalGrace: perfect('王の加護', { kind: 'block', amount: 4, to: 'allies' }),
  dragonSweep: perfect('舞い戻り', { kind: 'block', amount: 6 }),
  papalLight: perfect('聖光', { kind: 'holyGain', amount: 1 }),
  papalSanctuary: perfect('慈愛の加護', status('regen', 1, 'allies')),
  heavenRain: perfect('矢の雨', status('vulnerable', 1, 'foes')),
  alphaCall: perfect('群れの長', { kind: 'summonStrike' }),
  royalSwipe: perfect('獲物の目', gold(10)),
};

/** 差し替えた特殊能力（無ければ例外。データの書き間違いをすぐ見つけるため） */
export function sharpenTrait(cardId: string): AbilityDef {
  const t = SHARPEN_TRAITS[cardId];
  if (!t) throw new Error(`研ぎ澄ましの差し替えが無い: ${cardId}`);
  return t;
}
