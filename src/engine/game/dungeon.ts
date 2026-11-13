import { RARITY_NAME } from '../../data/terms';
import { BALANCE } from '../../data/balance';
// ===== ダンジョンの生成と移動 =====
import { DUNGEON_THEMES, getRoomType, ROOM_TYPES } from '../../data/rules';
import { getDungeon } from './registry';
import { DUNGEONS } from '../../data/dungeons';
import type { ChestSpec, DungeonDef, DungeonRun, DungeonThemeDef, Rarity, Room, RoomType } from '../../types';
import type { Rng } from '../rng';
import { initDungeonPos } from './dungeonMap';
import { omenOfType } from './dungeonOmen';

export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legend'];
export const rarityIndex = (r: Rarity) => RARITIES.indexOf(r);
export { RARITY_NAME };

const pick = <T,>(list: readonly T[], rng: Rng) => list[rng.int(list.length)];

/** 深さの段: rowsPerStep 行ごとに +1（入口の行が 0。抜本的な見直し §2-2。段階3で 3行ごと → 2行ごと） */
export const depthStep = (row: number) => Math.floor(row / BALANCE.depthBonus.rowsPerStep);
/** 深層ボーナスの段（0=入口 / 1=浅層 / 2=中層 / 3=深層。それより深くても 3） */
export const depthTier = (row: number) => Math.min(BALANCE.depthBonus.reward.length - 1, depthStep(row));
/** 深層ボーナスの名前（画面用。入口は空） */
export const DEPTH_TIER_NAME = ['', '浅層', '中層', '深層'] as const;

/** 入口からボスまでの行の数 */
export const dungeonRows = (run: Pick<DungeonRun, 'rooms'>) => Math.max(0, ...run.rooms.map((r) => r.row)) + 1;

/**
 * 古い形のダンジョンか（40行・52行に大きくしていた頃に入った、固定のダンジョン）。
 * 保存に目印は足さない: 「今のデータの行の数」と「入った時に保存した部屋の行の数」が違えば古い形。ランダムダンジョンは形が変わっていないので当てはまらない
 */
export function isLegacyLayout(run: Pick<DungeonRun, 'dungeonId' | 'rooms' | 'random'>): boolean {
  if (run.random) return false;
  const layout = getDungeon(run.dungeonId).layout;
  return !!layout && layout.length !== dungeonRows(run);
}

/**
 * ダンジョンの順番（0 = 1つ目の鍵のダンジョン / 1 = 2つ目 / 2 = 3つ目 / 3 = 最後のダンジョン。ランダムダンジョンは undefined）。
 * 鍵のダンジョンは、そのシナリオの中で、敵の基準レベルが低い順に数える（データに順番は書かない）
 */
export function dungeonStage(def: DungeonDef): number | undefined {
  if (def.random || (!def.rewardKey && !def.finale)) return undefined;
  const keyed = DUNGEONS.forScenario(DUNGEONS.scenarioOf(def.id) ?? '').filter((d) => !d.random && d.rewardKey && !d.finale).sort((a, b) => a.baseLevel - b.baseLevel);
  return def.finale ? Math.max(BALANCE.dungeonStageLevel.length - 1, keyed.length) : Math.max(0, keyed.findIndex((d) => d.id === def.id));
}

/** そのダンジョンの敵の基準レベル（データの基準レベル ＋ ダンジョンの順番ごとの上乗せ） */
export function dungeonEnemyLevel(def: DungeonDef): number {
  const stage = dungeonStage(def);
  return def.baseLevel + (stage === undefined ? 0 : (BALANCE.dungeonStageLevel[Math.min(stage, BALANCE.dungeonStageLevel.length - 1)] ?? 0));
}

/** 無法者の隠れ処（largeGroups）の戦闘の部屋で、組の敵がこの数より少ない時は1体足す【提案】 */
const LARGE_GROUP_MIN = 3;

