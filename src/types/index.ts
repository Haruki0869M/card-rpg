// ===== ゲーム全体で使う型定義 =====
// データ（職業・カード・敵）は src/data に、ロジックは src/engine に置く。
// 特定の職業ID・敵IDに依存した分岐はエンジンにも画面にも書かない（spec §2.4）。

export type CardCategory = 'physical' | 'magic' | 'skill';
/** 状態異常のID（src/content の statuses に登録したもの） */
export type StatusId = string;
export type Rarity = 'common' | 'rare' | 'epic' | 'legend';
export type Gender = 'male' | 'female';
export type PlayerId = 'P1' | 'P2' | 'P3' | 'P4';

/** 7つの能力値（spec §6.1） */
export type StatId = 'str' | 'vit' | 'int' | 'per' | 'dex' | 'agi' | 'luk';
export type Stats = Record<StatId, number>;
/** カテゴリごとの成功率補正（%） */
/** 成功率の補正。カードの種類ごと＋能力値ごと（カードが参照する能力値を決めている時に使う） */
export type Affinity = Record<CardCategory, number> & { byStat?: Partial<Record<StatId, number>> };

// ---------- カード ----------

export type CardTarget = 'enemy' | 'self' | 'allEnemies' | 'ally' | 'otherAlly' | 'fallenAlly';

// ---------- 属性（spec §14。火・氷・雷・毒・闇・聖 など） ----------

/** 属性。属性のダメージがHPに当たると、確率で状態異常を与える（完全成功なら必ず） */
export interface ElementDef {
  id: string;
  order?: number;
  name: string;
  color: string;
  /** アイコンの種類（画面側の ELEMENT_ICONS のキー） */
  icon: string;
  /** 与える状態異常と確率（%）・数 */
  status?: string;
  chance?: number;
  amount?: number;
}

// ---------- 効果（カード・敵の行動・消費アイテム・特殊能力で共通の部品。spec §2.4） ----------

/**
 * 効果の対象。
 * target = 選んだ対象（カードの対象の敵 / 敵の行動の対象の味方 / アイテムを使う相手。全体カードなら相手全員）
 * self = 自分 / allies = 自分の側の全員 / otherAllies = 自分以外の自分の側 / foes = 相手の側の全員 / randomFoe = 相手からランダムに1人
 */
export type EffectTarget = 'target' | 'self' | 'allies' | 'otherAllies' | 'foes' | 'randomFoe' | 'lowestAlly' | 'randomAlly' | 'allyTarget' | 'otherFoes' | 'attacker' | /** 今のカードが弱点を突いた敵（最初の1体） */ 'weakHit' | /** 今のカードで支援が成立した味方 */ 'helped';

/**
 * 効果の種類ごとの数値。効果のファイル（src/engine/battle/effects/）が declare module でここに種類を足す。
 * 新しい効果 = ファイルを1つ置くだけで、カード・敵・アイテム・特殊能力のデータから使える
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EffectParams {}

/** 効果1つ（例: { kind: 'damage', amount: 6 } / { kind: 'block', amount: 5, to: 'allies' }） */
export type Effect = { [K in keyof EffectParams]: { kind: K; to?: EffectTarget } & EffectParams[K] }[keyof EffectParams];
export type EffectKind = keyof EffectParams;
/** 互換のための別名 */
export type CardEffect = Effect;

export interface CardTier {
  /** この成功数以上で発動（高い方が優先） */
  minSuccesses: number;
  effects: CardEffect[];
}

export interface CardDef {
  id: string;
  name: string;
  category: CardCategory;
  cost: number;
  slots: number;
  /** 基礎成功率（%） */
  baseChance: number;
  target: CardTarget;
  /** 攻撃と単体支援を組み合わせるカードの、別に選ぶ味方。 */
  secondaryTarget?: 'ally' | 'otherAlly' | 'fallenAlly';
  /** minSuccesses 昇順 */
  tiers: CardTier[];
  /** 報酬・宝箱での出やすさの格（未指定はコモン扱い） */
  rarity?: Rarity;
  /** カードの特殊能力（エピック以上は必ず持つ。このカードを使っている間だけ働く。spec §13.1） */
  trait?: AbilityDef;
  /** 成功率の基準にする能力値（例: 刀の見切り＝感知）。無ければカードの種類（物理＝力・魔法＝知力・スキル＝器用） */
  stat?: StatId;
  /** 報酬のスマート抽選に使う印（効果から自動で付く印に足す。例: 'combo'） */
  tags?: string[];
  /** 使用後はこの戦闘の間だけ山札から除く（冒険の山札は変えない） */
  exhaust?: boolean;
  /** 武器種カード: この武器種を装備できるジョブの報酬に出る（K1） */
  weaponType?: string;
  /** ほかにも置く武器種（1枚のカードを複数の武器種に置く。区切りD） */
  weaponTypes?: string[];
  /** 系統カード: この系統のジョブの報酬に出る（K1） */
  lineage?: Lineage;
  /** ほかにも置く系統（区切りD） */
  lineages?: Lineage[];
  /** 共通カード: どのジョブの報酬にも出る（K1） */
  common?: boolean;
  /** 仲間がいる時だけ報酬・店に出る（連携のカード。1人プレイでは出さない。オーナーの決定） */
  teamOnly?: boolean;
  /** 異端カード: 代償付きでルールを壊す。報酬・ショップには出ず、イベントでだけ手に入る（K1） */
  heresy?: boolean;
}

