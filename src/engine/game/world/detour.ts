// ===== 寄り道の値打ち（2026-11-14・docs/tasks/detour-value-plan.md。オーナーの返事 1〜5 すべて A）=====
// - 柱1 災厄の加護: 生きている災厄1体ごとに、鍵と最後のダンジョンのボス・中ボスの戦闘に決まりが1つ足される（保存しない。生きている災厄から毎回求める）
// - 柱2 見破り: ランダムダンジョンの主を倒すと、次に挑む鍵のダンジョン（全部済んでいれば最後）のボスを見破る（WorldState.insight）
// - 柱4 抜け道: ランダムダンジョンを制覇して出る時、次に挑む鍵のダンジョンに一番近い、歩いて行ける空きマスに出られる
// - 柱3 の2 災厄の種類をパーティに合わせる: 専用の装備をだれも使えない種類は、使えるキャラがいる時だけ候補に入れる
// 乱数: 加護の手下と最初の予告は、戦闘の乱数（battle.rngState）で決める（冒険の Rng は引かない）。見破り・抜け道・災厄の候補は乱数を使わない
import { BALANCE } from '../../../data/balance';
import { CARDS } from '../../../data/cards';
import { CLASSES } from '../../../data/classes';
import { DUNGEONS } from '../../../data/dungeons';
import { getEnemy } from '../../../data/enemies';
import { getItem } from '../../../data/items';
import { SCOURGES, TERRAINS } from '../../../data/world';
import { getStatus } from '../../../data/statuses';
import type { BattleEvent, BattleState, DungeonDef, EnemyState, GameState, Hero, ItemDef, ScourgeBoon, ScourgeDef, WorldState } from '../../../types';
import { fireAbilities, guardStatus } from '../../abilities';
import { decideIntent, weakestAlly } from '../../battle/intents';
import { enemyLevelFactors } from '../../battle/levels';
import { addStatus, emptyStatuses } from '../../battle/statuses';
import { addLog as battleLog, enemyName } from '../../battle/units';
import { createRng } from '../../rng';
import { equippedItems, jobWeapons } from '../hero';
import { aliveScourges } from './scourgeCurse';
import { CHEST_NAME } from '../../../data/terms';
import { dungeonTheme } from '../dungeon';
import { hexDistance, neighbors } from './hex';

// ---------- 柱1 災厄の加護 ----------

/** 加護の掛かる戦闘か: 鍵のダンジョンと最後のダンジョン（ランダムダンジョンではない）の、ボスか中ボスの部屋の戦闘 */
export function boonBattle(game: Pick<GameState, 'dungeon'>, b: Pick<BattleState, 'boss' | 'midboss'>): boolean {
  const d = game.dungeon ? DUNGEONS.tryGet(game.dungeon.dungeonId) : undefined;
  return !!d && !d.random && (!!b.boss || !!b.midboss);
}

/** 大物（加護・見破りの決まりが掛かる敵）: 呼ばれていない、生きている敵の中で最大HPが一番大きい敵（同じなら並びの前） */
export function bigEnemyOf(b: Pick<BattleState, 'enemies'>): EnemyState | undefined {
  return b.enemies.filter((e) => !e.dead && !e.summoned).reduce<EnemyState | undefined>((best, e) => (!best || e.maxHp > best.maxHp ? e : best), undefined);
}

/** 今の加護（生きている災厄の加護。画面と戦闘の両方がここを読む） */
export const activeBoons = (w: Pick<WorldState, 'wanderers'> | undefined): ScourgeDef[] => aliveScourges(w).map(({ def }) => def);

/**
 * 戦闘を始めた後（startBattleWith）: 加護の掛かる戦闘なら、生きている災厄の加護を付ける。
 * 用心棒 = 手下を1体（戦場の空きがあれば。呼ばれた敵と同じ扱い = 報酬なし）/ 瘴気の衣・凍てつく守り・炉の熱 = 戦闘の印 /
 * 悪夢の目 = 大物の最初の予告を「悪夢の目」（手負い狙い）に替える
 */
