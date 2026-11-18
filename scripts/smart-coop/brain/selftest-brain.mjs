// 賢いマルチプレイ検証 bot: 頭の自己テスト（区切り 2-Sa。ゲームもブラウザも要らない。selftest.mjs から呼ぶ）
// 小さな作り物の説明書きと View で、決まりどおりに選ぶか・同じ View なら同じ答えか（乱数を使わない）を確かめる。
import { fillContent, KB } from '../content/load.mjs';
import { claimChoice } from '../content/reward.mjs';
import { battleBrain } from './battle.mjs';
import { dungeonBrain } from './dungeon.mjs';
import { rewardBrain } from './reward.mjs';
import { hexNeighbors, costMap, distFrom, worldBrain, TIDE_WAIT } from './world.mjs';

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
    bAllies: [{ 'data-ally': 'h0', 'data-dead': null, 'data-done': null, text: 'アル 30/30 3 2 3枚 弱体2', incoming: '6', name: 'アル', count: '3枚' }],
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
  const hv = view('battle', { ...bv.facts, bAllies: [...bv.facts.bAllies.map((a) => ({ ...a, text: 'アル 8/30 3 2 3枚', incoming: '0', count: '3枚' }))], bHand: [{ 'data-card-index': '0', 'data-card-id': 'strike', 'data-usable': '' }, { 'data-card-index': '1', 'data-card-id': 'mend', 'data-usable': '' }], bEnemies: [enemy('e1')] });
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
  // 区切り5: 「順番が来たら、次の扉を選べます」の間は扉を押さない（押しても票にならず、世界マップで手番の仲間が押せなくなる）
  const dvw = view('dungeon', { dDoors: [door('r1', 'danger')], dParty: party(1), dWait: 'P3 アキさんのエルドの番です 順番が来たら、次の扉を選べます' });
  check(dungeonBrain(dvw, { dungeon: { seen: {}, lastKind: null, events: {}, chests: 0, restKinds: {}, doorsChosen: 0 } }) === null, '頭: 世界マップの仲間の番の間は、扉を押さない（区切り4の4人6回目の止まり）', '');
  // ---- 宝箱: 画面の成功率で選ぶ・「おすすめ」と違えば注意 ----
  const board = {};
  const cv = view('chest', { openers: [{ 'data-opener': 'h0', text: 'P1 アル おすすめ 鍵が開く 40%（フォーカス2で60%） 器用3・運2・フォーカス2', votes: null }, { 'data-opener': 'h1', text: 'P2 ベル 鍵が開く 45%（フォーカス3で80%） 器用5・運2・フォーカス3', votes: null }] });
  const d5 = dungeonBrain(cv, board);
  check(d5?.target.css === '[data-opener="h1"] button' && (board.notes ?? []).some((n) => /おすすめ/.test(n.text)), '頭: 開け役は画面の成功率の字で選び、「おすすめ」と違えば注意に書く（直し11）', JSON.stringify({ d5, notes: board.notes }));
  // ---- 報酬: 成長は主に使う能力値 ----
  const rv = view('reward', { rLevelUp: 1, rGrowth: [{ text: '最大HP +5 最大HPが増える' }, { text: '知力 +1 魔法の成功率' }, { text: '力 +1 物理の成功率' }] });
  const d6 = rewardBrain(rv, { me: { P1: { job, picks: {}, gear: {}, name: null, claims: {} } } });
  check(d6?.target.css === '[data-growth-option="2"]', '頭: 成長は主に使う能力値（剣士 = 力）。押すのは B11 の印', JSON.stringify(d6));
  // ---- 世界マップ（区切り 2-Sb）: 六角形の隣・通れない地形を回り込む道のり・潮・行き先へ近づくマス ----
  const terr = { plains: { moveCost: 1 }, crag: { moveCost: 0 }, forest: { moveCost: 2 }, tideFlat: { moveCost: 0, tide: 'low' } };
  check(JSON.stringify(hexNeighbors(5, 5, 6).sort((a, b) => a - b)) === JSON.stringify([1, 2, 5, 7, 11, 12]) && JSON.stringify(hexNeighbors(5, 5, 12).sort((a, b) => a - b)) === JSON.stringify([6, 7, 11, 13, 16, 17]), '頭: 六角形の隣（odd-r。奇数行は右に半マス）', JSON.stringify([hexNeighbors(5, 5, 6), hexNeighbors(5, 5, 12)]));
  // 5×5 の地図。真ん中の列（2）に険しい山の壁（行0〜3）。左下（20）から右下（24）へは、壁の下（22）を通る
  const hexes = [];
  for (let i = 0; i < 25; i++) hexes.push({ 'data-hex': String(i), 'data-terrain': i % 5 === 2 && i < 20 ? 'crag' : 'plains', 'data-tide': null });
  const cm = costMap(5, 5, hexes, null, terr);
  const dist = distFrom(5, 5, cm.cost, 4, null);
  check(Number.isFinite(dist[0]) && dist[0] >= 8 && cm.cost[2] === 0, '頭: 道のりは通れない地形（移動力0）を回り込む', JSON.stringify({ d0: dist[0], c2: cm.cost[2] }));
  const tideHexes = hexes.map((h) => (h['data-hex'] === '22' ? { ...h, 'data-terrain': 'tideFlat', 'data-tide': 'low' } : h));
  const shut = distFrom(5, 5, costMap(5, 5, tideHexes, 'high', terr).cost, 4, null);
  const open = distFrom(5, 5, costMap(5, 5, tideHexes, 'low', terr).cost, 4, null);
  // 区切り5: 閉じた潮のマスは「待つ分」の見積もり（TIDE_WAIT）で道に入れる（潮は時間で必ず変わる。前は通れない扱いで、行き先を「行けない」と決めていた）
  const shutCm = costMap(5, 5, tideHexes, 'high', terr);
  check(Number.isFinite(shut[0]) && Number.isFinite(open[0]) && shut[0] > open[0] && shutCm.tideShut[22] && shutCm.cost[22] === TIDE_WAIT, '頭: 潮のマスは、開いている時は1・閉じている時は待つ分の見積もり（道は潮のマスの手前まで）', JSON.stringify({ shut: shut[0], open: open[0] }));
  // 区切り5（シナリオ3）: 海は船がある時だけ通れる・船の要る潮の水道は船が無ければ通れない
  const terr3 = { ...terr, sea: { moveCost: 0, sea: true, shipCost: 1 }, tideChannel: { moveCost: 0, tide: 'high', tideShip: true, shipCost: 1 } };
  const seaHexes = hexes.map((h) => (h['data-hex'] === '22' ? { ...h, 'data-terrain': 'sea' } : h['data-hex'] === '17' ? { ...h, 'data-terrain': 'tideChannel', 'data-tide': 'high' } : h));
  const noShip = costMap(5, 5, seaHexes, 'high', terr3, false);
  const withShip = costMap(5, 5, seaHexes, 'high', terr3, true);
  check(noShip.cost[22] === 0 && noShip.cost[17] === 0 && withShip.cost[22] === 1 && withShip.cost[17] === 1, '頭: 海と潮の水道は、船がある時だけ通れる（船は依頼の字か光るマスで知る）', JSON.stringify({ n: [noShip.cost[22], noShip.cost[17]], s: [withShip.cost[22], withShip.cost[17]] }));
  // 行けるマスのうち、行き先に近づくマスを押す（自分の手番の時だけ）
  KB.world = { terrains: terr, width: 5, height: 5, dungeons: [], towns: [], quests: [], events: [], shrines: [], sanctuaries: [], scourges: [], classes: [], special: {}, towers: 0, scenarioName: '作り物', scenarioId: 'test' };
  const wv = view('world', { wMap: [{ 'data-cols': '5', 'data-rows': '5' }], wHexes: hexes, activeHero: [{ 'data-hero': 'h0', 'data-seat': 'P1', 'data-tile': '20' }], goalMark: [{ 'data-goal-mark': '24' }], reach: [{ 'data-reach': '15', 'data-cost': '1' }, { 'data-reach': '21', 'data-cost': '1' }], wFeatures: [], wSpawns: [], wWanderers: [], wParty: [] });
  const w1 = worldBrain(structuredClone(wv), {});
  const w2 = worldBrain(structuredClone(wv), {});
  check(w1?.target.css === '[data-reach="21"]' && JSON.stringify(w1) === JSON.stringify(w2), '頭: 世界マップは行き先に近づく行けるマスを押す（同じ View なら同じ答え）', JSON.stringify(w1));
  check(worldBrain(structuredClone({ ...wv, seat: 'P2' }), {}) === null, '頭: 世界マップは自分の手番でなければ押さない', '');
  // 区切り5: 行き先へ一番近づく隣のマスが閉じた潮のマスなら、サイコロを振らずに野営して潮を待つ（網羅の行「潮を待った」）
  {
    // 4 = 右上の行き先。壁（列2）の切れ目は 22 だけ（潮の干潟・今は閉じている）。21 に立って、サイコロも野営も押せる
    const tv = view('world', { wMap: [{ 'data-cols': '5', 'data-rows': '5' }], wHexes: tideHexes, wTide: [{ 'data-tide-icon': 'high', 'aria-label': '🌊 満ち潮（あと3ターンで引き潮）' }], activeHero: [{ 'data-hero': 'h0', 'data-seat': 'P1', 'data-tile': '21' }], goalMark: [{ 'data-goal-mark': '24' }], reach: [], wFeatures: [], wSpawns: [], wWanderers: [], wParty: [] }, {
      actions: [{ enabled: true, text: 'サイコロ', marks: ['data-roll-move'] }, { enabled: true, text: '野営', marks: ['data-camp'] }, { enabled: true, text: '待機', marks: ['data-world-wait=wait'] }],
    });
    const tb = {};
    const t1 = worldBrain(structuredClone(tv), tb);
    t1?.after?.();
    check(t1?.target.css === '[data-camp]' && (tb.covMarks ?? []).some((m) => m.id === 'tide-wait'), '頭: 隣の潮のマスが閉じていれば、サイコロを振らずに野営して潮を待つ', JSON.stringify(t1));
    const ov = structuredClone(tv);
    ov.facts.wTide = [{ 'data-tide-icon': 'low', 'aria-label': '🐚 引き潮' }];
    check(worldBrain(ov, {})?.target.css === '[data-roll-move]', '頭: 潮が開いていれば、ふつうにサイコロを振る', '');
  }
  KB.world = null;
}