// ---------- 特殊能力（職業・装備・カード・敵で共通。spec §2.4・§6.2・§12.7・§13.1） ----------

/**
 * 発動のきっかけ。戦闘の流れの決まった場面で呼ばれる。
 * battleStart 戦闘開始時 / turnStart 自分の側のフェーズ開始時 / turnEnd 自分の側のフェーズ終了時 /
 * afterCard カードを使った後 / perfect カードが完全成功した時 / kill 敵を倒した時 / hurt HPにダメージを受けた時 /
 * petAct 自分のお供が行動した時（お供の発動型の能力が働いた時）/
 * summonHit 自分の砲台・罠・召喚が敵のHPにダメージを与えた後 / overheal 自分の回復が味方のHPからあふれた時（満タンの味方を回復した時も） /
 * cheerPerfect 自分が「応援」を付けた味方のカードが完全成功した時（1人パーティなら自分でも） / detonate 状態異常を起爆して消した時
 */
export type AbilityTrigger = 'battleStart' | 'turnStart' | 'turnEnd' | 'afterCard' | 'perfect' | 'kill' | 'hurt' | 'allyKill' | 'allyDown' | 'blocked' | 'inflict' | 'foeTick' | 'petAct' | 'summonHit' | 'overheal' | 'cheerPerfect' | 'detonate' | 'combo';

/** 発動の条件の種類ごとの数値。条件のファイル（src/engine/abilities/conditions/）が declare module で種類を足す */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ConditionParams {}
export type AbilityCondition = { [K in keyof ConditionParams]: { kind: K } & ConditionParams[K] }[keyof ConditionParams];

/**
 * 特殊能力の中身。
 * - 発動型: きっかけ（when）＋ 条件（if。全部満たすと発動。上から順に判定）＋ 効果（do。効果の部品）
 * - 常時型（modifier）: damageDealt = 与えるダメージの倍率 / ignoreBlock = ブロックを無視 / coverLethal = 仲間をかばう
 */