export function applyScourgeBoons(game: GameState, b: BattleState): void {
  if (!game.world || !boonBattle(game, b)) return;
  const defs = activeBoons(game.world);
  const big = bigEnemyOf(b);
  if (!defs.length || !big) return;
  b.boon = { ids: defs.map((d) => d.id), uid: big.uid };
  const rng = createRng(b.rngState);
  const events: BattleEvent[] = b.openingEvents ?? [];
  for (const d of defs) {
    const boon = d.boon;
    if (boon.kind === 'regen') b.boon.regen = (b.boon.regen ?? 0) + boon.pct;
    else if (boon.kind === 'breakWard') b.boon.ward = true;
    else if (boon.kind === 'phaseBurn') b.boon.phaseBurn = (b.boon.phaseBurn ?? 0) + boon.amount;
    else if (boon.kind === 'bodyguard') {
      if (b.enemies.length >= BALANCE.maxEnemies) continue;
      const e = makeBodyguard(b, big, boon.enemy);
      b.enemies.push(e);
      decideIntent(e, b, rng);
      fireAbilities(b, rng, events, e, 'battleStart');
    } else if (boon.kind === 'huntFirst' && big.intent) {
      big.intent = { actionId: boon.action, targetId: weakestAlly(b) };
      big.history = [...big.history.slice(0, -1), boon.action];
    } else if (boon.kind === 'bellToll') b.boon.bell = { every: boon.every, pct: boon.pct };
    else if (boon.kind === 'darkVeil') {
      // 闇の帳（区切り3a）: 大物の最初の予告（今出ていれば今のターン。奇襲で予告が無ければ次のターン）の名前と数字を隠す。
      // 見破った大物・味方のだれかが見通す装備（灯火のランタン）を着けている時は掛からない（加護の一覧には出る）
      const see = seesThroughVeil(game, b, boon.seeItems);
      // 見破り（applyInsight はこの後に付くので、同じ条件をここで見る: 見破ったダンジョンのボスの部屋）
      const seen = !!b.boss && !b.midboss && !!game.dungeon && hasInsight(game, game.dungeon.dungeonId);
      if (seen || see) {
        battleLog(b, `💀${d.boon.name}（${d.name}の加護）: ${see ? `${see}が闇を照らし、` : '見破っているので、'}予告は全部見えている`);
        continue;
      }
      b.boon.veil = big.intent ? b.turn : b.turn + 1;
    } else if (boon.kind === 'frostBreath') applyFrostBreath(b, big, boon, rng, events);
    battleLog(b, `💀${d.boon.name}（${d.name}の加護）: ${d.boon.text}`);
  }
  b.openingEvents = events;
  b.rngState = rng.state;
}

/**
 * 白い息（区切り3a・docs/tasks/scenario2-theme-scourge-proposal.md §7）: 戦闘の始め（1ターン目の手札とマナが決まった後）に、生きている味方1人（戦闘の乱数）に status。
 * 戦闘に出る味方が1人なら、代わりに soloStatus（オーナーの決定: 1人の時だけ「弱体」）。
 * 敵から受ける悪い状態異常と同じ通り道（guardStatus）を通すので、灯火のランタン・春待ちの外套などで防げる。雪解けの指輪は2ターン目の始めに治す
 */
function applyFrostBreath(b: BattleState, big: EnemyState, boon: Extract<ScourgeBoon, { kind: 'frostBreath' }>, rng: ReturnType<typeof createRng>, events: BattleEvent[]) {
  const alive = b.allies.filter((a) => !a.dead);
  if (!alive.length) return;
  const status = b.allies.length === 1 ? boon.soloStatus : boon.status;
  const t = alive[rng.int(alive.length)];
  if (guardStatus(b, events, t, status)) return;
  addStatus(t.statuses, status, boon.amount);
  events.push({ type: 'status', unitId: t.id, status, amount: boon.amount });
  battleLog(b, `💀${boon.name}: ${t.name}に「${getStatus(status).name}」${boon.amount}`);
  // 自分に悪い状態異常が付いた（悪夢の毛皮など）: 敵の行動で付いた時と同じきっかけ
  if (getStatus(status).harmful) fireAbilities(b, rng, events, t, 'statusTaken', { statusId: status, dealt: boon.amount, attacker: big, depth: 1 });
}