/** 部屋の敵を決める（組み合わせと加算レベルは部屋の種類のデータ。レベルはダンジョンの基準 + 深さ + 難易度） */
function rollEnemies(def: DungeonDef, type: RoomType, row: number, levelBonus: number, rng: Rng, theme?: DungeonThemeDef) {
  const b = getRoomType(type).battle!;
  // 無法者の隠れ処: 戦闘の部屋は、そのダンジョンの組のうち一番数が多い組から選び、それでも3体より少なければ1体足す（最大 maxEnemies）
  const large = !!theme?.largeGroups && b.pool === 'battle';
  const battlePool = large ? def.pools.battle.filter((g) => g.length === Math.max(...def.pools.battle.map((x) => x.length))) : undefined;
  let ids = b.pool === 'boss' ? def.pools.boss : b.pool === 'midboss' ? (def.pools.midboss ?? def.pools.elite[0]) : pick(battlePool ?? def.pools[b.pool], rng);
  if (large && ids.length < LARGE_GROUP_MIN && ids.length < BALANCE.maxEnemies) ids = [...ids, pick(pick(def.pools.battle, rng), rng)];
  // 強敵の本体 = 強敵の組（pools.elite）から来た敵（強敵の部屋・封魔の宝箱の番人）。下で足すふつうの戦闘の敵は本体ではない（2026-11-13 強敵の本気）
  const bodies = b.pool === 'elite' ? ids.length : 0;
  const step = depthStep(row);
  // 奥（深さの段が extraEnemyFromStep 以上。今は5行目以降）の戦闘・強敵の部屋は、そのダンジョンの戦闘の敵が1体増える（最大4体。ボス・中ボスは決まった組のまま）
  if ((b.pool === 'battle' || b.pool === 'elite') && step >= BALANCE.depthBonus.extraEnemyFromStep && ids.length < BALANCE.maxEnemies) ids = [...ids, pick(pick(def.pools.battle, rng), rng)];
  // 深さ: 段ごとに+1（今は2行ごと。鍵10行のボスの行で+4、最後13行のボスの行で+6）
  const lv = dungeonEnemyLevel(def) + step + levelBonus + b.levelBonus;
  return ids.map((defId, i) => ({ defId, level: Math.max(1, lv), ...(i < bodies ? { eliteBody: true } : {}) }));
}

/** ダンジョンの宝箱の見た目（木箱が中心。奥の行ほど良い箱が出やすい） */
function rollChest(row: number, rng: Rng): ChestSpec {
  const weights = [Math.max(30, 70 - row * 5), 25 + row * 2, 4 + row * 2, 1 + row * 0.5];
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng.next() * total;
  let i = 0;
  while (i < weights.length - 1 && (x -= weights[i]) >= 0) i++;
  return { rarity: RARITIES[i], locked: rng.next() < 0.4 };
}

/**
 * 部屋の「種類」（連続の決まりで使う分け方。扉の予兆と同じ: 戦闘・強敵・宝（宝箱と封魔の宝箱）・休憩・未知（イベント・祭壇・闇商人））。
 * 予兆の無いボス・中ボスは、部屋の type のまま（どの種類とも違う）
 */
export const roomKind = (type: RoomType): string => omenOfType(type) ?? type;

/** 途中の行の部屋の種類（部屋の種類のデータの layoutWeight の割合。x は 0〜1 の乱数） */
function pickRoomType(x: number, banned: ReadonlySet<RoomType>): RoomType {
  const list = ROOM_TYPES.all.filter((t) => (t.layoutWeight ?? 0) > 0 && !banned.has(t.id));
  const total = list.reduce((n, t) => n + t.layoutWeight!, 0);
  let acc = 0;
  for (const t of list) {
    acc += t.layoutWeight! / total;
    if (x < acc) return t.id;
  }
  return list[list.length - 1].id;
}

/** テーマの割合で部屋の種類を選ぶ（x は 0〜1 の乱数。偏り防止で出せない種類は除く。全部除かれたら、ふつうの割合で出せる種類から選ぶ） */
function pickThemeRoomType(x: number, weights: DungeonThemeDef['weights'], banned: ReadonlySet<RoomType>): RoomType {
  const list = Object.entries(weights).filter(([id, w]) => (w ?? 0) > 0 && !banned.has(id)) as [RoomType, number][];
  if (!list.length) return pickRoomType(x, banned);
  const total = list.reduce((n, [, w]) => n + w, 0);
  let acc = 0;
  for (const [id, w] of list) {
    acc += w / total;
    if (x < acc) return id;
  }
  return list[list.length - 1][0];
}

/**
 * ランダム生成の部屋の並び（1行あたり1〜3部屋。各部屋は次の行の近い部屋につながる）。
 * テーマがある時（段階7a・全5行）: 1行目 = 戦闘（1〜2部屋）／途中の行 = テーマの割合（1〜3部屋）／最後の行 = テーマで決まった部屋（1部屋）／その次にボス。
 * 偏り防止の決まりは、テーマがあっても同じ。テーマの部屋（休憩など）は、すぐ前の行には出さない
 */
