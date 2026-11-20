// ===== 凍え（ランダムダンジョンのテーマ「🧊 氷漬けの宝物庫」。2026-11-14 シナリオ2の作り直し） =====
// docs/tasks/scenario2-theme-scourge-proposal.md §1 A案（オーナーの OK）:
// - 部屋に入るたびに凍え+1。その場の全員（倒れていないキャラ）のHPが「凍え × 最大HPの hpPercent%」減る（HPは1で止まる。切り上げ・最低1。地図の寒さと同じ式）
// - 休憩の部屋（焚き火）に入ると、凍えは0（その部屋の寒さは受けない）。その後はいつもの休憩
// - 奥の「氷漬けの箱」の格は、その部屋に入った時の凍え（+1 した後）で決まる。乱数は使わない
// 凍えはダンジョンの状態（DungeonRun.chill）に残るので、保存して再開しても・オンラインでも同じ。だれかの入力を待つ所は増えない
import { CHEST_NAME } from '../../data/terms';
import { getRoomType } from '../../data/rules';
import type { DungeonRun, DungeonThemeDef, GameState, Rarity, Room } from '../../types';
import { addLog } from './common';
import { dungeonTheme } from './dungeon';
import { heroMaxHp } from './hero';
import { sceneHeroes } from './heroes';

/** そのダンジョンの凍えの決まり（テーマに chill が無ければ undefined） */
export const chillRule = (run: Pick<DungeonRun, 'theme'> | undefined): NonNullable<DungeonThemeDef['chill']> | undefined => dungeonTheme(run?.theme)?.chill;

/** 今の凍え（古い保存・凍えの無いテーマは 0） */
export const chillOf = (run: Pick<DungeonRun, 'chill'> | undefined) => run?.chill ?? 0;

/** 焚き火の部屋か（凍えが0に戻る部屋） */
const warmsUp = (room: Pick<Room, 'type'>) => getRoomType(room.type).behavior === 'rest';
/** 氷漬けの箱の部屋か（テーマの奥の部屋で、動きが宝箱） */
const isChillChest = (run: Pick<DungeonRun, 'theme'>, room: Pick<Room, 'type'>) => dungeonTheme(run.theme)?.fixedRoom === room.type && getRoomType(room.type).behavior === 'chest';

/** 凍え → 氷漬けの箱の格（決まりの表で、min 以上の最初の物） */
export function chillChestRarity(rule: NonNullable<DungeonThemeDef['chill']>, chill: number): Rarity {
  return (rule.chest.find((c) => chill >= c.min) ?? rule.chest[rule.chest.length - 1]).rarity;
}

/** その部屋に入った時の凍え（焚き火なら0、ほかは今の凍え+1） */
export const chillAfterEntering = (run: Pick<DungeonRun, 'chill'>, room: Pick<Room, 'type'>) => (warmsUp(room) ? 0 : chillOf(run) + 1);

/** 凍えでHPが減る割合（%） */
export const chillHpPercent = (rule: NonNullable<DungeonThemeDef['chill']>, chill: number) => chill * rule.hpPercent;

/**
 * 部屋に入った時（部屋の動きの前）: 凍えを数え、HPを減らし、氷漬けの箱なら格を決める。凍えの無いダンジョンでは何もしない（乱数は引かない）
 */
export function applyRoomChill(game: GameState, room: Room) {
  const run = game.dungeon;
  const rule = chillRule(run);
  if (!run || !rule) return;
  const chill = chillAfterEntering(run, room);
  const before = chillOf(run);
  run.chill = chill;
  if (warmsUp(room)) {
    if (before > 0) addLog(game, `🔥焚き火で体が温まった。凍えが消えた（凍え${before} → 0）`);
    return;
  }
  const pct = chillHpPercent(rule, chill);
  const hurt: string[] = [];
  for (const h of sceneHeroes(game)) {
    if (h.hp <= 0) continue;
    const dmg = Math.max(1, Math.ceil((heroMaxHp(h) * pct) / 100));
    const lost = Math.min(dmg, Math.max(0, h.hp - 1));
    if (lost <= 0) continue;
    h.hp -= lost;
    hurt.push(`${h.name}−${lost}`);
  }
  addLog(game, `🧊凍え${chill}: 寒さでHPが${pct}%減った${hurt.length ? `（${hurt.join('・')}）` : ''}。HPは1で止まる`);
  if (isChillChest(run, room)) {
    const rarity = chillChestRarity(rule, chill);
    room.chest = { rarity, locked: false };
    addLog(game, `🧊凍え${chill}で着いた。氷漬けの箱は${CHEST_NAME[rarity]}だ`);
  }
}

/** 画面の帯: 今の凍えと、次の部屋で減る割合（凍えの無いダンジョンは undefined） */
export function chillStatus(run: DungeonRun | undefined): { chill: number; text: string; note: string } | undefined {
  const rule = chillRule(run);
  if (!run || !rule) return undefined;
  const chill = chillOf(run);
  const next = chill + 1;
  const grades = rule.chest
    .slice()
    .reverse()
    .filter((c) => c.min > 0)
    .map((c) => `${c.min}で${CHEST_NAME[c.rarity]}`)
    .join('・');
  return {
    chill,
    text: `🧊凍え${chill}・次の部屋でHP−${chillHpPercent(rule, next)}%`,
    note: `🔥焚き火で凍えは0に戻る。奥の氷漬けの箱は、凍えているほど良い（凍え${grades}）`,
  };
}

/** 扉のボタンの一言（その扉に入ったら凍えがどうなるか。凍えの無いダンジョンは undefined） */
export function chillDoorNote(run: DungeonRun | undefined, room: Room): string | undefined {
  const rule = chillRule(run);
  if (!run || !rule) return undefined;
  if (warmsUp(room)) return '🔥凍えが0に（寒さなし）';
  const chill = chillAfterEntering(run, room);
  const hp = `凍え${chill}：HP−${chillHpPercent(rule, chill)}%`;
  return isChillChest(run, room) ? `${hp}・今なら${CHEST_NAME[chillChestRarity(rule, chill)]}` : hp;
}

/** 先読みの中身（氷漬けの箱は、今のまま着いた時の格。それ以外の部屋は undefined） */
export function chillChestPreview(run: DungeonRun | undefined, room: Room): string | undefined {
  const rule = chillRule(run);
  if (!run || !rule || !isChillChest(run, room)) return undefined;
  return `${CHEST_NAME[chillChestRarity(rule, chillAfterEntering(run, room))]}（今の凍えのまま着いた時）`;
}
