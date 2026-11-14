// 区切りD-4: 決め技（レジェンド・1戦闘に1回）。最上位・特殊の23職に1枚ずつ（今ある5枚: 奇跡・強奪・跳躍・神降ろし・時間停止 ＋ この18枚）
// 転職した時に山札へ1枚入る（各ジョブの jobCards）。数値は docs/tasks/lineup-phase2-cards.md §1 と、Gemini の2回目の判定（先頭の囲み）のとおり
// 【提案】と書いた所は Claude が決めた所
import { BALANCE } from '../../../data/balance';
import type { AbilityDef, AbilityEffect, CardCategory, CardDef, CardTarget, Effect, StatId } from '../../../types';

const d = (amount: number): Effect => ({ kind: 'damage', amount });
const el = (element: string, amount: number): Effect => ({ kind: 'damage', amount, element });
const st = (status: string, amount: number): Effect => ({ kind: 'applyStatus', status, amount });
const t = (name: string, effect: AbilityEffect, also?: AbilityEffect[]): AbilityDef => ({ name, effect, ...(also ? { also } : {}) });

type Opt = { stat?: StatId; trait: AbilityDef; tags?: string[] };
/** 決め技を1枚作る（レジェンド・1戦闘1回）。tiers は成功数0から順に */
function c(id: string, name: string, category: CardCategory, cost: number, baseChance: number, target: CardTarget, tiers: Effect[][], o: Opt): CardDef {
  return { id, name, category, cost, slots: tiers.length - 1, baseChance, target, tiers: tiers.map((effects, i) => ({ minSuccesses: i, effects })), rarity: 'legend', exhaust: true, ...o };
}

/** このターン、自分の物理カードのダメージ×1.5（剣聖の極み） */
const SWORD_PEAK: Effect = { kind: 'grantAbility', turns: 0, abilities: [{ name: '剣聖の極み', effect: { modifier: 'damageDealt', multiplier: 1.5, if: [{ kind: 'cardCategory', category: 'physical' }] } }] };
/** 聖王の絶対領域: 次の自分の番まで、味方全員のブロックが消えず（上限50）、悪い状態異常を受けない */
const SANCTUM: Effect[] = [
  { kind: 'grantAbility', turns: 1, to: 'allies', abilities: [{ name: '絶対領域', effect: { modifier: 'keepBlock', max: 50, fortify: true } }] },
  { kind: 'grantAbility', turns: 0, to: 'allies', abilities: [{ name: '絶対領域の加護', effect: { modifier: 'statusGuard' } }] },
];
/** 百獣の王の咆哮: 3ターンの間、味方全員のお供・召喚の攻撃×2 */
const BEAST_KING: Effect = { kind: 'grantAbility', turns: 2, to: 'allies', abilities: [{ name: '百獣の王', effect: { modifier: 'damageDealt', multiplier: 2, if: [{ kind: 'viaCompanion' }] } }] };
/** 八咫烏: 分身を2つまで戻し、霞（次に受ける攻撃1回を0にする） */
const YATA: Effect[] = [
  ...[1, 2].map((n): Effect => ({ kind: 'summon', id: `shadowClone${n}`, name: `分身${n}`, icon: '👤', damage: 0, turns: 99, echoPct: 50, intercept: true, replace: true })),
  { kind: 'summon', id: 'yataMist', name: '霞', icon: '🌫', damage: 0, turns: 99, intercept: true, replace: true },
];
/** 無明逆流れ: この敵の番に受ける最初の攻撃を無効にして、25で返す */
const MUMYOU: Effect = { kind: 'summon', id: 'mumyou', name: '無明', icon: '🗡', damage: 0, turns: 99, intercept: true, counter: 25, replace: true };
/** 居合（次の物理×4） */
const IAI: Effect = { kind: 'chargeAttack', factor: BALANCE.specialJobs.chargeMax, max: BALANCE.specialJobs.chargeMax, category: 'physical' };
/** 運命のグランドクロス: 味方それぞれ、次に使う1枚だけ完全成功（このターン） */
const GRAND_CROSS: Effect = { kind: 'grantAbility', turns: 0, to: 'allies', abilities: [{ name: '運命のグランドクロス', effect: { modifier: 'completeSlots', turnKey: 'grandCross' } }] };
/** 英雄たちの交響曲の部品 */
const SONG = { focus: { kind: 'symphony', focus: 1 } as Effect, mana: { kind: 'symphony', mana: 1 } as Effect, boost: { kind: 'symphony', boostPct: 50 } as Effect };
const focusAll = (n: number): Effect => ({ kind: 'gainFocus', amount: n, to: 'allies' });

