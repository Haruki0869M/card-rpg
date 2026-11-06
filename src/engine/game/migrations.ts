// ===== 保存データの引き継ぎ（古い形の冒険を新しい形に直して読み込む） =====
// 保存データの形を変えた時は、GAME_VERSION（= battle の STATE_VERSION）を1つ上げ、ここに「前の版 → 次の版」の直し方を1つ足す。
// 直し方が無い古い版は読み込まない（タイトルで「つづきから」が出ないだけで、新しく始められる）。
import { CARDS } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { DUNGEONS } from '../../data/dungeons';
import { ENEMIES } from '../../data/enemies';
import { ITEMS } from '../../data/items';
import { SCENARIOS } from '../../data/scenarios';
import { getRoomType } from '../../data/rules';
import type { GameState } from '../../types';
import { STATE_VERSION } from '../battle/battle';
import { heroAbilities } from './hero';

type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const MIGRATIONS: Record<number, (g: Loose) => void> = {
  // v3 → v4: 特殊能力の書き方が「きっかけ＋条件＋効果」に変わった。戦闘中のキャラの装備の能力を作り直す
  3(g) {
    if (g.battle) {
      for (const a of g.battle.allies) {
        const h = g.heroes.find((x: Loose) => x.id === a.id);
        const abilities = h ? heroAbilities(h) : [];
        if (abilities.length) a.abilities = abilities;
        else delete a.abilities;
      }
      g.battle.version = 4;
    }
  },
};

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
  return validateGame(g as GameState) ? (g as GameState) : null;
}

/** 保存データが今のデータ（職業・カード・装備・敵など）で読めるか。消したデータを参照していたら読まない */
export function validateGame(g: GameState): boolean {
  try {
    if (!SCENARIOS.has(g.scenarioId)) return false;
    for (const h of g.heroes) {
      if (!CLASSES.has(h.classId)) return false;
      if (!h.deck.every((c) => CARDS.has(c.cardId))) return false;
      if (!Object.values(h.equipment).every((i) => !i || ITEMS.has(i.itemId))) return false;
    }
    if (![...g.stash, ...g.pouch].every((i) => ITEMS.has(i.itemId))) return false;
    if (g.dungeon) {
      if (!DUNGEONS.has(g.dungeon.dungeonId)) return false;
      for (const r of g.dungeon.rooms) {
        getRoomType(r.type);
        if (!(r.enemies ?? []).every((e) => ENEMIES.has(e.defId))) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
