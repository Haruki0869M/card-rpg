// 災厄の中ボス5体の本体（5体目の業火の魔人は段階7c）（段階7b・overhaul-plan-v2 §3-2）。取り巻きは今ある敵をそのまま使う（scourges/*.ts の minions）。
// 絵は今ある敵の絵を使い回す（variantOf。オーナーの決定 5-A。後から絵だけ差し替えられる）。足元のオーラの色で見分ける。
// 戦い方は4体とも別々（憲章4・docs/tasks/enemy-behaviors-plan.md §2 の決まり）: 特殊な行動は1体に2種類まで。全部「大技の予告」と予告の文（hint）で見え、
// BREAK・倒す順・守り・回復の前倒しのどれかで受けられる。味方の番を止める行動（凍結など）は使わない。
// 強さは計画の目安「その時に挑める鍵のダンジョンのボスと同じくらい」（基準 Lv7。出る時に、その地域の敵のレベル+2 になる）。数字は【提案】
import type { EnemyDef } from '../../../../types';

/** 強欲の盗賊王（元の絵: 野盗の頭目）: 手下を呼び、金貨の嵐で全員を少しずつ削る。「頭目を先に倒すか、手下から片付けるか」 */
export const scourgeGreedKing: EnemyDef = {
  id: 'scourgeGreedKing',
  name: '強欲の盗賊王',
  icon: '💀',
  variantOf: 'banditChief',
  aura: 'blood',
  maxHp: 160,
  baseLevel: 7,
  size: 1.35,
  exp: 90,
  gold: 60,
  weak: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'call', name: '手下を呼ぶ', big: true, hint: '手下を1体呼ぶ。その前に倒すか、BREAK する', effects: [{ kind: 'summonEnemy', enemy: 'banditThug', uses: 2, call: true, orElse: 'cleave' }] },
    { id: 'cleave', name: '黄金の大斧', effects: [{ kind: 'damage', amount: 16 }] },
    { id: 'storm', name: '金貨の嵐', big: true, hint: '味方全員に小さなダメージを3回。ブロックで受けるか、BREAK する', effects: [{ kind: 'damage', amount: 4, hits: 3, to: 'foes' }] },
    { id: 'taunt', name: 'あざ笑う', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'damage', amount: 7 }] },
  ],
  abilities: [{ name: '王の貫禄', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 10 }] } }],
};

/** 瘴気を紡ぐ死霊術師（元の絵: 呪われた神官）: 毒の霧をまき、自分の状態異常は脱ぎ捨てる。「起爆を1ターン早める」 */
export const scourgeMiasmaNecro: EnemyDef = {
  id: 'scourgeMiasmaNecro',
  name: '瘴気を紡ぐ死霊術師',
  icon: '💀',
  variantOf: 'cursedPriest',
  aura: 'venom',
  maxHp: 150,
  baseLevel: 7,
  size: 1.3,
  exp: 90,
  gold: 60,
  weak: ['holy', 'fire'],
  resist: ['dark', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'miasma', name: '瘴気の霧', effects: [{ kind: 'applyStatus', status: 'poison', amount: 3, to: 'foes' }] },
    { id: 'bolt', name: '呪いの魔弾', effects: [{ kind: 'damage', amount: 14, element: 'dark' }] },
    { id: 'shed', name: '屍の脱皮', big: true, hint: '状態異常を全部消して回復する。その前に起爆するか、BREAK する', effects: [{ kind: 'purify', amount: 8 }] },
    { id: 'seal', name: '癒し封じの瘴気', big: true, hint: '味方全員の回復が、2ターン半分になる。BREAK するか、先に回復を使う', effects: [{ kind: 'applyStatus', status: 'healSeal', amount: 2, to: 'foes' }] },
  ],
};