export type AbilityEffect =
  | { when: AbilityTrigger; if?: AbilityCondition[]; do: Effect[] }
  | { modifier: 'damageDealt'; multiplier: number; /** 1回の攻撃ごとに足すダメージ（倍率を掛ける前） */ add?: number; /** add を、そのカード・効果の最初の1回の攻撃にだけ足す（弾込め） */ once?: boolean; if?: AbilityCondition[]; scale?: DamageScale; /** 自分の数え（counters）の値を add に足す（不動の拳。区切りD） */ addFromCounter?: string }
  /** このカードの連携の上乗せの倍率（ファイナル・ユニゾン。区切りD） */
  | { modifier: 'comboScale'; multiplier: number }
  /** 属性の無い攻撃が、狙った敵の弱点の属性になる（エレメンタル・チェイン。区切りD） */
  | { modifier: 'weaknessElement' }
  /** HPが1より下がらない（命綱。区切りD） */
  | { modifier: 'endure' }
  /** BREAK の「合計ダメージ」の数えを multiplier 倍にする（鎧通しの一撃。区切りD） */
  | { modifier: 'breakCount'; multiplier: number; if?: AbilityCondition[] }
  /** 成功が min 以上なら、完全成功でなくても BREAK のきっかけになる（魔力の楔。区切りD） */
  | { modifier: 'breakOnSuccess'; min: number }
  | { modifier: 'ignoreBlock'; if?: AbilityCondition[] }
  | { modifier: 'coverLethal'; chance: number }
  /** カードの成功率+bonus（狙い撃ちなど） */
  | { modifier: 'cardChance'; bonus: number; if?: AbilityCondition[] }
  | { modifier: 'completeSlots'; /** 1ターンに1枚だけ（この名前で数える） */ turnKey?: string; if?: AbilityCondition[] }
  | { modifier: 'exhaust'; if?: AbilityCondition[] }
  | { modifier: 'slotPreview'; uses: number; if?: AbilityCondition[] }
  /** カードのコストを変える（set = その値にする / delta = 足す。0より下にはならない）。turnKey があると1ターンに1枚だけ（使った時に数える） */
  | { modifier: 'cardCost'; delta?: number; set?: number; turnKey?: string; if?: AbilityCondition[] }
  /** ターンの始めに、前のターンのブロックが max まで残る（不動の錨） */
  | { modifier: 'keepBlock'; max: number; /** 不落の城塞: 持ち越しの上限を BALANCE.keepBlockFortify まで上げる（区切りD） */ fortify?: boolean }
  /** 自分の砲台・罠・召喚が2回ずつ発動する（永久機関） */
  | { modifier: 'summonTwice' }
  /** HPを回復した時、その pct 倍のブロックも得る（福音。0.5 = 50%） */
  | { modifier: 'healToBlock'; pct: number }
  /** 自分の砲台・罠・召喚の残りターン+add（歯車の目。戦闘の間ずっといる物は変わらない） */
  | { modifier: 'summonTurns'; add: number }
  /**
   * 敵から悪い状態異常を受けるはずの時に防ぐ（春を待つ・暖かい灯）。
   * statuses = その種類だけ（省略は悪い状態異常の全部） / block = 防いだ時に得るブロック /
   * allies = 味方全員を守る（省略は自分だけ） / perBattle = 守られる1人につき、1回の戦闘で何回まで（省略は何回でも）
   */
  | { modifier: 'statusGuard'; statuses?: string[]; block?: number; allies?: boolean; perBattle?: number }
  | { modifier: 'chestChance'; bonus: number; if?: AbilityCondition[] }
  | { modifier: 'weaknessDamage'; multiplier: number; if?: AbilityCondition[] }
  /** 属性の攻撃を受ける時: immune = 無効 / absorb = 受けるダメージ分回復 / half = 半分（K2。敵の攻撃から守る） */
  | { modifier: 'elementGuard'; element: string; mode: 'immune' | 'absorb' | 'half'; if?: AbilityCondition[] }
  /** 属性の無い物理攻撃を属性 into に変える（K2。炎の指輪など） */
  | { modifier: 'convertElement'; into: string; if?: AbilityCondition[] }
  /** 自分が付ける状態異常の量+amount（呪詛など） */
  | { modifier: 'statusBonus'; statuses: string[]; amount: number; if?: AbilityCondition[]; /** 属性ダメージに付いてくる状態異常（火傷・毒など）にも乗る（種まき） */ element?: boolean };

/**
 * ダメージの倍率を状況で増やす（倍率 × (1 + per × 値)。max は上乗せの上限）。
 * missingHp = 自分の減ったHPの割合（0〜1） / targetStatuses = 対象の悪い状態異常の種類の数 / selfStatus = 自分の状態異常 status の量 /
 * gold = 戦闘を始めた時の自分の所持金（step ゴールドごとに1）
 */
export type DamageScale = { by: 'missingHp' | 'targetStatuses' | 'selfStatus' | 'gold' | 'companions'; per: number; max?: number; status?: string; step?: number };

/** 演出用の出所。効果の判定には使わない。 */
export interface AbilitySource {
  kind: 'job' | 'inherited' | 'equipment' | 'pet' | 'card' | 'summon' | 'enemy' | 'other';
  id?: string;
  label?: string;
  effectName?: string;
}
export interface AbilityNotice { name: string; source?: AbilitySource }

export interface AbilityDef {
  source?: AbilitySource;
  name: string;
  /** お供の能力（活躍回数を数える） */
  pet?: boolean;
  /** 説明文（省略すると中身から自動で作る。雰囲気の文を足したい時だけ書く） */
  description?: string;
  effect: AbilityEffect;
  /** 同じ名前で一緒に持つ、ほかの中身（1つの装備に2つのきっかけ・常時型を持たせる時） */
  also?: AbilityEffect[];
  /** カードで得た一時的な能力: このターン（戦闘の通し番号）まで働く。次のターンの始めに消える（区切りD） */
  untilTurn?: number;
}

