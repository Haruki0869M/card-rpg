// ===== 保存データの引き継ぎ（古い形の冒険を新しい形に直して読み込む） =====
// 保存データの形を変えた時は、GAME_VERSION（= battle の STATE_VERSION）を1つ上げ、ここに「前の版 → 次の版」の直し方を1つ足す。
// 直し方が無い古い版は読み込まない（タイトルで「つづきから」が出ないだけで、新しく始められる）。
import { CARDS } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { DUNGEONS } from '../../data/dungeons';
import { ENEMIES } from '../../data/enemies';
import { ITEMS } from '../../data/items';
import { SCENARIOS } from '../../data/scenarios';
import { SANCTUARIES } from '../../data/world';
import { getDifficulty, getRoomType } from '../../data/rules';
import type { DungeonRun, GameState } from '../../types';
import { BALANCE } from '../../data/balance';
import { cellKey, dungeonGrid, revealSeen } from './dungeonMap';
import { STATE_VERSION } from '../battle/battle';
import { createRng } from '../rng';
import { rollPetOfferColors } from './pets';
import { heroAbilities } from './hero';
import { addSanctuaries, consolidateSanctuaries } from './world/sanctuaries';

type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const MIGRATIONS: Record<number, (g: Loose) => void> = {
  // v13 → v14: 手動の味方対象が必要になった旧予約だけ、従来の最低HP割合の対象を固定する。
  // v14 → v15: ダンジョンを通路の地図で歩くようになった（第3段階）。地図は部屋のつながりから作り直せるので、
  // 今の部屋（無ければ入口）に立たせ、通った部屋と今の場所のまわりを「見たマス」にする。探索力（部屋の数）は歩数（×2）にする
  14(g) {
    for (const b of [g.battle, ...(g.expeditions ?? []).map((x: Loose) => x.battle)]) if (b) b.version = 15;
    for (const d of [g.dungeon, ...(g.expeditions ?? []).map((x: Loose) => x.dungeon)] as (DungeonRun | undefined)[]) {
      if (!d || !Array.isArray(d.rooms)) continue;
      const grid = dungeonGrid(d);
      const cur = d.currentRoomId ? grid.roomCell.get(d.currentRoomId) : undefined;
      d.pos = cur ? { x: cur.x, y: cur.y, facing: 0 } : { ...grid.start, facing: 0 };
      d.seen = d.rooms.filter((r) => r.cleared).map((r) => grid.roomCell.get(r.id)).filter((c) => !!c).map((c) => cellKey(c!.x, c!.y));
      revealSeen(d);
      if (typeof d.explore === 'number') d.explore *= BALANCE.dungeonStepsPerExplore;
    }
  },
  13(g) {
    for (const b of [g.battle, ...(g.expeditions ?? []).map((x: Loose) => x.battle)]) {
      if (!b) continue;
      b.version = 14;
      const p = b.slotPreview;
      if (!p) continue;
      const a = b.allies.find((a: Loose) => a.id === p.characterId);
      const inst = a?.hand.find((c: Loose) => c.uid === p.cardInstanceId);
      const card = inst && CARDS.tryGet(inst.cardId);
      if (!p.targetId && card?.target === 'ally') p.targetId = [...b.allies].filter((a: Loose) => !a.dead).sort((a: Loose, b: Loose) => a.hp / a.maxHp - b.hp / b.maxHp)[0]?.id;
      if (!p.allyTargetId && card?.secondaryTarget) p.allyTargetId = [...b.allies].filter((a: Loose) => !a.dead).sort((a: Loose, b: Loose) => a.hp / a.maxHp - b.hp / b.maxHp)[0]?.id;
    }
  },
  // v12 → v13: 能力の効果を変えず演出用の出所だけ補う。開始演出は作り直さない。
  12(g) {
    for (const b of [g.battle, ...(g.expeditions ?? []).map((x: Loose) => x.battle)]) {
      if (!b) continue;
      b.version = 13;
      for (const a of b.allies) {
        const hero = g.heroes.find((h: Loose) => h.id === a.id);
        if (!hero) continue;
        const list = heroAbilities(hero);
        for (const ability of a.abilities ?? []) {
          if (ability.source) continue;
          const current = list.find(n => n.name === ability.name && JSON.stringify(n.effect) === JSON.stringify(ability.effect));
          if (current?.source) ability.source = current.source;
        }
      }
    }
  },
  // v11 → v12: 未選択のお供候補だけ毛色を抽選。既存のお供と地図は維持する。
  11(g) {
    const rng = createRng(g.rngState);
    for (const h of g.heroes) if (h.petOffer?.length) h.petOfferColors = rollPetOfferColors(h.petOffer, rng);
    g.rngState = rng.state;
    for (const b of [g.battle, ...(g.expeditions ?? []).map((x: Loose) => x.battle)]) if (b) b.version = 12;
  },
  // v10 → v11: 星読みの使用回数を補完。未予約と追加状態異常は未設定＝なしとして扱う。
  10(g) {
    for (const b of [g.battle, ...(g.expeditions ?? []).map((x: Loose) => x.battle)]) {
      if (!b) continue;
      b.version = 11;
      for (const a of b.allies) a.slotPreviewUsed ??= 0;
    }
  },
  // v9 → v10: 祭壇を2職で共用し、10か所から5か所に統合する。
  9(g) {
    consolidateSanctuaries(g as GameState);
    for (const b of [g.battle, ...(g.expeditions ?? []).map((x: Loose) => x.battle)]) if (b) b.version = 10;
  },
  // v8 → v9: 地図を再生成せず空きマスに神殿・祭壇だけ追加する。
  8(g) {
    if (g.world) addSanctuaries(g as GameState, g.world);
    for (const battle of [g.battle, ...(g.expeditions ?? []).map((x: Loose) => x.battle)]) {
      if (!battle) continue;
      battle.version = 9;
      for (const a of battle.allies) {
        const weapon = g.heroes.find((h: Loose) => h.id === a.id)?.equipment?.weapon;
        const type = weapon && ITEMS.tryGet(weapon.itemId)?.weaponType;
        if (type) a.equippedWeaponType = type;
      }
    }
  },
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
  // v6 → v7: お金・持ち物・道具袋がキャラごとになった。山分けして、品物は順番に配る
  6(g) {
    if (g.battle) g.battle.version = 7;
    for (const x of g.expeditions ?? []) if (x.battle) x.battle.version = 7;
    const hs: Loose[] = g.heroes.filter((h: Loose) => !h.retired);
    const list = hs.length ? hs : g.heroes;
    for (const h of g.heroes) {
      h.gold = 0;
      h.stash = [];
      h.pouch = [];
    }
    const total: number = g.gold ?? 0;
    list.forEach((h: Loose, i: number) => (h.gold = Math.floor(total / list.length) + (i < total % list.length ? 1 : 0)));
    (g.stash ?? []).forEach((it: Loose, i: number) => list[i % list.length].stash.push(it));
    (g.pouch ?? []).forEach((it: Loose, i: number) => list[i % list.length].pouch.push(it));
    delete g.gold;
    delete g.stash;
    delete g.pouch;
  },
  // v7 → v8: ダンジョンのパーティも世界マップの手番の順番で動く（探索力）。今の手番がダンジョンなら判定から
  7(g) {
    if (g.battle) g.battle.version = 8;
    for (const x of g.expeditions ?? []) {
      if (x.battle) x.battle.version = 8;
      if (x.dungeon) x.dungeon.explore = null;
    }
    const w = g.world;
    if (w && !w.turn) {
      const first = g.heroes.find((h: Loose) => h.hp > 0 && !h.retired);
      w.turn = first?.id ?? '';
      w.acted = [];
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
