// ===== 漂流物の山（ランダムダンジョンのテーマ「🛶 漂流物の洞」の4行目。2026-11-16 シナリオ3の作り直し） =====
// docs/tasks/scenario3-rework-plan.md §3-3 と「憲章の点検の後の直し」B4（オーナーの OK）:
// - 部屋に入ると、その場の全員（退場していないキャラ）に、それぞれ消耗品の候補を3つ引いて保存する（Hero.flotsam。冒険の乱数・種つき）
// - 候補のうち1つはエピック以上（残りはレア以上）。災厄討ちの秘薬など「出どころが決まった品」（source・scourgeGear）は出さない
// - 選ぶのは本人（FLOTSAM_PICK。heroId のキャラの担当の席）。黄金箱の3択（開け役1人）とは別の形で、だれも待たない。部屋はすぐ片づく
// - 袋が満杯の時は、選んだ品はお金に換わる（addItem のまま）。画面はそれを先に出す（pouchOverflow）
import { ITEMS, getItem } from '../../data/items';
import type { DungeonRun, DungeonThemeDef, GameState, Hero, ItemDef } from '../../types';
import { shuffle, type Rng } from '../rng';
import { addItem, addLog, pouchOverflow } from './common';
import { dungeonTheme, rarityIndex } from './dungeon';
import { newItem } from './loot';
import { sceneHeroes } from './heroes';
import { pouchLimitOf } from './hero';

/** そのダンジョンの漂流物の山の決まり（テーマに flotsam が無ければ undefined） */
export const flotsamRule = (run: Pick<DungeonRun, 'theme'> | undefined): NonNullable<DungeonThemeDef['flotsam']> | undefined => dungeonTheme(run?.theme)?.flotsam;

/** 1つの消耗品が、そのキャラの候補に出せるか（格は見ない） */
function usable(game: Pick<GameState, 'scenarioId' | 'heroes'>, h: Hero, d: ItemDef): boolean {
  if (d.slot !== 'consumable' || d.source || d.scourgeGear) return false;
  if (d.scenario && d.scenario !== game.scenarioId) return false;
  if (d.teamOnly && game.heroes.length < 2) return false;
  // お供のごちそう（お供がいないと使えない）は、お供のいないキャラには出さない【提案】
  if (!h.pet && (d.use ?? []).some((e) => e.kind === 'feedPet')) return false;
  // 1人が持てる数に達している品（不死鳥の羽根）は出さない（選んでもお金に換わるだけなので）【提案】
  if (pouchOverflow(h, d.id)?.why === 'same') return false;
  return true;
}

/** 候補の元（データの順）。epic = エピック以上 / rest = レア以上 */
export function flotsamPools(game: Pick<GameState, 'scenarioId' | 'heroes'>, h: Hero): { epic: string[]; rare: string[] } {
  const list = ITEMS.all.filter((d) => usable(game, h, d));
  return {
    epic: list.filter((d) => rarityIndex(d.rarity) >= 2).map((d) => d.id),
    rare: list.filter((d) => rarityIndex(d.rarity) >= 1).map((d) => d.id),
  };
}

/** そのキャラの候補を引く（エピック以上を epicSlots 個 → 残りをレア以上から。重ならない。並びはデータの順） */
export function rollFlotsam(game: Pick<GameState, 'scenarioId' | 'heroes'>, h: Hero, rule: NonNullable<DungeonThemeDef['flotsam']>, rng: Rng): string[] {
  const { epic, rare } = flotsamPools(game, h);
  const picked = shuffle(epic, rng).slice(0, rule.epicSlots);
  const rest = shuffle(rare.filter((id) => !picked.includes(id)), rng).slice(0, Math.max(0, rule.choices - picked.length));
  const order = ITEMS.all.map((d) => d.id);
  return [...picked, ...rest].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** 部屋に入った時: その場の全員に候補を配る */
export function dealFlotsam(game: GameState, rng: Rng) {
  const rule = flotsamRule(game.dungeon) ?? { choices: 3, epicSlots: 1 };
  for (const h of sceneHeroes(game)) {
    if (h.retired) continue;
    const offer = rollFlotsam(game, h, rule, rng);
    if (offer.length) h.flotsam = offer;
  }
}

/** 候補から1つ選ぶ（FLOTSAM_PICK）。袋が満杯ならお金に換わる */
export function pickFlotsam(game: GameState, h: Hero, index: number): string | undefined {
  const offer = h.flotsam;
  if (!offer?.length) return '漂流物の山で選べる品はありません';
  const id = offer[index];
  if (id === undefined) return 'その品はありません';
  const got = addItem(game, h, newItem(game, getItem(id)), true);
  delete h.flotsam;
  addLog(game, `🛶${h.name}は漂流物の山から${got}を拾った`);
  return undefined;
}

/** 画面用: 候補ごとの名前と、袋に入らない時に換わるお金。袋の今の数と上限 */
export function flotsamView(h: Hero): { items: { itemId: string; overflowGold?: number }[]; pouch: number; limit: number; full: boolean } {
  const pouchLimit = pouchLimitOf(h);
  const items = (h.flotsam ?? []).map((itemId) => ({ itemId, overflowGold: pouchOverflow(h, itemId)?.gold }));
  return { items, pouch: h.pouch.length, limit: pouchLimit, full: h.pouch.length >= pouchLimit };
}
