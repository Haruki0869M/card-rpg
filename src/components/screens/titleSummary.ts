// ===== タイトルの「つづきから」の説明（今いる場所・所持金の合計）。表示だけの純粋な関数（フェーズ3 項目3） =====
import { getScenario } from '../../data/scenarios';
import { TOWNS } from '../../data/world';
import type { GameState } from '../../types';

/** 場面の名前（GameState.mode） */
const SCENE: Record<string, string> = {
  hub: '冒険の拠点',
  world: '世界マップ',
  encounter: '世界マップ',
  town: '町',
  shrine: '祠',
  sanctuary: '聖堂',
  dungeon: 'ダンジョン探索中',
  battle: '戦闘中',
  reward: '戦闘の報酬',
  chest: '宝箱',
  event: 'イベント',
  rest: '休憩所',
  cleared: 'ダンジョン制覇',
  gameover: '全滅',
  ending: 'エンディング',
};

/** 今いる場所の名前（町・ダンジョン・世界マップの地域。分からなければ空） */
function placeName(game: GameState): string {
  if (game.mode === 'town' && game.town) return TOWNS.tryGet(game.town.townId)?.name ?? '';
  const dungeon = game.dungeon ?? game.expeditions?.find((e) => e.dungeon)?.dungeon;
  if (game.dungeon || (game.world && game.mode !== 'world' && game.mode !== 'encounter' && dungeon)) return dungeon?.name ?? '';
  const w = game.world;
  const map = getScenario(game.scenarioId)?.map;
  if (!w || !map) return '';
  const h = game.heroes.find((x) => x.hp > 0) ?? game.heroes[0];
  const tile = h ? w.tiles[w.pos[h.id]] : undefined;
  return tile ? (map.regions[tile.r]?.name ?? '') : '';
}

/** 場面と場所（例: 「世界マップ・翠の森」）。確認の窓にも使う */
export function sceneText(game: GameState): string {
  const scene = SCENE[game.mode] ?? '';
  const place = placeName(game);
  return [scene, place].filter((x, i, a) => x && a.indexOf(x) === i).join('・');
}

/** 「つづきから」の下の1行（例: 「世界マップ・翠の森・所持金の合計 60G」）。先頭に「・」が付かない */
export function continueSummary(game: GameState): string {
  const gold = game.heroes.reduce((n, h) => n + (h.gold ?? 0), 0);
  return [sceneText(game), `所持金の合計 ${gold}G`].filter(Boolean).join('・');
}

/** 上書きの確認の本文 */
export function overwriteText(game: GameState): string {
  const name = getScenario(game.scenarioId)?.name ?? '';
  const where = [name, sceneText(game)].filter(Boolean).join('・');
  return `今の冒険${where ? `（${where}）` : ''}は上書きされて消えます。設定と伝承の書は残ります。`;
}