function generateLayout(def: DungeonDef, rng: Rng, eventIds: string[], theme?: DungeonThemeDef): NonNullable<DungeonDef['layout']> {
  const rows = def.rows ?? 6;
  const widths = Array.from({ length: rows }, (_, i) => (i === 0 ? 1 + rng.int(2) : 1 + rng.int(3)));
  if (theme) widths[rows - 1] = 1;
  // 1. 道のつながりを先に決める（位置が近い部屋へ。必ず1つ以上）。部屋の種類は、つながりが全部決まってから決める
  const nexts: number[][][] = widths.map((w, r) => {
    const nextW = r + 1 < rows ? widths[r + 1] : 1;
    return Array.from({ length: w }, (_, c) => {
      const center = nextW === 1 ? 0 : Math.round((c / Math.max(1, w - 1)) * (nextW - 1));
      const next = new Set<number>([center]);
      if (nextW > 1 && rng.next() < 0.5) next.add(Math.min(nextW - 1, Math.max(0, center + (rng.next() < 0.5 ? -1 : 1))));
      return [...next].sort();
    });
  });
  // 次の行のどの部屋にも入れない部屋が無いよう、つながっていない部屋へ前の行からつなぐ
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < widths[r]; c++) {
      if (!nexts[r - 1].some((n) => n.includes(c))) {
        const from = Math.min(widths[r - 1] - 1, Math.round((c / Math.max(1, widths[r] - 1)) * (widths[r - 1] - 1)));
        nexts[r - 1][from] = [...new Set([...nexts[r - 1][from], c])].sort();
      }
    }
  }
  // 2. 部屋の種類。偏り防止（憲章3「同じ種類の部屋の連続出現は禁止」。2026-11-13）:
  //   (a) どの道でも、続けて同じ種類の部屋に入らない（その部屋へつながる前の行の部屋の種類は出さない）。種類は扉の予兆と同じ分け方（roomKind）
  //   (b) 同じ行の部屋は、なるべく全部ちがう種類にする。出せる種類が足りない時は、部屋の数は減らさず、(b) を「type が違う」→「決まりなし」の順にゆるめる（(a) は必ず守る）
  const layout: NonNullable<DungeonDef['layout']> = [];
  const baseTypes = ROOM_TYPES.all.filter((t) => (t.layoutWeight ?? 0) > 0);
  const kindBan = (kinds: ReadonlySet<string>) => new Set<RoomType>(ROOM_TYPES.all.filter((t) => kinds.has(roomKind(t.id))).map((t) => t.id));
  for (let r = 0; r < rows; r++) {
    const row: NonNullable<DungeonDef['layout']>[number] = [];
    for (let c = 0; c < widths[r]; c++) {
      const parentKinds = new Set((layout[r - 1] ?? []).filter((_, pc) => nexts[r - 1][pc].includes(c)).map((p) => roomKind(p.type)));
      // テーマの部屋（最後の行）の手前の行には、テーマの部屋と同じ種類を出さない
      if (theme && r === rows - 2) parentKinds.add(roomKind(theme.fixedRoom));
      const mustBan = kindBan(parentKinds);
      const rowKinds = new Set(row.map((p) => roomKind(p.type)));
      const tries = [kindBan(new Set([...parentKinds, ...rowKinds])), new Set<RoomType>([...mustBan, ...row.map((p) => p.type)]), mustBan];
      const banned = tries.find((b) => baseTypes.some((t) => !b.has(t.id)))!;
      // 部屋の種類: 1行目は戦闘。最後の行の手前は休憩が出やすい
      let type: RoomType;
      const x = rng.next();
      if (r === 0) type = 'battle';
      else if (theme) type = r === rows - 1 ? theme.fixedRoom : pickThemeRoomType(x, theme.weights, banned);
      // テーマなしの最後の行: 休憩か宝箱（どちらも出せなければ、ふつうの割合で出せる種類から）
      else if (r === rows - 1) type = !banned.has('rest') && (x < 0.6 || banned.has('chest')) ? 'rest' : !banned.has('chest') ? 'chest' : pickRoomType(x, banned);
      else type = pickRoomType(x, banned);
      row.push({
        type,
        next: nexts[r][c],
        chest: getRoomType(type).behavior === 'chest' ? rollChest(r, rng) : undefined,
        eventId: getRoomType(type).behavior === 'event' ? pick(eventIds, rng) : undefined,
      });
    }
    layout.push(row);
  }
  layout.push([{ type: 'boss', next: [] }]);
  return layout;
}

