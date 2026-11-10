// ===== 世界マップ・町・祠・依頼の型（spec §8・§16・§17） =====
import type { EventOutcome, ItemInstance } from './game';
import type { EncounterSpec, PlayerId, Rarity } from './index';

// ---------- データ（src/content） ----------

/** 地形（spec §8.1）。moveCost 0 は通れない */
export interface TerrainDef {
  id: string;
  order?: number;
  name: string;
  moveCost: number;
  /** マスの色（昼） */
  color: string;
  /** 模様の種類（画面側の TERRAIN_DECOR のキー） */
  decor?: string;
  /** この地形で戦った時の戦闘の背景 */
  background: string;
  /** 寒さ・暑さ（K4 段2）。この地形に立ったまま1ワールドターンが終わると、HPが減る（野営した人は除く） */
  climate?: ClimateDef;
  /** 海（K4 段3）。moveCost は 0 のまま（陸の処理では今までどおり通れない）。船があるパーティだけが shipCost（既定1）で進める */
  sea?: boolean;
  shipCost?: number;
}

/** 寒さ・暑さ。ratio（最大HPの割合）を省略すると BALANCE.climateDamageRatio */
export interface ClimateDef {
  kind: 'cold' | 'hot';
  ratio?: number;
  /** 夜だけの設定（K4。砂漠は昼は暑く夜は寒い）。'none' なら夜は何も起きない。省略は昼夜とも同じ */
  night?: Omit<ClimateDef, 'night'> | 'none';
}

/** 地域（マップの行の範囲。奥ほど敵が強い） */
export interface RegionDef {
  id: string;
  name: string;
  /** 初めて入った時の文章 */
  intro?: string;
  /** マップの行の範囲（0 = 一番上） */
  rows: [number, number];
  /** 地形の出やすさ（地形ID → 重み） */
  terrain: Record<string, number>;
  /** 徘徊する敵の基準レベルと組み合わせ（敵IDの並び） */
  enemyLevel: number;
  encounters: string[][];
  /** レアの敵の組み合わせ（K3）。徘徊する敵を置く時、BALANCE.rareWandererChance% でこの中から置き換える。省略は出ない */
  rareEncounters?: string[][];
  /** 地域全体の寒さ・暑さ（地形の climate が優先） */
  climate?: ClimateDef;
  /** 最初に置く徘徊する敵の数 */
  wanderers: number;
  /** 海のマスに置く徘徊する敵（幽霊船など）の数と組み合わせ（K4 段3） */
  seaWanderers?: number;
  seaEncounters?: string[][];
  /** ランダムに置くもの（数） */
  chests?: number;
  events?: number;
  shrines?: number;
  /** ランダムダンジョン（このダンジョンIDを置く） */
  randomDungeons?: string[];
}

/** マップに固定で置くもの */
export interface FixedFeature {
  kind: FeatureKind;
  /** 町ID・ダンジョンID・祠ID・イベントID など */
  id: string;
  at: [col: number, row: number];
}

export type FeatureKind = 'town' | 'dungeon' | 'shrine' | 'event' | 'chest' | 'landmark' | 'temple' | 'altar' | 'tower';

/** 転職の施設。祭壇の対応先は職の altar と照合する印で指定する。 */
export interface SanctuaryDef {
  id: string;
  kind: 'temple' | 'altar';
  name: string;
  text: string;
  altar?: string;
  /** 共用する祭壇の印。旧保存で統合する施設IDもデータで指定する。 */
  altars?: string[];
  legacyIds?: string[];
  /** 地図の下から上への進行度（0〜1）。近い通り道の空きマスへ置く。 */
  progress: number;
}

export interface SanctuaryVisit extends FacilityVisit {
  sanctuaryId: string;
  tile: number;
  heroId: string;
}

/** 侵食度の段階（spec §8.7） */
export interface CorruptionStage {
  at: number;
  text: string;
  /** 徘徊する敵を何体増やすか / 敵のレベルの加算 / 町を襲撃するか */
  spawn?: number;
  enemyLevel?: number;
  raid?: boolean;
}