/** 悪夢の魔獣（元の絵: 大熊）: 弱った味方を狙い、カードを使いすぎた味方に噛みつく。「HPを削ったままでいるか・何枚で止めるか」 */
export const scourgeNightmareBeast: EnemyDef = {
  id: 'scourgeNightmareBeast',
  name: '悪夢の魔獣',
  icon: '💀',
  variantOf: 'greatBear',
  aura: 'shadow',
  maxHp: 170,
  baseLevel: 7,
  size: 1.35,
  exp: 90,
  gold: 60,
  weak: ['holy'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'howl', name: '悪夢の咆哮', effects: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }, { kind: 'damage', amount: 5, to: 'foes' }] },
    { id: 'hunt', name: '手負い狙い', big: true, hint: 'HPの割合がいちばん低い味方を狙う。HPが半分以下だと×1.5', effects: [{ kind: 'damage', amount: 15, element: 'dark', lowHpMul: 1.5 }] },
    { id: 'claws', name: '影の連撃', effects: [{ kind: 'damage', amount: 6, hits: 3 }] },
    { id: 'watch', name: '眠りを見張る', big: true, hint: 'このターンにカードを4枚以上使った味方に、枚数×2のダメージ', effects: [{ kind: 'punishPlays', amount: 2, min: 4 }] },
  ],
};

/** 氷嵐の魔女（元の絵: 雪の魔女）: ためたブロックを氷の槍で砕き、吹雪で全員を凍えさせる。「ブロックの使い時」 */
export const scourgeStormWitch: EnemyDef = {
  id: 'scourgeStormWitch',
  name: '氷嵐の魔女',
  icon: '💀',
  variantOf: 'snowWitch',
  aura: 'frost',
  maxHp: 150,
  baseLevel: 7,
  size: 1.3,
  exp: 90,
  gold: 60,
  weak: ['fire'],
  resist: ['ice'],
  pattern: 'sequence',
  actions: [
    { id: 'frost', name: '凍てつく息', effects: [{ kind: 'damage', amount: 6, element: 'ice' }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
    { id: 'lance', name: '氷槍・盾砕き', big: true, hint: '当たるとブロックを全部壊す。BREAK するか、ブロックに頼らずに受ける', effects: [{ kind: 'shieldBreak' }, { kind: 'damage', amount: 14, element: 'ice' }] },
    { id: 'mirror', name: '氷の鏡', effects: [{ kind: 'block', amount: 14 }, { kind: 'block', amount: 8, to: 'otherAllies' }] },
    { id: 'blizzard', name: '吹雪', big: true, hint: '味方全員に氷のダメージ。ブロックで受けるか、BREAK する', effects: [{ kind: 'damage', amount: 8, element: 'ice', to: 'foes' }] },
  ],
};

/**
 * 業火の魔人（段階7c。元の絵: 溶岩ゴーレム）: 味方全員に火傷を重ねて、まとめて起爆する。「火傷を治す・起爆の前に BREAK する・ブロックをためておく」。
 * 取り巻きの火トカゲも火傷を付けるので、放っておくと起爆が大きくなる。数字は【提案】（ほかの4体と同じ基準 Lv7・HP160）
 */
export const scourgeInfernoDemon: EnemyDef = {
  id: 'scourgeInfernoDemon',
  name: '業火の魔人',
  icon: '💀',
  variantOf: 'magmaGolem',
  aura: 'ember',
  maxHp: 160,
  baseLevel: 7,
  size: 1.35,
  exp: 90,
  gold: 60,
  weak: ['ice'],
  resist: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'brand', name: '業火の烙印', effects: [{ kind: 'applyStatus', status: 'burn', amount: 2, to: 'foes' }] },
    { id: 'eruption', name: '噴火', big: true, hint: '味方全員に火のダメージと「火傷」2。ブロックで受けるか、BREAK する', effects: [{ kind: 'damage', amount: 6, element: 'fire', to: 'foes' }, { kind: 'applyStatus', status: 'burn', amount: 2, to: 'foes' }] },
    { id: 'fist', name: '灼熱の拳', effects: [{ kind: 'damage', amount: 14, element: 'fire' }] },
    { id: 'inferno', name: '業火の炸裂', big: true, hint: '味方全員の「火傷」を起爆して消す（1つにつき4ダメージ・1人24まで）。先に火傷を治すか、BREAK する', effects: [{ kind: 'detonateStatus', status: 'burn', damagePer: 4, maxDamage: 24, to: 'foes' }] },
  ],
};
