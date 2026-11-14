// ===== 災厄の中ボス（段階7b・overhaul-plan-v2 §3）=====
// 広い地図（帯のある地図）だけに、1冒険に最大3体。節目（1つ目の鍵を取った時 か 侵食度15%・35%・55%）を越えたワールドターンの終わりに1体ずつ出る。
// 災厄は「徘徊する敵」（Wanderer）に scourge: ID を付けた物。動かない。生きている間、悪さ（店の値段・侵食度・野営の回復・夜の敵のレベル）を世界に与え、
// 倒すと悪さが消え、専用の装備を必ず落とす。逃げても負けても残る。
// 乱数は冒険の Rng だけ（ワールドターンの終わりの処理の中で引く）。画面を描くだけの関数（scourgeCurse・scourgeList など）は乱数を引かない
import { BALANCE } from '../../../data/balance';
import { getItem } from '../../../data/items';
import { getDifficulty } from '../../../data/rules';
import { corruptionName, getScenario } from '../../../data/scenarios';
import { SCOURGES, TERRAINS } from '../../../data/world';
import type { GameState, Hero, ItemInstance, RewardState, ScourgeDef, Wanderer, WorldState } from '../../../types';
import type { Rng } from '../../rng';
import { addItem, addLog, leastLoaded, splitGold } from '../common';
import { jobWeapons } from '../hero';
import { livingHeroes, mapHeroes } from '../heroes';
import { newItem } from '../loot';
import { hexDistance, neighbors } from './hex';
import { isWideMap, laneOfTile } from './lanes';
import { corruptionLevelBonus } from './wanderers';
import { aliveScourges } from './scourgeCurse';
import { describeAbility } from '../../abilities';
import { bumpStoryVer, placeName, queueStory } from './guide';
import { scourgeFits } from './detour';

export { aliveScourges, scourgeCurse, scourgePrice, scourgesWith, type ScourgeCurse } from './scourgeCurse';

/** 今までに越えた節目の数（1つ目の鍵を取った・侵食度15%を越えた / 35% / 55%）。最大 BALANCE.scourge.max */
export function scourgesDue(w: WorldState): number {
  const s = BALANCE.scourge;
  let n = w.keys.length >= 1 || w.corruption > s.firstCorruption ? 1 : 0;
  for (const at of s.milestones) if (w.corruption >= at) n++;
  return Math.min(s.max, n);
}

/** 新しい冒険の地図を作った時（広い地図だけ）: まだ1体も出ていない */
export function initScourges(game: GameState, w: WorldState) {
  if (!isWideMap(game, w) || !SCOURGES.all.length) return;
  w.scourgeCount = 0;
  w.scourgesMet = [];
}

/**
 * ワールドターンの終わり（侵食度を足した後）: 越えた節目の分だけ、1ターンに1体ずつ出す。置けるマスが無ければ次のターンにもう一度。
 * 古い保存（scourgeCount が無い）: 地図は作り直さない。もう越えた節目の分は出さず、これから越える節目では出る
 */
export function tickScourges(game: GameState, w: WorldState, rng: Rng) {
  if (!isWideMap(game, w) || !SCOURGES.all.length) return;
  if (w.scourgeCount === undefined) {
    w.scourgeCount = scourgesDue(w);
    w.scourgesMet ??= [];
    return;
  }
  if (w.scourgeCount >= scourgesDue(w)) return;
  if (spawnScourge(game, w, rng)) w.scourgeCount += 1;
}