export interface ScenarioMapDef {
  width: number;
  height: number;
  start: [col: number, row: number];
  regions: RegionDef[];
  features: FixedFeature[];
  /** 町と町・ダンジョンを結ぶ道の地形（必ず通れる道を作る） */
  roadTerrain: string;
  /** 施設（町・ダンジョンなど）のまわり何マスを、海でなく陸にするか（K4。小さすぎる島で詰まらないように。省略は0） */
  landAround?: number;
  corruptionStages: CorruptionStage[];
}

export interface ScenarioStory {
  opening: string[];
  ending: string[];
  /** 封印の鍵の名前（鍵ID → 名前） */
  keys?: Record<string, string>;
}

/** 町（spec §17） */
export interface TownDef {
  id: string;
  name: string;
  description: string;
  /** 王都など、襲撃されない町 */
  capital?: boolean;
  /** ショップの品揃え（数と格の上限） */
  shop: { cards: number; equipment: number; consumables: number; maxRarity: Rarity; /** いつも売っているもの（アイテムID） */ fixed?: string[] };
  /** 宿屋の値段 / カード削除の値段 */
  innCost: number;
  removeCost: number;
  /** この町の掲示板の依頼 */
  quests?: string[];
}

/** 祠（spec §8.4） */
export interface ShrineDef {
  id: string;
  name: string;
  text: string;
  options: { label: string; outcomes: EventOutcome[]; /** 永続の加護（1人が持てる数に上限） */ permanent?: boolean }[];
}

/** 依頼の目標の種類ごとの数値（src/engine/game/world/objectives/ のファイルが declare module で足す） */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ObjectiveParams {}
export type QuestObjective = { [K in keyof ObjectiveParams]: { kind: K } & ObjectiveParams[K] }[keyof ObjectiveParams];

/** 依頼（spec §17） */
export interface QuestDef {
  id: string;
  title: string;
  text: string;
  /** 達成したら報告する町（省略は受けた町） */
  reportTown?: string;
  objective: QuestObjective;
  reward: EventOutcome[];
  rewardText: string;
}

// ---------- 冒険の状態 ----------

export type TimeOfDay = 'morning' | 'noon' | 'evening' | 'night';

export interface MapFeature {
  kind: FeatureKind;
  id: string;
  /** 使い終わった（宝箱・イベント・祠） */
  used?: boolean;
  /** ランダムに置いた宝箱の見た目 */
  chest?: { rarity: Rarity; locked: boolean };
}

export interface Tile {
  /** 地形ID */
  t: string;
  /** 地域の番号（ScenarioMapDef.regions の index） */
  r: number;
  f?: MapFeature;
  /** 霧が晴れている */
  seen: boolean;
}

/** 時間で消える出現スポット（段階6）: 流れ星の落下地点・さすらいの行商人・黄金のコソ泥 */
export type SpawnKind = 'star' | 'peddler' | 'thief';
export interface TimedSpawn {
  id: string;
  kind: SpawnKind;
  tile: number;
  /** このワールドターンまで残る（次のワールドターンの初めに消える） */
  until: number;
}

/** 徘徊する敵（マップ上に見えている） */
export interface Wanderer {
  id: string;
  tile: number;
  enemies: EncounterSpec['enemies'];
  /** 襲撃の敵（倒せば町を守れる） */
  raidTown?: string;
  /** レアの敵の組（地図に星印で出る。K3） */
  rare?: true;
}

export interface Raid {
  townId: string;
  deadline: number;
}

export interface QuestState {
  id: string;
  /** 受けた町 */
  town: string;
  progress: number;
  done: boolean;
  reported: boolean;
}