/** 明鏡止水: 次の敵の番の間、《後の先》が2倍・上限なし */
const MIRROR: Effect = { kind: 'grantAbility', turns: 0, abilities: [{ name: '明鏡止水', effect: { modifier: 'mirrorCounter' } }] };
/** キズナ大暴走: お供の能力を3回 */
const RAMPAGE: Effect = { kind: 'petRampage', times: 3 };

/** ラグナロク・ブレード: この戦闘で使った属性それぞれの状態異常を1ずつ */
const RAG: Effect = { kind: 'usedElementStatuses', amount: 1 };

export const FINISHER_CARDS: CardDef[] = [
  // 剣聖: 18/26/36。成功2で予告をすぐに BREAK。完全成功でマナ+2・このターンの物理×1.5
  c('fxHeavenDragon', '秘剣・天翔龍閃', 'physical', 2, 75, 'enemy', [[d(18)], [d(26)], [d(36), { kind: 'forceBreak' }]], { trait: t('剣聖の極み', { when: 'perfect', do: [{ kind: 'gainMana', amount: 2 }, SWORD_PEAK] }) }),
  // 覇王: 敵全員に14/22/32。成功2で敵全員のブロック0・脆弱2。倒した敵1体につき味方全員のフォーカス+1
  c('fxConquerorCrush', '覇王滅砕撃', 'physical', 2, 70, 'allEnemies', [[d(14), { kind: 'rewardKills', focus: 1 }], [d(22), { kind: 'rewardKills', focus: 1 }], [{ kind: 'breakBlock', amount: 999, stealPct: 0 }, d(32), st('vulnerable', 2), { kind: 'rewardKills', focus: 1 }]], { trait: t('覇道の圧', { modifier: 'exhaust' }) }),
  // 拳王: 4×4／4×5／4×6／5×7。この戦闘の物理カード3枚ごとに+1回（最大+3回【提案】）
  c('fxAsuraFist', '無想阿修羅拳', 'physical', 1, 75, 'enemy', [[{ kind: 'asuraFists', amount: 4, hits: 4, per: 3, max: 3 }], [{ kind: 'asuraFists', amount: 4, hits: 5, per: 3, max: 3 }], [{ kind: 'asuraFists', amount: 4, hits: 6, per: 3, max: 3 }], [{ kind: 'asuraFists', amount: 5, hits: 7, per: 3, max: 3 }]], { trait: t('無想', { modifier: 'exhaust' }) }),
  // 大賢者: 敵全員に火・氷・雷・聖で 6/8/10/14 ずつ
  c('fxBigBang', '創世のビッグバン', 'magic', 3, 65, 'allEnemies', [6, 8, 10, 14].map((n) => ['fire', 'ice', 'thunder', 'holy'].map((e) => el(e, n))), { stat: 'int', tags: ['aoe'], trait: t('創世', { modifier: 'exhaust' }) }),
  // 冥王: 15/22/30の闇 ＋（呪い・毒・火傷の合計）×4（最大60【提案】）。その後、悪い状態異常を全部2倍
  c('fxAbyssVerdict', '死の宣告・アビス', 'magic', 2, 75, 'enemy', [15, 22, 30].map((n) => [el('dark', n), { kind: 'abyss', statuses: ['curse', 'poison', 'burn'], per: 4, max: 60 }]), { tags: ['curse'], trait: t('アビス', { modifier: 'exhaust' }) }),
  // 幻獣王: 敵全員に20/28/38。お供・召喚が全部、すぐに2回ずつ攻撃
  c('fxBahamut', '神獣バハムート降臨', 'magic', 2, 75, 'allEnemies', [20, 28, 38].map((n) => [d(n), { kind: 'rallyBeasts', times: 2 }]), { tags: ['aoe', 'pet'], trait: t('降臨', { modifier: 'exhaust' }) }),
  // 聖王: 味方全員にブロック12/18/25。次の自分の番まで、全員のブロックが消えず、悪い状態異常を受けない（Gemini の2回目・敵へのダメージは外した）
  c('fxHolySanctum', '聖王の絶対領域', 'skill', 2, 75, 'self', [12, 18, 25].map((n) => [{ kind: 'block', amount: n, to: 'allies' } as Effect, ...SANCTUM]), { stat: 'vit', tags: ['block'], trait: t('絶対領域', { modifier: 'exhaust' }) }),
  // 弓聖: 15/24/35/48。ブロック無視。このカードの連携の上乗せ×2
  c('fxMeteorArrow', '流星の一矢', 'physical', 2, 75, 'enemy', [[d(15)], [d(24)], [d(35)], [d(48)]], { trait: t('必中貫通', { modifier: 'ignoreBlock' }, [{ modifier: 'comboScale', multiplier: 2 }]) }),
  // ビーストマスター: お供と召喚がすぐに攻撃。成功1で3ターンの間お供・召喚×2・味方全員に応援2
  c('fxBeastRoar', '百獣の王の咆哮', 'skill', 1, 85, 'self', [[{ kind: 'rallyBeasts', times: 1 }], [{ kind: 'rallyBeasts', times: 1 }, BEAST_KING, { kind: 'applyStatus', status: 'inspired', amount: 2, to: 'allies' }]], { tags: ['pet'], trait: t('百獣の王', { modifier: 'exhaust' }) }),
  // 忍者: 分身を2つまで戻し、8/12/16（分身も追撃）。霞（次に受ける攻撃1回を0）
  c('fxYatagarasu', '忍法・八咫烏', 'physical', 1, 80, 'enemy', [[...YATA, d(8)], [...YATA, d(12)], [...YATA, d(16)]], { stat: 'agi', trait: t('八咫烏', { modifier: 'exhaust' }) }),
  // 侍: すぐに居合（次の物理×4）。成功1で、この敵の番の最初の攻撃を無効にして25で返す
  c('fxMumyou', '奥義・無明逆流れ', 'physical', 1, 80, 'self', [[IAI], [IAI, MUMYOU]], { stat: 'per', trait: t('無明', { modifier: 'exhaust' }) }),
  // 魔剣士: 16/24/34。この戦闘で使った属性を全部宿し（その属性の状態異常を1ずつ付ける。オーナーの決定 2026-11-12）、必ず弱点を突く
  c('fxRagnarok', 'ラグナロク・ブレード', 'physical', 2, 75, 'enemy', [[d(16), RAG], [d(24), RAG], [d(34), RAG]], { trait: t('ラグナロク', { modifier: 'weaknessElement' }, [{ modifier: 'alwaysWeak' }]) }),
  // 死霊術師: 屍兵を上限まで。屍兵1体につき敵全員に7/10/14の闇。自分のHPを10回復
  c('fxHundredNight', '百鬼夜行', 'magic', 2, 75, 'allEnemies', [7, 10, 14].map((n) => [{ kind: 'minionNight', per: n }, { kind: 'heal', amount: 10, to: 'self' }]), { tags: ['aoe'], trait: t('百鬼', { modifier: 'exhaust' }) }),
  // 暗黒騎士: 今のHPの半分を払い、減っているHP×1.2/1.5/2.0の闇（最大100）。与えたダメージの50%を吸収
  c('fxBloodEclipse', 'ブラッド・イクリプス', 'physical', 0, 80, 'enemy', [1.2, 1.5, 2.0].map((m) => [{ kind: 'payHp', pct: 50 } as Effect, { kind: 'missingHpScaled', mul: m, max: 100, element: 'dark' }, { kind: 'healPctOfDealt', pct: 50 }]), { stat: 'vit', trait: t('蝕', { modifier: 'exhaust' }) }),
  // 占星術師: 味方全員のフォーカス+2。成功1で、味方それぞれ次に使う1枚だけ完全成功（このターン）
  c('fxGrandCross', '運命のグランドクロス', 'skill', 1, 90, 'self', [[focusAll(2)], [focusAll(2), GRAND_CROSS]], { stat: 'luk', trait: t('星の導き', { modifier: 'exhaust' }) }),
  // 機工士: 砲台と罠を全部すぐに動かした後、敵全員に20/28/38の雷（ブロック無視）と痺れ2
  c('fxOmegaLaser', '最終兵器・オメガレーザー', 'physical', 2, 75, 'allEnemies', [20, 28, 38].map((n) => [{ kind: 'summonStrike', label: '砲台・罠' } as Effect, el('thunder', n), st('paralysis', 2)]), { stat: 'dex', tags: ['aoe'], trait: t('オメガ', { modifier: 'ignoreBlock' }) }),
  // 吟遊詩人: 自分以外の味方（1人の時は自分）にフォーカス+1／マナ+1／次の攻撃×1.5（成功0・1・2で増える【提案】）
  c('fxSymphonia', '英雄たちの交響曲', 'skill', 1, 85, 'self', [[SONG.focus], [SONG.focus, SONG.mana], [SONG.focus, SONG.mana, SONG.boost]], { stat: 'luk', trait: t('交響', { modifier: 'exhaust' }) }),
  // 賭博師: 敵全員に7／17／27。完全成功（成功3）で敵全員に77＋77G
  c('fxAllOrNothing', 'オール・オア・ナッシング', 'physical', 1, 50, 'allEnemies', [[d(7)], [d(17)], [d(27)], [d(77), { kind: 'gainGold', amount: 77 }]], { stat: 'luk', tags: ['aoe'], trait: t('777', { modifier: 'exhaust' }) }),

  // ===== 区切りF: 新ジョブ4職の決め技 =====
  // 拳聖: ブロック10/14/18。次の敵の番の間、《後の先》が2倍・上限なし
  c('fxMirrorHeart', '明鏡止水', 'skill', 1, 85, 'self', [10, 14, 18].map((n) => [{ kind: 'block', amount: n } as Effect, MIRROR]), { stat: 'vit', tags: ['block'], trait: t('明鏡止水', { modifier: 'exhaust' }) }),
  // 重装衛士: 今のブロックの100/150/200%（最大60・ブロックは減らない）。完全成功で予告を BREAK
  c('fxFortressBreaker', '城塞崩し', 'physical', 2, 75, 'enemy', [[{ kind: 'blockDamage', pct: 100, max: 60 }], [{ kind: 'blockDamage', pct: 150, max: 60 }], [{ kind: 'blockDamage', pct: 200, max: 60 }, { kind: 'forceBreak' }]], { stat: 'vit', tags: ['block'], trait: t('城塞崩し', { modifier: 'exhaust' }) }),
  // 竜脈術師: 敵全員に10/14/20。悪い状態異常1種類につき+6（状態異常は消えない）
  c('fxVeinRelease', '竜脈解放', 'magic', 2, 75, 'allEnemies', [10, 14, 20].map((n) => [{ kind: 'statusKindsDamage', amount: n, per: 6 } as Effect]), { stat: 'int', tags: ['aoe'], trait: t('竜脈解放', { modifier: 'exhaust' }) }),
  // 調教師: お供の能力を3回（上限に数えない）。成功1で味方全員にブロック8、成功2でさらに応援2
  c('fxBondRampage', '相棒とのキズナ大暴走', 'skill', 1, 85, 'self', [[RAMPAGE], [RAMPAGE, { kind: 'block', amount: 8, to: 'allies' }], [RAMPAGE, { kind: 'block', amount: 8, to: 'allies' }, { kind: 'applyStatus', status: 'inspired', amount: 2, to: 'allies' }]], { stat: 'luk', tags: ['pet'], trait: t('キズナ', { modifier: 'exhaust' }) }),
];