/** 闇の帳を見通す装備を、戦闘に出ている味方のだれかが着けていれば、その装備の名前（無ければ undefined） */
function seesThroughVeil(game: GameState, b: BattleState, items: string[]): string | undefined {
  for (const a of b.allies) {
    const h = game.heroes.find((x) => x.id === a.id);
    const it = h ? equippedItems(h).find((i) => items.includes(i.id)) : undefined;
    if (it) return it.name;
  }
  return undefined;
}

/** 用心棒の手下（大物と同じレベル・同じ人数と難易度の補正。呼ばれた敵と同じく報酬なし） */
function makeBodyguard(b: BattleState, big: EnemyState, enemyId: string): EnemyState {
  const def = getEnemy(enemyId);
  const own = getEnemy(big.defId);
  const ownF = enemyLevelFactors(own, big.level);
  const hpScale = big.maxHp / Math.max(1, own.maxHp * ownF.hp);
  const atkScale = big.attackMul / ownF.attack;
  const f = enemyLevelFactors(def, big.level);
  const hp = Math.max(1, Math.floor(def.maxHp * f.hp * hpScale + 1e-9));
  const same = b.enemies.filter((x) => x.defId === enemyId);
  if (same.length === 1 && !same[0].nameSuffix) same[0].nameSuffix = 'A';
  const e: EnemyState = {
    uid: `e${b.enemies.length}`,
    defId: enemyId,
    nameSuffix: same.length ? String.fromCharCode(65 + same.length) : undefined,
    level: big.level,
    attackMul: f.attack * atkScale,
    hp,
    maxHp: hp,
    block: 0,
    statuses: emptyStatuses(),
    seqIndex: 0,
    history: [],
    dead: false,
    phase: 0,
    summoned: true,
  };
  battleLog(b, `${enemyName(e)}（用心棒）が加わった！`);
  return e;
}

// ---------- 柱2 見破り・柱4 抜け道の行き先 ----------

/** 鍵のダンジョン（敵のレベルの低い順）→ 最後のダンジョンの順（自動プレイの順番と同じ。地図の上の「次に挑む」） */
function keyOrder(scenarioId: string): DungeonDef[] {
  const list = DUNGEONS.forScenario(scenarioId).filter((d) => !d.random && (d.rewardKey || d.finale));
  return [...list.filter((d) => !d.finale).sort((a, b) => a.baseLevel - b.baseLevel), ...list.filter((d) => d.finale)];
}

/** 次に挑む鍵のダンジョン（まだ制覇していない、順番で最初の物。全部済んでいれば最後のダンジョン） */
export function nextKeyDungeon(game: Pick<GameState, 'scenarioId' | 'clearedDungeons'>): DungeonDef | undefined {
  return keyOrder(game.scenarioId).find((d) => !game.clearedDungeons.includes(d.id));
}

/** 見破りの行き先: 次に挑む鍵のダンジョンから順に、まだ見破っていない・制覇していない最初の物（無ければ undefined） */
export function insightTarget(game: Pick<GameState, 'scenarioId' | 'clearedDungeons' | 'world'>): DungeonDef | undefined {
  const have = game.world?.insight ?? [];
  return keyOrder(game.scenarioId).find((d) => !game.clearedDungeons.includes(d.id) && !have.includes(d.id));
}

/** ランダムダンジョンの主を倒した時: 見破りを1つ（行き先の名前を返す。行き先が無ければ undefined） */
export function grantInsight(game: GameState): string | undefined {
  const w = game.world;
  const d = insightTarget(game);
  if (!w || !d) return undefined;
  w.insight = [...(w.insight ?? []), d.id];
  return d.name;
}

/** そのダンジョンを見破っているか */
export const hasInsight = (game: Pick<GameState, 'world'>, dungeonId: string) => !!game.world?.insight?.includes(dungeonId);

/** 戦闘を始めた後: 見破ったダンジョンのボスの部屋の戦闘なら、大物を見破る（battle.insight） */
export function applyInsight(game: GameState, b: BattleState): void {
  const run = game.dungeon;
  if (!run || !b.boss || b.midboss || !hasInsight(game, run.dungeonId)) return;
  const big = bigEnemyOf(b);
  if (!big) return;
  b.insight = big.uid;
  battleLog(b, `👁見破り: ${enemyName(big)}の大技と開幕の一手は、完全成功だけで崩せる`);
}