export interface WorldState {
  /** 最後の移動（画面で1マスずつ動かす演出用）。seq が変わったら新しい移動 */
  lastMove?: { seq: number; heroes: string[]; path: number[] };
  /** 他の人のキャラと一緒に動く時の、移動先の提案（同行しているキャラの担当が全員同意したら動く） */
  moveProposal?: { heroId: string; to: number; companions: string[]; owners: PlayerId[]; agreed: PlayerId[] };
  /** 倒れているキャラ（キャラID → マス）。同じマスに来た仲間が助け起こせる（M3-C5） */
  downed?: Record<string, number>;
  width: number;
  height: number;
  tiles: Tile[];
  /** キャラの位置（キャラID → マスの番号） */
  pos: Record<string, number>;
  /** 今の手番のキャラ / このワールドターンで行動を終えたキャラ */
  turn: string;
  acted: string[];
  /** 移動力（判定前は null）と、移動のサイコロの結果 */
  move: number | null;
  moveDice?: DiceRoll;
  /** 移動の前にいたマス（逃走で戻る先） */
  prevTile?: number;
  worldTurn: number;
  corruption: number;
  wanderers: Wanderer[];
  nextWandererId: number;
  raids: Raid[];
  fallenTowns: string[];
  savedTowns: string[];
  keys: string[];
  quests: QuestState[];
  visitedRegions: number[];
  /**
   * 交代運転の記録（§4 A）: このワールドターンに動いたキャラ → 動かした手番のキャラ / 交代運転で侵食度が上がった手番のキャラ。
   * ワールドターンの終わりに消える（無ければ空。古い保存データは無いまま始まる）
   */
  movedBy?: Record<string, string>;
  relayCharged?: string[];
  /** このワールドターンに野営して、寒さ・暑さを受けないキャラ（ターンの終わりに消える。K4 段2。無ければ空） */
  sheltered?: string[];
  /** 船を持っている（K4 段3。パーティ共有。あると海のマスを進める） */
  ship?: boolean;
  /** 町の品揃え（町ID → 売り物）。訪れた時に作り、ワールドターンが一定進むと入れ替わる */
  shops: Record<string, ShopStock>;
  /** 画面に出す物語（冒頭・地域の紹介・エンディング） */
  story?: { title: string; lines: string[] };
  /** 時間で消える出現スポット（段階6・v17）。無ければ空 / 次に出るワールドターン / 次の番号 */
  spawns?: TimedSpawn[];
  nextSpawnAt?: number;
  nextSpawnId?: number;
  /** 同行の誘い（誘われたキャラ → 誘ったキャラ）と、承知した同行（同じ形）。手番が変わると消える */
  invites?: Record<string, string>;
  follow?: Record<string, string>;
}

export interface ShopStock {
  refreshedAt: number;
  items: { kind: 'item'; item: ItemInstance; price: number; sold?: boolean }[];
  cards: { cardId: string; heroId: string; price: number; sold?: boolean }[];
}

/** 遭遇（spec §8.5）: 敵のいるマスに入った時の選択 */
export interface EncounterState {
  wandererId: string;
  tile: number;
  /** 移動してきたキャラ */
  heroId: string;
  /** 参加できるキャラ（そのマスと1マス以内） */
  candidates: string[];
  /** 夜襲を受けた（戦うしかない） */
  ambushed?: boolean;
  /** 手番でない人のキャラが「戦闘に加わる」と答えたか */
  joins?: Record<string, boolean>;
  /** 奇襲・逃走の判定の結果 */
  result?: { choice: 'ambush' | 'flee'; heroId: string; results: ('focus' | 'hit' | 'miss')[]; success: boolean };
}

/** 町・祠の中にいる時 */
export interface FacilityVisit {
  members?: string[];
  finished?: string[];
}
export interface TownVisit extends FacilityVisit {
  townId: string;
  heroId: string;
}
export interface ShrineVisit extends FacilityVisit {
  shrineId: string;
  tile: number;
  heroId: string;
  result?: { optionIndex: number; text: string };
}

/** 移動のサイコロ（世界マップは1d6＋ボーナス、ダンジョンは1〜3）。seq = 振るたびに変わる目印（画面の演出を全員で1回だけ出す） */
export interface DiceRoll {
  /** サイコロの面の数（6 か 3） */
  sides: number;
  /** 出た目 */
  face: number;
  /** 足すもの（素早さ・探索の能力・お供など。0 のものは入れない） */
  bonus: { label: string; value: number }[];
  /** 出た目＋ボーナス */
  total: number;
  /** フォーカスで振り直した時の、1回目の目 */
  first?: number;
  /** 振り直したか（振り直しは1回だけ） */
  rerolled?: boolean;
  /** 振ったキャラ（ダンジョン。振り直せるのはこのキャラ） */
  heroId?: string;
  seq: number;
}