/** 探索の特殊能力（世界マップ・イベントで効く） */
export type ExploreAbility =
  | { kind: 'combined'; effects: ExploreAbility[] }
  | { kind: 'travel'; moveBonus: number; nightVision: boolean }
  | { kind: 'checkBonus'; check: string; bonus: number }
  /** 視界+N（M3）、隠し宝箱を見つける確率+X% */
  | { kind: 'tracking'; vision: number; hiddenFindBonus: number }
  | { kind: 'nightAmbushReduction'; multiplier: number }
  | { kind: 'extraEventOption'; tag: string }
  /** 移動のサイコロ+1（前の「移動力の判定のスロット+N」。武闘家など） */
  | { kind: 'moveSlots'; slots: number }
  /** 野営・休憩の回復の倍率（僧侶など） */
  | { kind: 'restBonus'; multiplier: number }
  /** 祠とイベントのマスが、霧の中でも見える（召喚士など） */
  | { kind: 'sense' }
  /** 野営でフォーカスも回復する（闘士など） */
  | { kind: 'campFocus'; amount: number }
  /** 町の買い物の値引き（%。怪盗など） */
  | { kind: 'shopDiscount'; percent: number };

export interface ExploreAbilityDef {
  id: string;
  name: string;
  description: string;
  effect: ExploreAbility;
}

// ---------- 職業 ----------

export interface ClassDef {
  id: string;
  /** 一覧での並び順（小さいほど先） */
  order?: number;
  name: string;
  role: string;
  /** 小さく表示する時の記号（絵が無い場合の代替にも使う） */
  icon: string;
  /** 職業の色（枠などに使う） */
  color: string;
  baseMaxHp: number;
  stats: Stats;
  deck: { cardId: string; count: number }[];
  battleAbility: AbilityDef;
  exploreAbility: ExploreAbilityDef;
  /** 名前の候補（性別ごと） */
  names: Record<Gender, string[]>;
  /** 最初から選べるか（M4の伝承の書で解放） */
  unlocked: boolean;
  /** レベルが1上がるごとの最大HP */
  hpPerLevel: number;
  /** 得意な武器の種類（初期装備。専用カードが出やすい） */
  weaponType: WeaponType;
  /** 装備できるほかの武器の種類（専用カードは出にくい） */
  subWeapons?: WeaponType[];
  /** ジョブの段（無ければ基本）。転職システム（spec §6.4） */
  tier?: JobTier;
  /** 系統（武・魔・聖・技） */
  lineage?: Lineage;
  /** 転職元のジョブ（このジョブになれる元） */
  from?: string[];
  /** 転職の条件（その冒険の中で達成する。feat はキャラの記録のキー） */
  requires?: { feat: string; count: number; text: string };
  /** この特殊職へ転職できる祭壇の印（施設のデータと照合する）。 */
  altar?: string;
  /** 転職した時に山札へ加わるカード（1回きりの決め技など） */
  jobCards?: string[];
  /** 転職した時に3枚から1枚選べる、そのジョブを象徴する専用カード（残りは報酬に出る） */
  signature?: string[];
  /** お供の扱いが得意（お供の効果が2倍。獣使い系統） */
  petMaster?: boolean;
  /** イベントの選択肢の条件に使う印（例: 'scout' = 待ち伏せを見抜ける） */
  tags?: string[];
  /** 初期装備（アイテムID） */
  startingEquipment: Partial<Record<EquipSlot, string>>;
  /** 報酬で出るカードの候補（カードID） */
  cardPool: string[];
  /** 成長ボーナスで伸びやすい能力値（重み） */
  growthWeights: Partial<Record<StatId, number>>;
}

// ---------- お供（ペット。設計 v2.1 §4） ----------

/** お供の探索の効果（獣使い系統は数値が2倍） */
export interface PetExplore {
  /** 世界マップの視界+N */
  vision?: number;
  /** 夜でも視界が狭くならない */
  nightVision?: boolean;
  /** 移動のサイコロ+N */
  moveBonus?: number;
  /** 宝箱の運の判定の成功率+N% */
  luckBonus?: number;
  /** イベントの判定の成功率+N% */
  eventBonus?: number;
  /** 野営のHP回復+N（割合。0.2 = +20%） */
  campHeal?: number;
}

export interface PetDef {
  id: string;
  order?: number;
  name: string;
  /** 絵が無い時の記号 */
  icon: string;
  /** 表示する場所: 肩（鳥）/ 足元 / 浮く（小竜） */
  perch: 'shoulder' | 'feet' | 'float';
  /** めったに出ない */
  rare?: boolean;
  colors: { id: string; name: string; color: string; rarity: 'normal' | 'rare' }[];
  /** 名前の候補（入れなかった時） */
  names: string[];
  description: string;
  /** 戦闘の能力（ふつう） */
  abilities: AbilityDef[];
  /** 戦闘の能力（獣使い系統: 数値が2倍） */
  masterAbilities: AbilityDef[];
  explore?: PetExplore;
  /** イベントの選択肢の条件に使う印（例: 'scout' = 待ち伏せを見抜ける） */
  tags?: string[];
}

