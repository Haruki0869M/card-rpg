// ===== 保存データの引き継ぎ（古い形の冒険を新しい形に直して読み込む） =====
// 保存データの形を変えた時は、GAME_VERSION（= battle の STATE_VERSION）を1つ上げ、ここに「前の版 → 次の版」の直し方を1つ足す。
// 直し方が無い古い版は読み込まない（タイトルで「つづきから」が出ないだけで、新しく始められる）。
import { CARDS } from '../../data/cards';
import { MERGED_CARDS } from '../../data/cards/merged';
import { CLASSES } from '../../data/classes';
import { DUNGEONS } from '../../data/dungeons';
import { ENEMIES } from '../../data/enemies';
import { ITEMS } from '../../data/items';
import { SCENARIOS } from '../../data/scenarios';
import { SANCTUARIES } from '../../data/world';
import { getRoomType } from '../../data/rules';
import type { GameState } from '../../types';
import { STATE_VERSION } from '../battle/battle';

type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// v17 までの保存データは読まない（2026-11-11 オーナーの決定: 装備の作り直しで、古い保存は捨てて良い。置き換えの表は作らない）。
// それより前の「直し方」（v3〜v16）は、もう通らないので消した。次に形を変える時は、ここに 18(g) { ... } から足す。
const MIGRATIONS: Record<number, (g: Loose) => void> = {
  // v23 → v24（2026-11-12・憲章5）: 数字だけ違うカードをまとめた。消した札を、残した札に読み替える
  23(g) { renameCards(g); },
  // v24 → v25（2026-11-12・区切りG-1）: 武器にだけ付いていた札11枚と、区切りFの2枚をまとめた
  24(g) { renameCards(g); },
};

/** 保存データの中のカードのID（cardId の項目と、名前に card が入る並び）を、まとめた先に読み替える。敵の行動のID（同じ文字の物がある）には触らない */
function renameCards(v: unknown, key = ''): void {
  if (Array.isArray(v)) {
    const cardList = /card|jobPick|exhausted/i.test(key);
    v.forEach((x, i) => {
      if (typeof x === 'string') { if (cardList && MERGED_CARDS[x]) v[i] = MERGED_CARDS[x]; }
      else renameCards(x, key);
    });
    return;
  }
  if (!v || typeof v !== 'object') return;
  const o = v as Loose;
  for (const k of Object.keys(o)) {
    if (k === 'cardId' && typeof o[k] === 'string') { if (MERGED_CARDS[o[k]]) o[k] = MERGED_CARDS[o[k]]; }
    else renameCards(o[k], k);
  }
}

/**
 * 版を上げずに直す物:
 * - 世界マップの前の「スロットの判定」の結果は捨てる
 * - ダンジョンの探索のサイコロ（選べる扉の数）は無くなった（扉1つ＝手番1回）。途中の保存に残っている項目は捨てる。
 *   部屋の中（戦闘・宝箱など）で保存していたら「この手番に扉を開けた」ことにする（部屋を済ませたら手番が終わる）
 * - 前の「周囲の警戒」（感知の判定）の結果は捨てる（今はフォーカス1で先読み）
 */
function normalizeDice(g: Loose) {
  if (g.world && Array.isArray(g.world.moveRoll)) delete g.world.moveRoll;
  const scenes: { d: Loose; mode: string; scene: boolean }[] = [{ d: g.dungeon, mode: g.mode, scene: false }, ...(g.expeditions ?? []).map((x: Loose) => ({ d: x.dungeon, mode: x.mode, scene: true }))];
  for (const { d, mode, scene } of scenes) {
    if (!d) continue;
    const old = 'explore' in d || 'exploreDice' in d || 'exploreRoll' in d || 'watchRoll' in d || 'sensed' in d;
    if (!old) continue;
    if (scene && mode !== 'dungeon' && d.opened === undefined) d.opened = true;
    if ('watchRoll' in d || 'sensed' in d) delete d.watchedAt;
    for (const k of ['explore', 'exploreDice', 'exploreRoll', 'ended', 'exploreRoller', 'watchRoll', 'sensed']) delete d[k];
  }
}

/** 古い版の冒険を今の版に直す。直せなければ null */
export function migrateGame(raw: unknown): GameState | null {
  const g = raw as Loose;
  if (!g || typeof g.version !== 'number') return null;
  while (g.version < STATE_VERSION) {
    const m = MIGRATIONS[g.version];
    if (!m) return null;
    m(g);
    g.version += 1;
  }
  if (g.version !== STATE_VERSION) return null;
  normalizeDice(g);
  return validateGame(g as GameState) ? (g as GameState) : null;
}

/** 保存データが今のデータ（職業・カード・装備・敵など）で読めるか。消したデータを参照していたら読まない */
export function validateGame(g: GameState): boolean {
  try {
    if (!SCENARIOS.has(g.scenarioId)) return false;
    for (const tile of g.world?.tiles ?? []) {
      if (tile.f?.kind === 'temple' || tile.f?.kind === 'altar') {
        if (SANCTUARIES.tryGet(tile.f.id)?.kind !== tile.f.kind) return false;
      }
    }
    for (const h of g.heroes) {
      if (!CLASSES.has(h.classId)) return false;
      if (!h.deck.every((c) => CARDS.has(c.cardId))) return false;
      if (!Object.values(h.equipment).every((i) => !i || ITEMS.has(i.itemId))) return false;
    }
    if (!g.heroes.every((h) => [...h.stash, ...h.pouch].every((i) => ITEMS.has(i.itemId)))) return false;
    for (const d of [g.dungeon, ...(g.expeditions ?? []).map((x) => x.dungeon)]) {
      if (!d) continue;
      if (!DUNGEONS.has(d.dungeonId)) return false;
      for (const r of d.rooms) {
        getRoomType(r.type);
        if (!(r.enemies ?? []).every((e) => ENEMIES.has(e.defId))) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