/** 災厄を置けるマス: 西か東の帯・陸の空きマス・街道から roadDistance マス以上・世界マップの一番近いキャラから heroDistance の範囲・歩いて行ける */
export function scourgeCandidates(game: GameState, w: WorldState): number[] {
  const s = BALANCE.scourge;
  const road = getScenario(game.scenarioId).map?.roadTerrain;
  const onMap = mapHeroes(game).map((h) => w.pos[h.id]).filter((i): i is number => i !== undefined);
  // 全員がダンジョンの中なら、その入口から測る
  const heroes = onMap.length ? onMap : livingHeroes(game).map((h) => w.pos[h.id]).filter((i): i is number => i !== undefined);
  if (!heroes.length) return [];
  const land = (i: number) => {
    const t = TERRAINS.get(w.tiles[i].t);
    return t.moveCost > 0 && !t.sea;
  };
  // 歩いて行けるマス（キャラの位置から）
  const reach = new Set(heroes);
  const q = [...heroes];
  for (let k = 0; k < q.length; k++) for (const n of neighbors(w, q[k])) if (!reach.has(n) && land(n)) (reach.add(n), q.push(n));
  const roads = w.tiles.flatMap((t, i) => (t.t === road || t.f?.kind === 'town' ? [i] : []));
  const busy = new Set<number>([...Object.values(w.pos), ...Object.values(w.downed ?? {}), ...w.wanderers.map((x) => x.tile), ...(w.spawns ?? []).map((x) => x.tile)]);
  const [lo, hi] = s.heroDistance;
  const out: number[] = [];
  for (const i of reach) {
    if (w.tiles[i].f || busy.has(i) || !land(i)) continue;
    const lane = laneOfTile(game, w, i);
    if (lane !== 'west' && lane !== 'east') continue;
    if (roads.some((r) => hexDistance(w, r, i) < s.roadDistance)) continue;
    const d = Math.min(...heroes.map((h) => hexDistance(w, h, i)));
    if (d < lo || d > hi) continue;
    out.push(i);
  }
  return out.sort((a, b) => a - b);
}

/** 災厄の敵の並び（本体＋取り巻き。4人の冒険は取り巻きが1体多い）と、レベル（その地域の敵+2。夜の加算は入れない） */
export function scourgeEnemies(game: GameState, w: WorldState, def: ScourgeDef, tile: number): Wanderer['enemies'] {
  const reg = getScenario(game.scenarioId).map!.regions[w.tiles[tile].r];
  const level = Math.max(1, reg.enemyLevel + getDifficulty(game.difficulty).enemyLevel + corruptionLevelBonus(game, w) + BALANCE.scourge.levelBonus);
  const n = game.heroes.length >= 4 ? BALANCE.scourge.minions4p : BALANCE.scourge.minions;
  return [def.boss, ...def.minions.slice(0, n)].map((defId) => ({ defId, level }));
}

/** 災厄を1体置く（まだ出ていない種類から乱数で選ぶ）。置けたら返す */
export function spawnScourge(game: GameState, w: WorldState, rng: Rng): Wanderer | undefined {
  const met = w.scourgesMet ?? [];
  // 寄り道の値打ち（2026-11-14 柱3 の2）: 専用の装備をだれも使えない種類（黄金冠・冥獄鎌など）は、使えるキャラがいる時だけ候補に入れる（乱数は今のまま冒険の Rng）
  const party = game.heroes.filter((h) => !h.retired);
  const kinds = SCOURGES.all.filter((d) => !met.includes(d.id) && scourgeFits(party, d));
  if (!kinds.length) return undefined;
  const cands = scourgeCandidates(game, w);
  if (!cands.length) return undefined;
  const def = kinds[rng.int(kinds.length)];
  const tile = cands[rng.int(cands.length)];
  const wd: Wanderer = { id: `w${w.nextWandererId++}`, tile, enemies: scourgeEnemies(game, w, def, tile), scourge: def.id };
  w.wanderers.push(wd);
  w.scourgesMet = [...met, def.id];
  // 見晴らしの塔の見張り: 登った塔から towerReveal マス以内なら、場所も見える
  const watched = w.tiles.some((t, i) => t.f?.kind === 'tower' && t.f.used && hexDistance(w, i, tile) <= BALANCE.scourge.towerReveal);
  if (watched) w.tiles[tile].seen = true;
  const seen = w.tiles[tile].seen;
  const lines = [
    def.appearText,
    `${def.curseText}。`,
    seen ? (watched ? '塔の見張りが場所を知らせてくれた（地図の💀）。' : '場所は地図の💀の所。') : 'くわしい場所は、見晴らしの塔に登ると分かる。',
    // 倒すと手に入る専用の装備の効果（2026-11-13。長いので最後に置く）
    `倒すと元に戻り、専用の装備「${getItem(def.gear).name}」を落とす（${scourgeGearText(def).replace(/。$/, '')}）。`,
    // 寄り道の値打ち（2026-11-14 柱1）: 生きている間、鍵と最後のダンジョンのボス・中ボスに掛かる加護
    `💀加護: ボス・中ボスとの戦闘に「${def.boon.name}」（${def.boon.text.replace(/。$/, '')}）。`,
  ];
  // 回1: 制覇の物語などの後ろに足さず、その窓を閉じた後に別の窓で出す。地域（「嘆きの沼の東」）までは最初から分かる
  queueStory(w, { title: `💀 ${def.name}が、${placeName(game, w, tile)}に現れた！`, lines });
  addLog(game, `💀 ${def.name}が現れた！（${def.curseText}）`);
  return wd;
}

