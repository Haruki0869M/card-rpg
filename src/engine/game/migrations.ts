// ===== 保存データの引き継ぎ（古い形の冒険を新しい形に直して読み込む） =====
// 保存データの形を変えた時は、GAME_VERSION（= battle の STATE_VERSION）を1つ上げ、ここに「前の版 → 次の版」の直し方を1つ足す。
// 直し方が無い古い版は読み込まない（タイトルで「つづきから」が出ないだけで、新しく始められる）。
import { CARDS } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { DUNGEONS } from '../../data/dungeons';
import { ENEMIES } from '../../data/enemies';
import { ITEMS } from '../../data/items';
import { SCENARIOS } from '../../data/scenarios';
import { getDifficulty, getRoomType } from '../../data/rules';
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
  // v4 → v5: 命の灯火（spec §11.4）が増えた。M2 までの冒険は仮の拠点のまま続ける
  4(g) {
    g.lives = getDifficulty(g.difficulty).lives;
    if (g.battle) g.battle.version = 5;
  },
  // v5 → v6: ダンジョンは世界マップと別の場面（expeditions）になった。世界マップでダンジョンの中にいた冒険は、場面に移す
  5(g) {
    if (g.battle) g.battle.version = 6;
    if (!g.world || !g.dungeon) return;
    const heroes: string[] = g.party ?? g.heroes.filter((h: Loose) => h.hp > 0 && !h.retired).map((h: Loose) => h.id);
    g.expeditions = [
      {
        id: 'x1',
        heroes,
        mode: g.mode,
        dungeon: g.dungeon,
        battle: g.battle,
        reward: g.reward,
        chest: g.chest,
        event: g.event,
        battleInfo: g.battleInfo,
        battleBackground: g.battleBackground,
      },
    ];
    g.nextExpeditionId = 2;
    for (const k of ['dungeon', 'battle', 'reward', 'chest', 'event', 'battleInfo', 'battleBackground', 'party']) delete g[k];
    g.mode = 'world';
    // 世界マップに残っているキャラの手番から（全員ダンジョンなら止まる）
    const onMap = g.heroes.filter((h: Loose) => h.hp > 0 && !h.retired && !heroes.includes(h.id));
    if (!onMap.some((h: Loose) => h.id === g.world.turn)) g.world.turn = onMap[0]?.id ?? '';
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