/**
 * 抜け道の出口（無ければ undefined）: ランダムダンジョンの入口から、陸を歩いて BALANCE.randomDungeon.shortcutRange 歩以内の空きマス
 * （町・ダンジョンなどの場所・徘徊する敵・時間で消える物の無いマス）のうち、次に挑む鍵のダンジョンの入口に一番近いマス（同じならマスの番号の小さい方）。
 * 入口より近くならない時は undefined（抜け道は無い）。乱数は使わない
 */
export function shortcutTile(game: Pick<GameState, 'world' | 'scenarioId' | 'clearedDungeons'>, entrance: number | undefined): number | undefined {
  const w = game.world;
  const goal = nextKeyDungeon(game);
  if (!w || entrance === undefined || !goal) return undefined;
  const target = w.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === goal.id);
  if (target < 0) return undefined;
  const land = (i: number) => {
    const t = TERRAINS.get(w.tiles[i].t);
    return t.moveCost > 0 && !t.sea;
  };
  const busy = new Set<number>([...w.wanderers.map((x) => x.tile), ...(w.spawns ?? []).map((x) => x.tile)]);
  const range = BALANCE.randomDungeon.shortcutRange;
  const steps = new Map<number, number>([[entrance, 0]]);
  const q = [entrance];
  for (let k = 0; k < q.length; k++) {
    const d = steps.get(q[k])!;
    if (d >= range) continue;
    for (const n of neighbors(w, q[k])) if (!steps.has(n) && land(n)) (steps.set(n, d + 1), q.push(n));
  }
  let best: number | undefined;
  for (const i of steps.keys()) {
    if (i === entrance || w.tiles[i].f || busy.has(i)) continue;
    if (best === undefined || hexDistance(w, i, target) < hexDistance(w, best, target) || (hexDistance(w, i, target) === hexDistance(w, best, target) && i < best)) best = i;
  }
  return best !== undefined && hexDistance(w, best, target) < hexDistance(w, entrance, target) ? best : undefined;
}

// ---------- 柱3 の2 災厄の種類をパーティに合わせる ----------

/** そのジョブから転職でたどり着けるジョブ（自分も入れる） */
function reachableJobs(classId: string): Set<string> {
  const out = new Set([classId]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const c of CLASSES.all) if (!out.has(c.id) && (c.from ?? []).some((f) => out.has(f))) (out.add(c.id), (grew = true));
  }
  return out;
}

/** 戦闘中にお金を得るカードを持つジョブか（強欲王の黄金冠のように、お金を得た時に働く装備を「使える」か） */
const gainsGold = (classId: string) => CLASSES.get(classId).cardPool.some((id) => CARDS.has(id) && CARDS.get(id).tiers.some((t) => t.effects.some((e) => e.kind === 'gainGold')));

/**
 * その装備を、だれかが（今のジョブか、転職でたどり着けるジョブで）使えるか。
 * 武器 = 持てる武器種 / お金を得た時に働く装備（能力のきっかけ goldGain）= お金を得るカードを持つジョブ / ほか = だれでも
 */
export function gearUsable(heroes: Hero[], item: ItemDef): boolean {
  const effect = item.ability?.effect as { when?: string } | undefined;
  return heroes.some((h) =>
    [...reachableJobs(h.classId)].some((j) => {
      if (item.slot === 'weapon' && !jobWeapons(j).includes(item.weaponType ?? '')) return false;
      if (effect?.when === 'goldGain' && !gainsGold(j)) return false;
      return true;
    }),
  );
}

/** 出てよい災厄か（専用の装備を、パーティのだれかが使える） */
export const scourgeFits = (heroes: Hero[], def: ScourgeDef) => gearUsable(heroes, getItem(def.gear));

// ---------- 画面用 ----------