/** 物語の窓に出す（もう出ている時は、後ろに足す） */
function pushStory(w: WorldState, title: string, lines: string[]) {
  if (w.story) {
    w.story = { title: w.story.title, lines: [...w.story.lines, '', title, ...lines] };
    // 点検 F6: 出ている窓の中身が増えた。増える前の窓への「つづける」で、まだ読んでいない分を閉じない
    bumpStoryVer(w);
  } else w.story = { title, lines };
}

/** 見晴らしの塔に登った時: 地図全体の災厄の場所を見せる（見えた数） */
export function revealScourges(w: WorldState): number {
  let n = 0;
  for (const { wd } of aliveScourges(w)) {
    if (!w.tiles[wd.tile].seen) w.tiles[wd.tile].seen = true;
    n++;
  }
  return n;
}

/**
 * 災厄を倒した時（遭遇の戦闘に勝って、徘徊する敵を消した後）: 悪さが消える・お金を山分け・侵食度が下がる（寄り道の浄化＋死霊術師の報酬）・物語の窓。
 * 専用の装備と秘薬は、報酬の画面で渡す（scourgeLoot）
 */
export function onScourgeDefeated(game: GameState, def: ScourgeDef, heroes: Hero[]) {
  const w = game.world!;
  const got: string[] = [];
  if (def.reward.gold) {
    splitGold(heroes, def.reward.gold);
    got.push(`${def.reward.gold}Gを${heroes.length > 1 ? '山分けした' : '手に入れた'}`);
  }
  // 盗賊王（2026-11-14 寄り道の値打ち）: 300G の代わりに、町の店の品（装備・消耗品）を1つ無料でもらえる券（パーティみんなの物）
  if (def.reward.freeShop) {
    w.freeShop = (w.freeShop ?? 0) + def.reward.freeShop;
    got.push(`町の店の品を${def.reward.freeShop}つ無料でもらえる券を手に入れた`);
  }
  const drop = BALANCE.scourge.purify + (def.reward.corruption ?? 0);
  if (drop > 0 && w.corruption > 0) {
    const before = w.corruption;
    w.corruption = Math.max(0, w.corruption - drop);
    got.push(`${corruptionName(game.scenarioId)}が${Math.round((before - w.corruption) * 10) / 10}%下がった`);
  }
  got.push(`専用の装備「${getItem(def.gear).name}」${def.reward.elixir ? `と「${getItem(ELIXIR_ID).name}」` : ''}を手に入れた`);
  pushStory(w, `💀 ${def.short}を倒した！`, [def.clearText, ...got.map((x) => `${x}。`)]);
  addLog(game, `💀 ${def.name}を倒した！ ${def.clearText}`);
}

