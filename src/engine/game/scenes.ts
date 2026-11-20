// ===== 場面（世界マップと、ダンジョンに入ったキャラたちの場面。M3-C） =====
// ダンジョンの中は Expedition に入れておき、その場面の操作（SCENE コマンド）の間だけ冒険の dungeon / battle などに載せて動かす。
// 画面は viewOf で「その場面を載せた冒険」を作って表示する（画面の部品は今までどおり game.mode などを読むだけ）。
import type { Expedition, GameCommand, GameState, PlayerId } from '../../types';

/** 場面ごとに持つ項目 */
export const SCENE_FIELDS = ['mode', 'party', 'dungeon', 'battle', 'reward', 'chest', 'event', 'battleInfo', 'battleBackground', 'encounter', 'town', 'shrine', 'sanctuary', 'vote'] as const;
type SceneField = (typeof SCENE_FIELDS)[number];

/** ダンジョンの場面にいる時の mode（これ以外になったら場面は終わり） */
export const EXPEDITION_MODES = new Set(['dungeon', 'battle', 'reward', 'chest', 'event', 'rest', 'cleared']);

/** 世界マップの場面のID */
export const WORLD_SCENE = 'world';

export const findExpedition = (game: GameState, id: string) => game.expeditions?.find((x) => x.id === id);

/** その場面を載せた冒険（表示用。元の冒険は変えない） */
export function viewOf(game: GameState, scene: string): GameState {
  const exp = scene === WORLD_SCENE ? undefined : findExpedition(game, scene);
  if (!exp) return game;
  const v = mount({ ...game }, exp);
  // 表示・判断用に「どの場面か」も付ける（保存はしない）
  v.activeScene = exp.id;
  return v;
}

/** 場面を冒険に載せる（場面の項目を差し替える） */
export function mount(game: GameState, exp: Expedition): GameState {
  for (const f of SCENE_FIELDS) (game as unknown as Record<SceneField, unknown>)[f] = undefined;
  game.mode = exp.mode;
  game.party = exp.heroes;
  game.dungeon = exp.dungeon;
  game.battle = exp.battle;
  game.reward = exp.reward;
  game.chest = exp.chest;
  game.event = exp.event;
  game.battleInfo = exp.battleInfo;
  game.battleBackground = exp.battleBackground;
  game.vote = exp.vote;
  return game;
}

/** 冒険に載っている場面の項目を、場面に戻す */
export function unmount(game: GameState, exp: Expedition) {
  exp.mode = game.mode;
  exp.heroes = game.party ?? exp.heroes;
  exp.dungeon = game.dungeon;
  exp.battle = game.battle;
  exp.reward = game.reward;
  exp.chest = game.chest;
  exp.event = game.event;
  exp.battleInfo = game.battleInfo;
  exp.battleBackground = game.battleBackground;
  exp.vote = game.vote;
}

export const saveSceneFields = (game: GameState) => Object.fromEntries(SCENE_FIELDS.map((f) => [f, game[f]])) as Pick<GameState, SceneField>;
export function restoreSceneFields(game: GameState, saved: Pick<GameState, SceneField>) {
  for (const f of SCENE_FIELDS) (game as unknown as Record<SceneField, unknown>)[f] = saved[f];
}

/** その操作をしたプレイヤー（場面の中の操作・戦闘の操作もたどる。だれでもない操作は undefined） */
export function commandPlayer(cmd: GameCommand): PlayerId | undefined {
  if (cmd.type === 'SCENE') return commandPlayer(cmd.command);
  if (cmd.type === 'BATTLE') return 'playerId' in cmd.command ? cmd.command.playerId : undefined;
  return cmd.playerId;
}

/** 場面の中の操作をほどく（SCENE の中身と、その場面のID） */
export function unwrapCommand(cmd: GameCommand): {
  scene: string;
  command: GameCommand;
} {
  return cmd.type === 'SCENE' ? { scene: cmd.scene, command: cmd.command } : { scene: WORLD_SCENE, command: cmd };
}

/** そのキャラがいる場面のID */
export const sceneOfHero = (game: GameState, heroId: string) => game.expeditions?.find((x) => x.heroes.includes(heroId))?.id ?? WORLD_SCENE;
