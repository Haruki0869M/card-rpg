// 賢いマルチプレイ検証 bot: 頭の自己テスト（区切り 2-Sa。ゲームもブラウザも要らない。selftest.mjs から呼ぶ）
// 小さな作り物の説明書きと View で、決まりどおりに選ぶか・同じ View なら同じ答えか（乱数を使わない）を確かめる。
import { fillContent, KB } from '../content/load.mjs';
import { claimChoice } from '../content/reward.mjs';
import { battleBrain } from './battle.mjs';
import { dungeonBrain } from './dungeon.mjs';
import { rewardBrain } from './reward.mjs';

const view = (mode, facts, o = {}) => ({ seat: 'P1', screen: 'game', mode, layers: [], actions: [], facts, ...o });

export function brainChecks(check) {
  if (!KB.ready)
    fillContent({
      cards: [
        { id: 'strike', name: 'ストライク', category: 'physical', cost: 1, slots: 1, baseChance: 80, target: 'enemy', tiers: [{ minSuccesses: 0, effects: [{ kind: 'damage', amount: 4 }] }, { minSuccesses: 1, effects: [{ kind: 'damage', amount: 7 }] }] },
        { id: 'fireBolt', name: '火の矢', category: 'magic', cost: 1, slots: 2, baseChance: 70, target: 'enemy', tiers: [{ minSuccesses: 0, effects: [{ kind: 'damage', amount: 3, element: 'fire' }] }, { minSuccesses: 2, effects: [{ kind: 'damage', amount: 8, element: 'fire' }] }] },
        { id: 'mend', name: '癒し', category: 'magic', cost: 1, slots: 1, baseChance: 80, target: 'ally', tiers: [{ minSuccesses: 0, effects: [{ kind: 'heal', amount: 6 }] }] },
        { id: 'guard', name: 'ガード', category: 'skill', cost: 1, slots: 1, baseChance: 90, target: 'self', tiers: [{ minSuccesses: 0, effects: [{ kind: 'block', amount: 5 }] }] },
      ],
      classes: [{ id: 'warrior', name: '剣士', weaponType: 'sword', subWeapons: ['katana'], stats: { str: 5, int: 1, dex: 2 }, deck: [{ cardId: 'strike', count: 4 }] }],
      items: [
        { id: 'swordA', name: '良い剣', slot: 'weapon', weaponType: 'sword', rarity: 'rare', stats: { str: 2 } },
        { id: 'katanaA', name: '刀', slot: 'weapon', weaponType: 'katana', rarity: 'rare', stats: { str: 2 } },
        { id: 'bowA', name: '弓', slot: 'weapon', weaponType: 'bow', rarity: 'epic', stats: { dex: 3 } },
      ],
      elements: [{ id: 'fire', name: '火' }],
      statLabel: { str: '力', int: '知力', dex: '器用' },
    });
  const job = KB.classes.warrior;
  // ---- 取り合い ----
  check(claimChoice('swordA', job, {}).choice === 'need' && claimChoice('katanaA', job, {}).choice === 'greed' && claimChoice('bowA', job, {}).choice === 'pass', '頭: 取り合いは ◎ で良い →欲しい・○ →余れば・使えない →いらない', JSON.stringify(['swordA', 'katanaA', 'bowA'].map((i) => claimChoice(i, job, {}))));
  // ---- 戦闘: 弱点のカードで BREAK を狙う・同じ View なら同じ答え ----
  const enemy = (uid, o = {}) => ({ 'data-enemy': uid, 'data-dead': null, 'data-hp': '30', info: 'Lv2 ゴブリン', hpText: 'Lv2 ゴブリン 30/30', marks: [], atk: ['6'], targets: [], ...o });
  const bv = view('battle', {
    bEnemies: [enemy('e1'), enemy('e2', { marks: ['火に弱い'], breakRule: 'any', big: 1 })],
    bAllies: [{ 'data-ally': 'h0', 'data-dead': null, 'data-done': null, text: 'アル 30/30 3 2 3枚', incoming: '6', name: 'アル' }],
    bHand: [{ 'data-card-index': '0', 'data-card-id': 'strike', 'data-usable': '' }, { 'data-card-index': '1', 'data-card-id': 'fireBolt', 'data-usable': '' }],
    bEndTurn: [{ 'data-end-turn': 'ready' }],
  });
  const d1 = battleBrain(structuredClone(bv), {});
  const d2 = battleBrain(structuredClone(bv), {});
  check(d1?.target.css === '[data-card-index="1"][data-usable]' && /BREAK/.test(d1.what) && JSON.stringify(d1) === JSON.stringify(d2), '頭: 戦闘は弱点のカードで BREAK を狙う（同じ View なら同じ答え）', JSON.stringify(d1));
  // 的のチップ: BREAK! のチップを選ぶ
  const pv = view('battle', { ...bv.facts, bPanel: '火の矢 成功率 70% × 2枠 発動 敵をタップ 残りフォーカス 2 / 2', bGoText: '発動 敵をタップ', bChips: [{ 'data-target-chip': 'e1', 'data-chip-selected': null, 'data-break-chip': null, 'data-kill-badge': null, 'data-weak-chip': null, 'data-resist-chip': null, 'data-miss-chip': null }, { 'data-target-chip': 'e2', 'data-chip-selected': null, 'data-break-chip': 'now', 'data-kill-badge': null, 'data-weak-chip': 'fire', 'data-resist-chip': null, 'data-miss-chip': null }] });
  const d3 = battleBrain(pv, {});
  check(d3?.target.css === '[data-target-chip="e2"]', '頭: 的は BREAK! のチップの敵', JSON.stringify(d3));
  // 回復: HP の低い味方がいれば回復のカード
  const hv = view('battle', { ...bv.facts, bAllies: [...bv.facts.bAllies.map((a) => ({ ...a, text: 'アル 8/30 3 2 3枚', incoming: '0' }))], bHand: [{ 'data-card-index': '0', 'data-card-id': 'strike', 'data-usable': '' }, { 'data-card-index': '1', 'data-card-id': 'mend', 'data-usable': '' }], bEnemies: [enemy('e1')] });
  const d4 = battleBrain(hv, {});
  check(/回復/.test(d4?.what ?? '') && d4.target.css === '[data-card-index="1"][data-usable]', '頭: HP が3割ほどなら回復のカード', JSON.stringify(d4));
  // ---- 扉: HP が低ければ休憩・ほかの人の票にそろえる ----
  const door = (id, omen, o = {}) => ({ 'data-door-choice': id, 'data-door-omen': omen, 'data-my-vote': null, disabled: null, 'data-door-sealed': null, votes: null, ...o });
  const party = (r) => [{ 'aria-label': `アル HP${Math.round(30 * r)}/30` }];
  const dv = view('dungeon', { dDoors: [door('r1', 'danger'), door('r2', 'rest')], dParty: party(0.4) });
  check(dungeonBrain(dv, {})?.target.css === '[data-door-choice="r2"]', '頭: 扉は HP が低ければ休憩', JSON.stringify(dungeonBrain(dv, {})));
  const dv2 = view('dungeon', { dDoors: [door('r1', 'danger', { votes: 'P2' }), door('r2', 'rest')], dParty: party(0.4) });
  check(dungeonBrain(dv2, {})?.target.css === '[data-door-choice="r1"]', '頭: 扉はほかの人の票にそろえる（全員一致で開く）', JSON.stringify(dungeonBrain(dv2, {})));
  const dv3 = view('dungeon', { dDoors: [door('r1', 'danger'), door('r2', 'treasure')], dParty: party(1) });
  const b3 = { dungeon: { seen: { treasure: 1 }, lastKind: null, events: {}, chests: 0, restKinds: {}, doorsChosen: 1 } };
  check(dungeonBrain(dv3, b3)?.target.css === '[data-door-choice="r1"]', '頭: 扉はまだ入っていない種類を先に', JSON.stringify(dungeonBrain(dv3, b3)));
  // ---- 宝箱: 画面の成功率で選ぶ・「おすすめ」と違えば注意 ----
  const board = {};
  const cv = view('chest', { openers: [{ 'data-opener': 'h0', text: 'P1 アル おすすめ 鍵が開く 40%（フォーカス2で60%） 器用3・運2・フォーカス2', votes: null }, { 'data-opener': 'h1', text: 'P2 ベル 鍵が開く 45%（フォーカス3で80%） 器用5・運2・フォーカス3', votes: null }] });
  const d5 = dungeonBrain(cv, board);
  check(d5?.target.css === '[data-opener="h1"] button' && (board.notes ?? []).some((n) => /おすすめ/.test(n.text)), '頭: 開け役は画面の成功率の字で選び、「おすすめ」と違えば注意に書く（直し11）', JSON.stringify({ d5, notes: board.notes }));
  // ---- 報酬: 成長は主に使う能力値 ----
  const rv = view('reward', { rLevelUp: 1, rGrowth: [{ text: '最大HP +5 最大HPが増える' }, { text: '知力 +1 魔法の成功率' }, { text: '力 +1 物理の成功率' }] });
  const d6 = rewardBrain(rv, { me: { P1: { job, picks: {}, gear: {}, name: null, claims: {} } } });
  check(d6?.target.nth === 2, '頭: 成長は主に使う能力値（剣士 = 力）', JSON.stringify(d6));
}
