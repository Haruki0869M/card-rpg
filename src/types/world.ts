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
  /**
   * 移動のサイコロのボーナス（段階6a。街道 = +1）。この地形に立って移動のサイコロを振ると足される。
   * 広い地図（ScenarioMapDef.lanes があり、保存の地図がその大きさの時）だけで使う。前の幅の地図では足さない
   */
  moveDiceBonus?: number;
  /**
   * 潮のマス（シナリオ3の作り直し §3-1）: この潮の間だけ開く（'high' = 満ち潮〔朝・昼〕/ 'low' = 引き潮〔夕方・夜〕。world/tide.ts）。
   * moveCost は 0 のまま（地図の生成・敵・陸の歩ける所の計算では今までどおり「通れない」= 何も置かれず、敵も入らない）。
   * 移動の計算（hex.ts moveCostOf）だけが、開いている間は移動力1を返す。閉じていても、入る向きだけ閉じる（オーナーの決定 6-A）:
   * 潮のマスの上からはいつでも出られ、潮の首の盆地・入り江の中（Tile.tideIn）から首へもいつでも出られる
   */
  tide?: 'high' | 'low';
  /** 潮のマスが開いている間も、船が要る（潮の水道。船で shipCost〔既定1〕）。省略は歩いて渡れる（干潟） */
  tideShip?: boolean;
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
  /** 薬草の群生地（段階6a）の数。ScenarioMapDef.prefer.herb の帯に置く */
  herbs?: number;
}

/** 帯（段階6a）: 列の範囲に名前と地形の出やすさの倍率を付ける。地域の割合に掛け合わせる（書いていない地形は1倍） */
export interface LaneDef {
  id: string;
  name: string;
  cols: [number, number];
  terrain: Record<string, number>;
  // ---- 3つの道（2026-11-14・docs/tasks/three-roads-plan.md）。省略は今までどおり（1倍・0）----
  /** 帯の印（絵文字）と、行く前に見せる短い説明（マスの説明・見取り図の札） */
  mark?: string;
  hint?: string;
  /** 見取り図の札の短い言葉（1行。省略は hint） */
  tag?: string;
  /** 徘徊する敵が湧くマスの重み（地域の中で。省略 1）。敵の総数は変えず、どの帯に出るかだけを変える */
  spawnWeight?: number;
  /** この帯に湧いた徘徊する敵のレベルの加算（省略 0） */
  enemyLevel?: number;
  /** 夜の野営の夜襲の確率の倍率（省略 1） */
  ambush?: number;
  /** この帯の宝箱の良さ: 「奥の地域」の段を何段先にするか（省略 0） */
  chestDepth?: number;
  /**
   * この帯の寒さ・暑さの倍率（シナリオ2の作り直し・docs/tasks/scenario2-rework-plan.md §2-1。省略 1）。
   * 地形か地域の寒さ・暑さがあるマスだけに掛ける（ダメージの最大HPの割合 × これ）。0 以下ならその帯では寒さ・暑さを受けない。
   * 広い地図（isWideMap）の時だけ使う。前の幅の地図（古い保存）では掛けない
   */
  climate?: number;
  /**
   * この帯には祠を置かない（シナリオ2の作り直し §2-1: 西「凍った湖の近道」は回復の場所が無い）。
   * 祠が「多く置く帯」から外れた時に、この帯のマスを候補から除く（ほかに空きが無ければ置く）。広い地図だけ。省略は今までどおり
   */
  noShrine?: boolean;
}

/**
 * 仕切り（段階6a）: 帯の間に置く、通れない地形の列。六角のマスは奇数の行が半マス右にずれているので、
 * 偶数の行は even 列・奇数の行は odd 列に置くと、すき間の無い1本の壁になる（even = odd + 1 で、ほぼまっすぐ）。
 * rows の中から gaps 個の行を Rng で選んで切れ目（峠・橋）にする（その地域の一番多い陸の地形）。道のマスは壁にしない
 */
export interface BarrierDef {
  even: number;
  odd: number;
  rows: [number, number];
  terrain: string;
  gaps: number;
  /**
   * 潮の切れ目（シナリオ3の作り直し §3-1）: 切れ目のうち count 個を、潮の地形（terrain。例: 潮の水道・干潟）にする。
   * 乱数は引かない（選んだ切れ目を上から並べ、2つ目・4つ目…の順に潮にする）。いつも通れる切れ目を必ず1つは残す。
   * 仕切りと盆地・半島を全部作り終えてから置く（後の処理で陸に戻されないように）。省略は今までどおり
   */
  tideGaps?: { terrain: string; count: number };
}