/**
 * 地図のマスの説明に足す、寄り道の値打ちの行（行く前に何が得られるか・何が掛かっているかの手がかり）:
 * - ランダムダンジョン（踏破していない）: 「主を倒すと: 秘宝を3つから1つ・👁見破り（〇〇のボス）・抜け道」
 * - 鍵と最後のダンジョン: 掛かっている加護（💀）・見破っていれば「👁見破り済み」とボスの段階の境目と開幕の一手
 */
export function dungeonDetourLines(game: Pick<GameState, 'world' | 'scenarioId' | 'clearedDungeons'>, tile: number): string[] {
  const w = game.world;
  const f = w?.tiles[tile]?.f;
  if (!w || f?.kind !== 'dungeon') return [];
  const def = DUNGEONS.tryGet(f.id);
  if (!def) return [];
  if (def.random) {
    if (f.used) return [];
    const target = insightTarget(game);
    const out = [`主を倒すと: 秘宝を選べる（最大3つから1つ）・${target ? `👁見破り（${target.name}のボス）・` : ''}抜け道`];
    // 区切り3b: テーマ「🧊 氷漬けの宝物庫」の中身（凍え・焚き火・奥の箱）を、行く前に分かるように
    const chill = dungeonTheme(f.theme)?.chill;
    if (chill) {
      const up = chill.chest.slice().reverse();
      const grades = `${up.filter((c) => c.min > 0).map((c) => `凍え${c.min}以上で${CHEST_NAME[c.rarity]}`).join('・')}。少ないと${CHEST_NAME[up[0].rarity]}`;
      out.push(`🧊凍え: 部屋に入るたびに凍え+1、HPが「凍え×${chill.hpPercent}%」減る（HPは1で止まる）。🔥焚き火で凍えは0に戻る。奥の氷漬けの箱は、凍えたまま着くほど良い（${grades}）`);
    }
    // 2026-11-16 シナリオ3の作り直し: テーマ「🛶 漂流物の洞」の奥（漂流物の山）を、行く前に分かるように
    const flotsam = dungeonTheme(f.theme)?.flotsam;
    if (flotsam) out.push(`🛶漂流物の山: 奥で、全員がそれぞれ消耗品を${flotsam.choices}つから1つ選べる（${flotsam.epicSlots}つはエピック以上）。袋がいっぱいだと、選んだ品はお金に換わる`);
    return out;
  }
  if (!def.rewardKey && !def.finale) return [];
  const out: string[] = [];
  const boons = activeBoons(w);
  if (boons.length) out.push(`💀加護: ${boons.map((d) => `「${d.boon.name}」`).join('')}（ボス・中ボスの戦闘に掛かる）`);
  // 闇の帳（区切り3a）: 見る方法を、行く前にも出す（予告が隠れる加護なので、備えられるように）
  for (const d of boons) if (d.boon.kind === 'darkVeil') out.push(`💀${d.boon.name}: ${d.boon.text}`);
  if (hasInsight(game, def.id)) {
    const boss = getEnemy(def.pools.boss[0]);
    const marks = (boss.phases ?? []).map((p) => `HP${p.belowHpPct}%で「${p.actions.find((a) => a.id === p.openingActionId)?.name ?? p.name}」${p.rule ? `（${p.rule}）` : ''}`);
    out.push(`👁見破り済み: ${boss.name}の大技と開幕の一手は、完全成功だけで崩せる${marks.length ? `。段階: ${marks.join('／')}` : ''}`);
  }
  return out;
}

/** 加護の一覧（名前・中身・掛けている災厄）。札・入口・戦闘の長押しに出す */
export function boonViews(game: Pick<GameState, 'world'>): { scourge: string; short: string; name: string; text: string }[] {
  return activeBoons(game.world).map((d) => ({ scourge: d.name, short: d.short, name: d.boon.name, text: d.boon.text }));
}

/** 戦闘に掛かっている加護（戦闘の印 b.boon の災厄の ID から。倒した災厄が後から消えても、その戦闘の間は残る） */
export function battleBoonViews(b: Pick<BattleState, 'boon'>): { scourge: string; name: string; text: string }[] {
  return (b.boon?.ids ?? []).flatMap((id) => {
    const d = SCOURGES.tryGet(id);
    return d ? [{ scourge: d.name, name: d.boon.name, text: d.boon.text }] : [];
  });
}