/** ジョブの段: 基本 / 中位 / 最上位 / 特殊（中位からの脇道） */
export type JobTier = 'base' | 'mid' | 'top' | 'special';
/** 系統: 武・魔・聖・技 */
export type Lineage = 'bu' | 'ma' | 'sei' | 'gi';

/** 武器の種類のID（src/content の weaponTypes に登録したもの） */
export type WeaponType = string;

export interface WeaponTypeDef {
  id: string;
  order?: number;
  name: string;
  /** アイテムのアイコンの種類 */
  icon: string;
}
export type EquipSlot = 'weapon' | 'armor' | 'accessory';

/** パーティの1枠の指定（キャラクター作成の結果） */
export interface PartyMemberSpec {
  classId: string;
  gender: Gender;
  name: string;
  playerId: PlayerId;
  level?: number;
  /** 冒険中のキャラから戦闘を作る時の引き継ぎ値（無ければ職業の初期値） */
  heroId?: string;
  hp?: number;
  maxHp?: number;
  focus?: number;
  focusMax?: number;
  stats?: Stats;
  deck?: CardInstance[];
  /** 戦闘開始時のブロック（装備） */
  startBlock?: number;
  /** 所持金（所持金で変わる能力が見る） */
  gold?: number;
  /** 毎ターンのドロー枚数の追加（装備） */
  extraDraw?: number;
  /** 戦闘開始時の状態異常 */
  statuses?: Partial<Statuses>;
  /** 職業以外から得た戦闘の特殊能力（装備・お供・持ち越し） */
  abilities?: AbilityDef[];
  /** 連れているお供（足元・肩の表示用） */
  pet?: { petId: string; color: string; name: string; love: number };
  /** 武器に宿った属性（属性の無い物理攻撃がこの属性になる） */
  weaponElement?: string;
  /** 装備中の武器種（撃破実績にも使う）。 */
  equippedWeaponType?: string;
}

// ---------- 敵 ----------

/** 敵の行動の効果（カードと同じ部品。target は行動の対象の味方、foes は味方全員） */
export type EnemyEffect = Effect;

export interface EnemyActionDef {
  id: string;
  name: string;
  effects: EnemyEffect[];
  /** 自分以外の敵がいない時はこの行動に変える */
  fallbackIfAloneId?: string;
  /** 大技（強敵・ボスの強い一撃や全体攻撃）。この予告が出ているターンは、味方が体勢を崩せる（BREAK。抜本的な見直し §3-2） */
  big?: boolean;
}

export interface EnemyDef {
  id: string;
  name: string;
  icon: string;
  /** baseLevel の時のHP */
  maxHp: number;
  /** このデータの数値が想定しているレベル */
  baseLevel: number;
  /** 行動の決め方（src/engine/battle/ai/ のID。sequence = 順番 / random = ランダム） */
  pattern: string;
  actions: EnemyActionDef[];
  firstActionId?: string;
  /** レベルが1上がるごとのHP・攻撃の増加率（省略は balance.ts の共通値） */
  hpPerLevel?: number;
  attackPerLevel?: number;
  maxConsecutive?: number;
  /** 戦場での大きさ（1 = 標準、ボスは大きく） */
  size?: number;
  /** 倒した時の経験値・ゴールド（baseLevel の時） */
  exp: number;
  gold: number;
  /** ボスの段階（HPが belowHpPct% 以下になると行動が変わる） */
  phases?: EnemyPhaseDef[];
  /** 敵の特殊能力（味方と同じ書き方） */
  abilities?: AbilityDef[];
  /** 弱点の属性（ダメージ×1.5）・耐性のある属性（ダメージ×0.5・状態異常が効かない） */
  weak?: string[];
  resist?: string[];
  /** レアの敵（K3）: 名前に★が付く。倒した時の経験値・ゴールドはデータで多めに書く。徘徊の rareEncounters かイベントの戦闘で出す */
  rare?: boolean;
  /** 亜種（K3）: 元の敵のID。絵は元の敵を使い回す。属性か開幕の特性を必ず1つ変える */
  variantOf?: string;
  /** 亜種の足元のオーラの色（data/enemyAuras.ts の ID） */
  aura?: string;
}

export interface EnemyPhaseDef {
  belowHpPct: number;
  name: string;
  actions: EnemyActionDef[];
  pattern: string;
  maxConsecutive?: number;
}