/**
 * 寄り道の地形（段階6a）。at = 中のマス（宝箱か祠を必ず置く）。
 * basin（盆地）: まわりの6マスを wall の地形で囲み、open の向きの1マスだけを入口にする。
 * peninsula（半島）: at と、open の向きの隣（首）のまわりを wall の地形（湖）にする。首の先が岸。
 * 向きは 0=右・1=右上・2=左上・3=左・4=左下・5=右下（hex.ts の neighbors と同じ順）
 */
export interface PocketDef {
  kind: 'basin' | 'peninsula';
  at: [col: number, row: number];
  open: number;
  wall: string;
  content: 'chest' | 'shrine';
  /**
   * 入口（首）の地形（シナリオ3の作り直し §3-1。例: 干潟・潮の水道）。省略は今までどおり（その地域の陸）。
   * 首を潮の地形にした時は、中のマスに Tile.tideIn を付ける（中から首へは、潮が閉じていても出られる）
   */
  neck?: string;
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
  // ---- 広い地図（段階6a。overhaul-plan-v2 §2）。無いシナリオは今までどおり ----
  /** 帯（西・中央・東など）。あると「広い地図」: 街道ボーナス・帯に合わせた置き方を使う */
  lanes?: LaneDef[];
  /** 街道の骨格（通る点の並び。町と最後のダンジョンを結ぶ）。ほかの施設は、一番近い道から脇道でつなぐ */
  highway?: [col: number, row: number][];
  barriers?: BarrierDef[];
  pockets?: PocketDef[];
  /** 置く物を多く置く帯（帯の id）。tower は塔1つずつの帯（下から順） */
  /** randomDungeon は、配列なら地域の randomDungeons の1つずつの帯（段階7a: 西と東に1つずつ） */
  /** chest は宝箱を多く置く帯（3つの道・2026-11-14） */
  prefer?: { shrine?: string; herb?: string; randomDungeon?: string | string[]; altar?: string; tower?: string[]; chest?: string };
  /** 地域の herbs の数だけ置く「回復のマス」のイベントの id（シナリオ2の作り直し §2-1。省略は薬草の群生地 herbField） */
  herbEvent?: string;
  /**
   * このシナリオに出る災厄の id の一覧（シナリオ2の作り直し §2-2）。省略は、共通の災厄とそのシナリオだけの災厄（区切り3b。シナリオ1の地図は今の5体を書く）。
   * 選ぶ時は SCOURGES.all の順のまま、一覧に無い物を除くだけ（シナリオ1の候補と乱数の順番は変わらない）。災厄は広い地図だけに出る
   */
  scourges?: string[];
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
  /** 使い終わった（宝箱・イベント・祠。ランダムダンジョンは「踏破済み」= もう入れない。段階7a） */
  used?: boolean;
  /** ランダムに置いた宝箱の見た目 */
  chest?: { rarity: Rarity; locked: boolean };
  /** ランダムダンジョンのテーマ（段階7a。地図を作る時に決める。古い保存には無く、初めて入る時に決める） */
  theme?: string;
}

export interface Tile {
  /** 地形ID */
  t: string;
  /** 地域の番号（ScenarioMapDef.regions の index） */
  r: number;
  f?: MapFeature;
  /** 霧が晴れている */
  seen: boolean;
  /**
   * 潮の首の盆地・入り江の中のマス（シナリオ3の作り直し §3-1・オーナーの決定 6-A）。ここから隣の潮のマスへは、潮が閉じていても出られる
   * （入る向きだけ閉じる。閉じ込められない）。無ければ今までどおり（古い保存・ほかのシナリオには付かない）
   */
  tideIn?: true;
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
  /** 災厄の中ボス（段階7b・overhaul-plan-v2 §3）の ID。動かない。生きている間、世界に悪さをする */
  scourge?: string;
}