/** 封魔の宝箱の部屋の種類（データに1つ。無ければ封魔の宝箱は出ない） */
const sealedChestType = () => ROOM_TYPES.all.find((t) => t.sealedChest);

/**
 * 宝箱の部屋を、一定の確率で「封魔の宝箱」に変える（奥の行だけ）。乱数はダンジョンを作る時に引き、結果は部屋に書く
 * （保存して再開しても・オンラインでも同じ）。部屋の並びの決まり（偏り防止）は、どちらも「宝箱の行」として数える
 */
function sealChest(spec: { type: RoomType; chest?: ChestSpec }, row: number, rng: Rng, theme?: DungeonThemeDef): { type: RoomType; chest?: ChestSpec } {
  const sealed = sealedChestType();
  const s = BALANCE.sealedChest;
  // 封魔の地下迷宮（段階7a）: 2行目から、テーマの確率で封魔の宝箱になる
  const fromRow = theme?.sealedChance !== undefined ? 1 : s.fromRow;
  const chance = theme?.sealedChance ?? s.chance;
  if (!sealed || getRoomType(spec.type).behavior !== 'chest' || getRoomType(spec.type).sealedChest || !spec.chest || row < fromRow) return spec;
  if (rng.next() * 100 >= chance) return spec;
  return { type: sealed.id, chest: { rarity: row >= s.legendFromRow ? 'legend' : 'epic', locked: false, sealed: true } };
}

/** ランダムダンジョンのテーマ（無い・消えたテーマなら undefined） */
export const dungeonTheme = (id: string | undefined): DungeonThemeDef | undefined => (id ? DUNGEON_THEMES.tryGet(id) : undefined);

/** ダンジョンのテーマのご褒美の倍率（テーマが無ければ全部 1）。ボスの黄金箱には掛けない（宝箱の方で big を見て外す） */
export function themeReward(run: Pick<DungeonRun, 'theme'> | undefined): { chestGold: number; battleGold: number; epicMul: number } {
  const r = dungeonTheme(run?.theme)?.reward;
  return { chestGold: r?.chestGold ?? 1, battleGold: r?.battleGold ?? 1, epicMul: r?.epicMul ?? 1 };
}

/** ランダムダンジョンの名前（テーマがあれば「古代の晶洞（迷いの森の洞窟）」） */
export function themedDungeonName(def: Pick<DungeonDef, 'name'>, themeId?: string): string {
  const t = dungeonTheme(themeId);
  return t ? `${t.name}（${def.name}）` : def.name;
}

/** themeId: ランダムダンジョンのテーマ（段階7a。固定のダンジョンには付けない） */
export function buildDungeon(dungeonId: string, rng: Rng, levelBonus: number, eventIds: string[], themeId?: string): DungeonRun {
  const def = getDungeon(dungeonId);
  const random = !!def.random || !def.layout;
  const theme = random ? dungeonTheme(themeId) : undefined;
  const layout = def.layout ?? generateLayout(def, rng, eventIds, theme);
  const lvBonus = levelBonus + (theme?.enemyLevel ?? 0);
  const id = (r: number, c: number) => `r${r}c${c}`;
  const rooms: Room[] = layout.flatMap((row, r) =>
    row.map((spec, c) => {
      const { type, chest } = sealChest(spec, r, rng, theme);
      return {
        id: id(r, c),
        row: r,
        col: c,
        type,
        next: spec.next.map((n) => id(r + 1, n)),
        enemies: getRoomType(type).battle ? rollEnemies(def, type, r, lvBonus, rng, theme) : undefined,
        chest: chest ? { ...chest } : undefined,
        eventId: spec.eventId,
        cleared: false,
      };
    }),
  );
  const run: DungeonRun = { dungeonId, name: themedDungeonName(def, theme?.id), random, background: def.background, rooms, gained: [] };
  if (theme) run.theme = theme.id;
  // 通路の地図の入口に立ち、北（奥）を向く（地図は部屋のつながりから決まる。乱数は引かない）
  initDungeonPos(run);
  return run;
}

export function findRoom(run: DungeonRun, id: string): Room | undefined {
  return run.rooms.find((r) => r.id === id);
}

/** 次に入れる部屋 */
export function reachableRooms(run: DungeonRun): Room[] {
  if (!run.currentRoomId) return run.rooms.filter((r) => r.row === 0);
  const cur = findRoom(run, run.currentRoomId);
  if (!cur || !cur.cleared) return [];
  return cur.next.map((id) => findRoom(run, id)).filter((r): r is Room => !!r);
}