export interface EncounterSpec {
  id: string;
  name: string;
  enemies: { defId: string; level?: number }[];
  /** ボスの部屋の戦闘（ボスには効き方が変わる効果が見る） */
  boss?: boolean;
  /** 中ボスの部屋の戦闘 */
  midboss?: boolean;
}

// ---------- 戦闘の状態 ----------

/** 状態異常の数値（ID → 数。登録されていないIDや0は「無し」） */
export type Statuses = Record<StatusId, number>;

/** 状態異常の定義（spec §14・M3-0） */
export interface StatusDef {
  id: string;
  order?: number;
  name: string;
  /** アイコンの種類（画面側の STATUS_ICONS のキー） */
  icon: string;
  color: string;
  bg: string;
  /** 悪い効果か（万能薬で治る） */
  harmful: boolean;
  /** 持ち主のフェーズの終わりに受ける継続ダメージ（'stacks' = 数値分、数 = 固定値）。ブロック無視 */
  tickDamage?: 'stacks' | number;
  /** 持ち主のフェーズの終わりに減る数（省略は1。0なら減らない） */
  decay?: number;
  /** 付いている間、与えるダメージ・受けるダメージにかかる倍率 */
  dealtMultiplier?: number;
  takenMultiplier?: number;
  /** 持ち主のフェーズの始めに回復する量（'stacks' = 数値分、数 = 固定値。再生など） */
  tickHeal?: 'stacks' | number;
  /** 受ける回復量の倍率（呪いなど） */
  healMultiplier?: number;
  /** 味方: カードの成功率がこれだけ下がる（%。痺れなど） */
  chancePenalty?: number;
  /** 敵: 行動がこの確率（%）で失敗する（痺れなど） */
  actionFailChance?: number;
  /** 敵: 次の行動を1回休む / 味方: 次のフェーズのマナが減る（凍結など）。どちらも起きた時に1減る */
  skipAction?: boolean;
  manaPenalty?: number;
  /** 味方: 次のターンの初めに引くカードが「数×この値」枚減る（遅延など）。引いた時に全部消える */
  drawPenalty?: number;
  /** 重ねられる上限（省略は上限なし） */
  maxStacks?: number;
  /** 持ち主の element 属性の攻撃のダメージ +per×数。その攻撃で消える（聖光など） */
  boostElement?: { element: string; per: number };
  /** 味方: 次に使うカードの成功率 +数×この値。カードを使うと消える（応援など） */
  chanceBonus?: number;
  /** 味方: HPが減ると全部消える（竜王の槍の「構え」） */
  loseOnHpLoss?: boolean;
  /** 残りターン数によらず一定の成功率を加える。カード使用では消費しない。 */
  flatChanceBonus?: number;
  /** 説明文（省略すると数値から自動で作る） */
  description?: string;
}

export interface CardInstance {
  uid: string;
  cardId: string;
  /** 強化済み（名前に＋） */
  upgraded?: boolean;
  /** 武器から一時的に加わったカード */
  fromWeapon?: boolean;
}

export interface AllyState {
  slotPreviewUsed?: number;
  /** 次の攻撃カードへ蓄えた倍率。戦闘を越えて持ち越さない。 */
  attackCharge?: { multiplier: number; category: CardCategory };
  /** 次の物理攻撃へ宿す属性。 */
  imbuedElement?: string;
  exhaustedCards?: string[];
  /** 最後に攻撃した敵（ターン終了時の追撃用） */
  lastTargetId?: string;
  /** 次の味方ターンに着地する跳躍 */
  airborne?: { targetId: string; amount: number; turn: number };
  /** この戦闘中だけ有効な与ダメージの上乗せ */
  damageBonus?: number;
  /** この戦闘の記録（転職の条件。敵を倒した数など。戦闘の後でキャラの記録に足す） */
  feats?: Record<string, number>;
  /** このターンに使ったカードの枚数（連撃など） */
  played?: number;
  /** 戦闘を始めた時の所持金（所持金で変わる能力が見る。戦闘中は変わらない） */
  gold?: number;
  /** 能力の数え（幻獣ゲージなど。キーは能力ごと） */
  counters?: Record<string, number>;
  /** 今付いている「応援」をくれた味方のID（輪唱。応援を使ったら消える） */
  cheeredBy?: string;
  /** 区切りD: 次の攻撃カードが弱点扱い（導きの光）・連携の段階+1（アシスト・パス） */
  guided?: boolean;
  comboBoost?: number;
  /** 区切りD: 反転の呪印（このターン、味方1人を回復するカードが、この敵への聖ダメージになる） */
  reversal?: { targetId: string; pct: number; max: number; turn: number };
  /** 区切りD: 光の蓄え（このターンの番号。聖光が消えない） */
  holdLight?: number;
  /** 区切りD: 弾込め（次の「×N回」のカードの回数+） */
  extraHits?: number;
  /** 区切りD: このターンに使ったコスト0のカードの枚数（流れる連撃） */
  playedZero?: number;
  /** 呼び出したお供（幻獣・獣など。ターン終了時に攻撃する。足元のトークンで表示） */
  summons?: SummonState[];
  /** このターンに使ったカードの枚数（種類ごと。子狼など） */
  playedBy?: Partial<Record<CardCategory, number>>;
  /** 連れているお供（表示用） */
  pet?: { petId: string; color: string; name: string; love: number };
  /** 武器に宿った属性 */
  weaponElement?: string;
  /** 装備中の武器種（撃破実績用）。 */
  equippedWeaponType?: string;
  /** 戦闘内で一意のID（a0, a1, ...）。同じ職業が複数いても区別できる */
  id: string;
  classId: string;
  gender: Gender;
  name: string;
  playerId: PlayerId;
  level: number;
  hp: number;
  maxHp: number;
  block: number;
  mana: number;
  focus: number;
  focusMax: number;
  /** 装備・成長を反映した能力値 */
  stats: Stats;
  extraDraw: number;
  /** 装備から得た戦闘の特殊能力 */
  abilities?: AbilityDef[];
  statuses: Statuses;
  drawPile: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  dead: boolean;
}