/**
 * 災厄の中ボス（段階7b・overhaul-plan-v2 §3）。src/content/common/scourges/ に1体ずつ置く（自動で登録）。
 * 悪さは「種類＋数字」で書く（名前や ID で分岐しない）。生きている災厄の悪さは足し合わせる（world/scourges.ts の scourgeCurse）
 */
export interface ScourgeDef {
  id: string;
  order?: number;
  /** 名前（強欲の盗賊王）と、札に出す短い名前（盗賊王） */
  name: string;
  short: string;
  /** 災厄の本体の敵ID / 取り巻きの敵ID（前から順に、2人まで=2体・4人=3体） */
  boss: string;
  minions: string[];
  /** 生きている間の悪さ。shopPrice = 町の店の値段 +N% / corruptionPerTurn = 世界マップの番の侵食度 +N% / campHeal = 野営のHPの回復の倍率 / nightLevel = 夜の敵のレベル +N /
   *  battleBurn = 戦闘の開始時、味方全員に「火傷」N（段階7c: 業火の魔人） /
   *  シナリオ2の作り直し 区切り3a（docs/tasks/scenario2-rework-plan.md §2-2・§8-1）:
   *  coldMul = 寒さのダメージの倍率（寒さだけ。帯の倍率と掛け算。白狼王）/ buryRoad = 街道が雪に埋もれ、街道の移動ボーナスが無くなる（湖の氷などほかの地形は残る。凍て鐘の亡霊）/
   *  visionDown = 昼も夜もキャラの視界 −N（最低1マス。灯を喰らう影） */
  curse: { shopPrice?: number; corruptionPerTurn?: number; campHeal?: number; nightLevel?: number; battleBurn?: number; coldMul?: number; buryRoad?: boolean; visionDown?: number };
  /**
   * 札に出す悪さの短い文（店+25%）と、知らせ・説明の文。
   * 文の中の「侵食度」と短い「侵食」（TERMS.corruption）は、画面に出す時にそのシナリオの悪化の名前（corruptionName。シナリオ2は「冬の深さ」）に置き換わる（engine の scourgeText）
   */
  curseShort: string;
  curseText: string;
  /**
   * 倒した時の報酬。gold = 戦った全員で山分け / corruption = 侵食度を下げる量（寄り道の浄化とは別） / elixir = 秘薬の数 /
   * freeShop = 町の店の品（装備・消耗品）を1つ無料でもらえる券の数（パーティみんなの物。2026-11-14 盗賊王の 300G の代わり）
   */
  reward: { gold?: number; corruption?: number; elixir?: number; freeShop?: number };
  /** 専用の装備（必ず落とす。ItemDef.source = 'scourge'。シナリオの伝説品を移した物は ItemDef.scourgeGear = この災厄の ID） */
  gear: string;
  /** 倒した時の文（店の値段が元に戻った） */
  clearText: string;
  /**
   * 災厄の加護（2026-11-14 寄り道の値打ち 柱1）: 生きている間、鍵と最後のダンジョンのボス・中ボスの戦闘に足される決まり（HP・攻撃の倍率は使わない）。
   * 保存しない（生きている災厄から毎回求める）。name = 「用心棒」など / text = 何が起きるか（札・長押しに出す）
   */
  boon: ScourgeBoon;
  /** 出た時の文（物語の窓に出す。1〜2行） */
  appearText: string;
}

/**
 * 災厄の加護の種類（world/scourgeBoons.ts が戦闘に付ける）:
 * bodyguard = 戦闘の始めに手下（enemy）が1体加わる / regen = 大物が敵の番の始めに最大HPの pct% 回復（呪い・癒し封じで減る）/
 * huntFirst = 大物の最初の予告が「手負い狙い」（action = 共通の加護の行動のID）/ breakWard = 大物への最初の BREAK が1回だけ効かない /
 * phaseBurn = 大物が段階の境目を越えるたび、味方全員に火傷 amount /
 * シナリオ2の作り直し 区切り3a（docs/tasks/scenario2-theme-scourge-proposal.md §3・§4・§7。オーナーの返事 4・5・7 = A）:
 * frostBreath = 戦闘の始め（1ターン目が始まった後）に、味方1人（戦闘の乱数で選ぶ）に status を amount。戦闘に出る味方が1人なら代わりに soloStatus（状態異常を防ぐ能力で防げる）/
 * bellToll = every ターンごと（every の倍数のターン）の「鐘の番」に、大物の単体攻撃が、狙われた味方のほかの全員にも pct% 響く（ブロックで防げる。属性の状態異常は付かない）/
 * darkVeil = 大物の最初の予告の名前と数字が画面に見えない（種類と大技かどうかは見える）。味方のだれかが seeItems の装備を着けている・見破った大物には掛からない
 */