export const ELIXIR_ID = 'scourgeElixir';

/**
 * 報酬の画面に、専用の装備と秘薬を足す。専用の装備は必ず落とす: 2人以上のプレイヤーが生き残れば取り合い（今の戦利品の取り合いと同じ）、
 * 1人なら、その装備を使えるキャラ（武器は持てるジョブ）に、いなければ持ち物の少ないキャラに。秘薬は持ち物の少ないキャラへ（仲間に渡せる）
 */
export function scourgeLoot(game: GameState, reward: RewardState, survivors: Hero[], def: ScourgeDef) {
  if (!survivors.length) return;
  const gear: ItemInstance = newItem(game, getItem(def.gear));
  const it = getItem(def.gear);
  if (new Set(survivors.map((h) => h.playerId)).size > 1 && !reward.claim) reward.claim = { item: gear, heroes: survivors.map((h) => h.id), choices: {} };
  else {
    const fit = survivors.filter((h) => it.slot !== 'weapon' || jobWeapons(h.classId).includes(it.weaponType ?? ''));
    const to = leastLoaded(fit.length ? fit : survivors)!;
    reward.loot.push({ kind: 'item', item: gear, to: to.id });
    addItem(game, to, gear, true);
  }
  for (let k = 0; k < (def.reward.elixir ?? 0); k++) {
    const to = leastLoaded(survivors)!;
    const el = newItem(game, getItem(ELIXIR_ID));
    reward.loot.push({ kind: 'item', item: el, to: to.id });
    addItem(game, to, el, true);
  }
}

/** 画面用: 生きている災厄の一覧（名前・悪さ・場所が見えているか・倒した時の報酬の文） */
export function scourgeList(game: GameState): { id: string; name: string; short: string; curseShort: string; curseText: string; seen: boolean; tile: number; rewardText: string; gearName: string; gearText: string; boonName: string; boonText: string }[] {
  const w = game.world;
  if (!w) return [];
  return aliveScourges(w).map(({ wd, def }) => ({
    id: def.id,
    name: def.name,
    short: def.short,
    curseShort: def.curseShort,
    curseText: def.curseText,
    seen: !!w.tiles[wd.tile]?.seen,
    tile: wd.tile,
    gearName: getItem(def.gear).name,
    gearText: scourgeGearText(def),
    rewardText: scourgeRewardText(game, def),
    boonName: def.boon.name,
    boonText: def.boon.text,
  }));
}

/** 倒すと手に入る専用の装備の効果（1行。装備の能力の説明 = 装備の画面と同じ describeAbility。能力が無ければ装備の説明） */
export function scourgeGearText(def: ScourgeDef): string {
  const it = getItem(def.gear);
  return it.ability ? `《${it.ability.name}》${describeAbility(it.ability)}` : it.description;
}

/** 倒した時の報酬の文（専用の装備・お金・侵食度・秘薬） */
export function scourgeRewardText(game: Pick<GameState, 'scenarioId'>, def: ScourgeDef): string {
  const parts = [`専用の装備「${getItem(def.gear).name}」`];
  if (def.reward.gold) parts.push(`${def.reward.gold}G（山分け）`);
  if (def.reward.freeShop) parts.push(`店の品${def.reward.freeShop}つ無料の券`);
  if (def.reward.elixir) parts.push(`${getItem(ELIXIR_ID).name}`);
  parts.push(`${corruptionName(game.scenarioId)}−${BALANCE.scourge.purify + (def.reward.corruption ?? 0)}%`);
  return parts.join('・');
}

/** そのマスの災厄（遭遇の画面などで使う） */
export const scourgeAt = (w: WorldState | undefined, wandererId: string | undefined): ScourgeDef | undefined => {
  const wd = w?.wanderers.find((x) => x.id === wandererId);
  return wd?.scourge ? SCOURGES.tryGet(wd.scourge) : undefined;
};