export interface Intent {
  actionId: string;
  targetId?: string;
}

export interface EnemyState {
  /** 次のインテントだけ休む（状態異常とは別の行動休止）。 */
  skipNextAction?: boolean;
  /** 次の行動の数値にかかる倍率（行動後に消える） */
  nextActionMultiplier?: number;
  uid: string;
  defId: string;
  /** 同じ敵が複数いる時の区別（A, B, ...） */
  nameSuffix?: string;
  level: number;
  /** レベルによる攻撃力の倍率 */
  attackMul: number;
  hp: number;
  maxHp: number;
  block: number;
  statuses: Statuses;
  tauntedBy?: string;
  intent?: Intent;
  seqIndex: number;
  history: string[];
  dead: boolean;
  /** 先読みで決まっている次の次の行動（オカメインコの先読み。次のインテントを決める時に使う） */
  queuedActionId?: string;
  /** 戦闘から逃げた（倒したことにならない。報酬なし） */
  fled?: boolean;
  /** 戦闘中に別の敵に呼ばれた（増援）。経験値・お金は出ない */
  summoned?: boolean;
  /** ボスの段階（0 = 最初） */
  phase: number;
  /** このターンにダメージを与えた味方（連携攻撃の判定。M3-C5） */
  hitBy?: string[];
  /** このターンに味方から受けたHPのダメージの合計（BREAK の「最大HPの2割」の判定。ターンの初めに消す） */
  turnDamage?: number;
  /** 区切りD: このターンの印（弱点看破 = 次の攻撃が弱点扱い / 挟撃の陣の強さ / 挟撃の陣でフォーカスをもらった味方） */
  exposed?: boolean;
  pincer?: number;
  pincerFocus?: string[];
  /** このターンの予告は、もう体勢を崩された（BREAK は1つの予告に1回。ターンの初めに消す） */
  broken?: boolean;
}

export type Phase = 'ally' | 'enemy' | 'victory' | 'defeat' | 'escaped';

export interface BattleStats {
  totalDamage: number;
  maxDamage: number;
  perfects: number;
  focusUsed: number;
  abilityTriggers: number;
}

export interface LogEntry {
  id: number;
  turn: number;
  text: string;
}

export interface BattleState {
  /** 戦闘開始直後だけ表示する結果。保存読込では再生しない。 */
  openingEvents?: BattleEvent[];
  /** 先読みで予約した結果。描画・読込では抽選しない。 */
  slotPreview?: SlotPreview;
  version: number;
  seed: number;
  rngState: number;
  /** 味方が狙っている敵（味方ID → 敵の uid。M3-C5） */
  aims?: Record<string, string>;
  turn: number;
  phase: Phase;
  allies: AllyState[];
  enemies: EnemyState[];
  enemyCursor: number;
  stats: BattleStats;
  log: LogEntry[];
  nextLogId: number;
  nextUid: number;
  encounterId: string;
  /** オンライン協力: 全員が「準備完了」を押すまで敵フェーズに進まない（spec §7.1） */
  readyCheck?: boolean;
  /** 準備完了を押したプレイヤー */
  ready?: PlayerId[];
  /** 戦闘中に手に入れたお金（掠め取りなど。勝った時の報酬に足す） */
  bonusGold?: number;
  /** ボスの部屋の戦闘 */
  boss?: boolean;
  /** 中ボスの部屋の戦闘（大物狩り） */
  midboss?: boolean;
}