export type ScourgeBoon = { name: string; text: string } & (
  | { kind: 'bodyguard'; enemy: string }
  | { kind: 'regen'; pct: number }
  | { kind: 'huntFirst'; action: string }
  | { kind: 'breakWard' }
  | { kind: 'phaseBurn'; amount: number }
  | { kind: 'frostBreath'; status: string; soloStatus: string; amount: number }
  | { kind: 'bellToll'; every: number; pct: number }
  | { kind: 'darkVeil'; seeItems: string[] }
);

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
  /**
   * 温泉で温まったキャラ（キャラID → 効き目の最後のワールドターン。シナリオ2の作り直し §8-2）。そのターンの終わりまで寒さを受けない。
   * 「入った時から次の朝まで」= その日の夜の最後のターンまで【提案】。効き目が切れた印は寒さの処理で消す。無ければ空（古い保存）
   */
  warm?: Record<string, number>;
  /** 船を持っている（K4 段3。パーティ共有。あると海のマスを進める） */
  ship?: boolean;
  /**
   * 潮が止まっている（シナリオ3の作り直し・オーナーの決定 6-A）: あれば、時間帯にかかわらず、この潮のまま（world/tide.ts tideNow）。
   * 災厄「渦潮の大海魔」の悪さ（次の区切り）が、出た時の潮を入れる口。無ければ時間帯で決まる（古い保存も）
   */
  tideFrozen?: 'high' | 'low';
  /** 町の品揃え（町ID → 売り物）。訪れた時に作り、ワールドターンが一定進むと入れ替わる */
  shops: Record<string, ShopStock>;
  /** 画面に出す物語（冒頭・地域の紹介・エンディング） */
  story?: { title: string; lines: string[] };
  /**
   * 次に出す物語の窓（回1）: 物語の窓が出ている時に来た知らせ（災厄が現れた・通り過ぎた時）は、後ろに足さずにここに並べ、
   * 今の窓を閉じた後に1つずつ出す。無ければ空（古い保存データは無いまま）
   */
  storyQueue?: { title: string; lines: string[] }[];
  /**
   * 物語の窓の版（点検 2026-11-13 F6）: 出ている窓を閉じた時・出ている窓の中身が変わった時に1増える。
   * 「つづける」はこの番号を持って送り、番号が違えば（もう閉じた窓への押し）何もしない。無ければ 0（古い保存データ）
   */
  storyVer?: number;
  /** 時間で消える出現スポット（段階6・v17）。無ければ空 / 次に出るワールドターン / 次の番号 */
  spawns?: TimedSpawn[];
  nextSpawnAt?: number;
  nextSpawnId?: number;
  /** 同行の誘い（誘われたキャラ → 誘ったキャラ）と、承知した同行（同じ形）。手番が変わると消える */
  invites?: Record<string, string>;
  follow?: Record<string, string>;
  /**
   * 災厄の中ボス（段階7b）: 出た回数（節目の数。古い保存は無く、最初のワールドターンの終わりに「もう越えた節目の数」にする）と、
   * 出た災厄の ID（同じ種類は2回出ない）。広い地図だけで使う
   */
  scourgeCount?: number;
  scourgesMet?: string[];
  /**
   * 見破り（2026-11-14 寄り道の値打ち 柱2）: ランダムダンジョンの主を倒して見破った、鍵と最後のダンジョンのID（そのボスの大技と開幕の一手は、完全成功だけで崩れる）。
   * 無ければ空（古い保存）
   */
  insight?: string[];
  /** 盗賊王の無料券（町の店の装備・消耗品を1つ無料。パーティみんなの物。2026-11-14）。無ければ0 */
  freeShop?: number;
}

export interface ShopStock {
  refreshedAt: number;
  /** featured = 必ず並ぶ品（BALANCE.shopFeatured。3つ目の地域の町の「属性の付与」の装飾品） */
  items: { kind: 'item'; item: ItemInstance; price: number; sold?: boolean; featured?: true }[];
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