/** 呼び出したお供（turns = 残りのターン数。0になったら帰る） */
export interface SummonState {
  targetId?: string;
  trigger?: 'enemyBeforeAction';
  effects?: Effect[];
  /** 同じ上限で数える召喚の印。 */
  group?: string;
  /** カード攻撃への追撃と、被弾の身代わりをする召喚 */
  echoPct?: number;
  intercept?: boolean;
  id: string;
  name: string;
  icon: string;
  damage: number;
  turns: number;
  element?: string;
}

export interface BattleSetup {
  seed: number;
  party: PartyMemberSpec[];
  encounter: EncounterSpec;
  /** 敵のHP・攻撃の倍率（難易度など。省略は1） */
  enemyHpMul?: number;
  enemyAttackMul?: number;
  /** 奇襲成功（敵は1ターン目に行動しない） */
  surprise?: boolean;
  /** オンライン協力: 全員の準備完了を待つ */
  readyCheck?: boolean;
}

// ===== コマンド（シリアライズ可能・オンライン協力で同期する単位） =====
export type Command =
  | { type: 'PREVIEW_CARD'; playerId: PlayerId; characterId: string; cardInstanceId: string; targetId?: string; allyTargetId?: string; focusUsed: number }
  | { type: 'REROLL_PREVIEW'; playerId: PlayerId; characterId: string }
  | { type: 'CONFIRM_PREVIEW'; playerId: PlayerId; characterId: string }
  | {
      type: 'PLAY_CARD';
      playerId: PlayerId;
      characterId: string;
      cardInstanceId: string;
      targetId?: string;
      allyTargetId?: string;
      focusUsed: number;
    }
  | { type: 'END_TURN'; playerId: PlayerId }
  /** 狙っている敵を仲間に見せる（targetId 無しで取り消し。M3-C5） */
  | { type: 'AIM'; playerId: PlayerId; characterId: string; targetId?: string }
  /** 消費アイテムを使う（アイテムの所持の管理は冒険側。ここでは効果だけ） */
  | { type: 'USE_ITEM'; playerId: PlayerId; characterId: string; targetId: string; itemName: string; effects: Effect[] }
  /** 敵フェーズを1ステップ進める（ホストが発行するシステムコマンド） */
  | { type: 'ENEMY_STEP' };

export type SlotResult = 'focus' | 'hit' | 'miss';

export interface SlotPreview {
  characterId: string;
  cardInstanceId: string;
  targetId?: string;
  allyTargetId?: string;
  focusUsed: number;
  chance: number;
  results: SlotResult[];
  rerollResults: SlotResult[];
  rerolled: boolean;
}

/** UI演出用のイベント */
export type BattleEvent =
  | {
      type: 'roll';
      characterId: string;
      cardId: string;
      targetId?: string;
      chance: number;
      results: SlotResult[];
      successes: number;
      perfect: boolean;
      summary: string;
    }
  | { type: 'damage'; unitId: string; amount: number; rawAmount?: number; blocked: number; sourceId?: string }
  | { type: 'resource'; unitId: string; resource: 'focus' | 'mana'; amount: number }
  | { type: 'block'; unitId: string; amount: number }
  | { type: 'status'; unitId: string; status: StatusId; amount: number }
  | { type: 'ability'; unitId: string; name: string; source?: AbilitySource }
  | { type: 'retarget'; enemyUid: string }
  /** 大技の予告を崩した（BREAK）。why = きっかけ（弱点・完全成功・大ダメージ） */
  | { type: 'break'; enemyUid: string; why: 'weak' | 'perfect' | 'damage' }
  | { type: 'enemyAct'; enemyUid: string; actionName: string; targetIds: string[] }
  | { type: 'death'; unitId: string }
  | { type: 'enemyPhase'; enemyUid: string; name: string }
  | { type: 'heal'; unitId: string; amount: number }
  | { type: 'phase'; phase: Phase }
  /** オンライン協力: 準備完了を押した */
  | { type: 'ready'; playerId: PlayerId };

export interface CommandResult {
  state: BattleState;
  events: BattleEvent[];
  error?: string;
}

/** 消費アイテムの効果（効果の部品の並び） */
export type ConsumableEffect = Effect[];

export * from './game';
export * from './world';
