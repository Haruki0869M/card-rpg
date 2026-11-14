import { facilityMembers, facilityVisit } from './world/facilities';
import { petLoveLevel } from './pets';
// ===== 転職（spec §6.4） =====
// 段は 基本 → 中位 → 最上位。中位からは、条件を満たすと特殊ジョブ（脇道）にも転職できる。
// 転職するとLv1に戻る。成長ボーナス・山札・装備は引き継ぎ、前のジョブの戦闘の特殊能力を1つ持ち越す。
// 基本→中位 = 戦闘・探索中以外 / 中位→最上位 = 町の聖堂・祠・神殿 / 中位→特殊 = 神殿・対応する祭壇
import { BALANCE } from '../../data/balance';
import { CARDS, cardLineages, cardWeaponTypes } from '../../data/cards';
import { CLASSES, getClass } from '../../data/classes';
import { getItem } from '../../data/items';
import { SANCTUARIES } from '../../data/world';
import type { ClassDef, GameState, Hero } from '../../types';
import { addLog } from './common';
import { clampHero, expToNext, heroMaxHp, jobWeapons } from './hero';
import { findExpedition, sceneOfHero, WORLD_SCENE } from './scenes';

/** そのジョブへ転職できるレベル */
export function jobChangeLevel(job: ClassDef): number {
  if (job.tier === 'mid') return BALANCE.jobChange.base;
  if (job.tier === 'special') return BALANCE.jobChange.special;
  return BALANCE.jobChange.mid;
}

/** キャラの記録（転職の条件に使う）を足す */
export function addFeat(hero: Pick<Hero, 'feats'>, key: string, n = 1) {
  if (!n) return;
  const f = (hero.feats ??= {});
  f[key] = (f[key] ?? 0) + n;
}

/** 記録の値 */
/** 転職の条件の記録の数。petBond = お供の懐き度が♡3以上の時の、お供の行動の合計（調教師。お供がいなければ0。区切りF） */
export const featOf = (hero: Pick<Hero, 'feats'> & { pet?: Hero['pet'] }, key: string) =>
  key === 'petBond' ? (hero.pet && petLoveLevel(hero.pet.love) >= 3 ? hero.pet.acts : 0) : (hero.feats?.[key] ?? 0);

/**
 * キャラが今いる所（転職できるかの判定用）。
 * map 世界マップ / town 町 / shrine 祠 / rest 休憩部屋 / hub 拠点 / busy 戦闘・探索・遭遇の途中
 */
export type HeroPlace = 'map' | 'town' | 'shrine' | 'temple' | 'altar' | 'rest' | 'hub' | 'busy';

export function heroPlace(game: GameState, hero: Hero): HeroPlace {
  const scene = sceneOfHero(game, hero.id);
  // ダンジョンの中（場面を処理中なら冒険に載っている方が新しい）
  if (scene !== WORLD_SCENE) {
    const mode = game.activeScene === scene ? game.mode : findExpedition(game, scene)?.mode;
    return mode === 'rest' ? 'rest' : 'busy';
  }
  if (game.activeScene && game.activeScene !== WORLD_SCENE) return 'busy';
  switch (game.mode) {
    case 'sanctuary': {
      const s = game.sanctuary, w = game.world;
      if (!s || !w || s.finished?.includes(hero.id) || w.pos[hero.id] !== s.tile || !(game.party ?? []).includes(hero.id)) return 'map';
      const def = SANCTUARIES.tryGet(s.sanctuaryId), feature = w.tiles[s.tile]?.f;
      return def && feature?.id === def.id && feature.kind === def.kind ? def.kind : 'busy';
    }
    case 'town':
      return facilityMembers(game).includes(hero.id) && !facilityVisit(game)?.finished?.includes(hero.id) ? 'town' : 'map';
    case 'shrine':
      return facilityMembers(game).includes(hero.id) && !facilityVisit(game)?.finished?.includes(hero.id) ? 'shrine' : 'map';
    case 'world':
      return 'map';
    case 'hub':
      return 'hub';
    case 'rest':
      return 'rest';
    case 'battle':
    case 'encounter':
    case 'reward':
    case 'chest':
    case 'event':
    case 'dungeon':
      return !game.party || game.party.includes(hero.id) ? 'busy' : 'map';
    default:
      return 'busy';
  }
}

/** 中位→最上位の転職場所。特殊職は神殿か対応する祭壇のみ。 */
const SACRED: HeroPlace[] = ['town', 'shrine', 'temple'];
/** 基本→中位の転職ができる場所 */
const ANYWHERE: HeroPlace[] = ['map', 'town', 'shrine', 'temple', 'altar', 'rest', 'hub'];

/** そのジョブへ転職できる場所の説明 */
export const jobPlaceText = (job: ClassDef) => job.tier === 'mid' ? '世界マップ・町・休憩部屋' : job.tier === 'special' ? '神殿・この職の祭壇' : '町の聖堂・祠・神殿';

export function jobPlaceAllows(game: GameState, hero: Hero, job: ClassDef): boolean {
  const place = heroPlace(game, hero);
  if (job.tier === 'mid') return ANYWHERE.includes(place);
  if (job.tier !== 'special') return SACRED.includes(place);
  if (place === 'temple') return true;
  const def = game.sanctuary && SANCTUARIES.tryGet(game.sanctuary.sanctuaryId);
  return place === 'altar' && !!job.altar && !!def && (def.altar === job.altar || !!def.altars?.includes(job.altar));
}

export interface JobOption {
  progress?: number;
  job: ClassDef;
  /** 今すぐ転職できるか（場所も含む） */
  ready: boolean;
  /** レベルと条件はそろっている（場所だけが足りない時も true） */
  qualified: boolean;
  /** できない理由（レベル・条件・場所） */
  reason?: string;
  /** 転職に要るレベル（画面の進み具合の表示用） */
  needLevel?: number;
  /** 条件の目標の数（requires がある時） */
  count?: number;
}

/** 今のジョブから転職できるジョブ（できるかどうかと、できない理由つき）。game を渡すと場所も確かめる */
export function jobOptions(hero: Hero, game?: GameState): JobOption[] {
  return CLASSES.all
    .filter((c) => getClass(hero.classId).tier !== 'special' && c.from?.includes(hero.classId))
    .map((job) => {
      const lv = jobChangeLevel(job);
      if (hero.level < lv) return { job, ready: false, qualified: false, reason: `Lv${lv}で転職できる` };
      const r = job.requires;
      if (r && featOf(hero, r.feat) < r.count) return { job, ready: false, qualified: false, reason: `条件: ${r.text}（${featOf(hero, r.feat)}/${r.count}）` };
      if (game && !jobPlaceAllows(game, hero, job)) return { job, ready: false, qualified: true, reason: `${jobPlaceText(job)}で転職できる` };
      return { job, ready: true, qualified: true };
    }).map(o => ({ ...o, progress: o.job.requires ? featOf(hero, o.job.requires.feat) : undefined, needLevel: jobChangeLevel(o.job), count: o.job.requires?.count }));
}

/** そのジョブにしか無い札か（共通・武器種・系統に置かれておらず、ほかのジョブの報酬にも無い） */
export function jobOnlyCard(job: ClassDef, id: string): boolean {
  const c = CARDS.tryGet(id);
  if (!c || c.common || cardWeaponTypes(c).length || cardLineages(c).length) return false;
  return !CLASSES.all.some((j) => j.id !== job.id && j.cardPool.includes(id));
}

/**
 * 転職した時に選べる専用カード（3枚）。
 * オーナーの決定（2026-11-12）: 「そのジョブにしか無い札」を先に並べる（代表の並び → 報酬の並びの順）。
 * 3枚に足りないジョブだけ、残りを代表・報酬の並びの上から足す。
 * 転職で必ず入る札（jobCards = 決め技）は候補に出さない（点検 2026-11-13 F4: 時魔道士の「時間停止」が2枚取れた）。
 */
export function signatureCards(job: ClassDef): string[] {
  // 自分の決め技も、ほかの職の決め技も出さない（決め技は、その職の転職でだけ入る）
  const given = new Set([...(job.jobCards ?? []), ...finisherCards()]);
  const order = [...new Set([...(job.signature ?? []), ...job.cardPool])].filter((id) => CARDS.has(id) && !given.has(id));
  const own = order.filter((id) => jobOnlyCard(job, id));
  return [...own, ...order.filter((id) => !own.includes(id))].slice(0, 3);
}

/** 転職する。Lv1に戻り、前のジョブの戦闘の特殊能力を持ち越す */
export function changeJob(game: GameState, hero: Hero, jobId: string): string | undefined {
  const opt = jobOptions(hero, game).find((o) => o.job.id === jobId);
  if (!opt) return 'そのジョブには転職できません';
  if (!opt.ready) return opt.reason ?? 'まだ転職できません';
  const ratio = hero.hp / Math.max(1, heroMaxHp(hero));
  const prev = hero.classId;
  hero.jobs = [...(hero.jobs ?? []), prev];
  hero.carried = prev;
  hero.classId = jobId;
  hero.level = 1;
  // 中位に転職したら、記録（転職の条件）を数え直す。最上位・特殊職の条件は、中位になってからの記録で数える（§5）
  if (opt.job.tier === 'mid') hero.feats = {};
  // 次のレベルに向けて貯めた経験値は持ち越す（新しいジョブのLv2の手前まで）
  hero.exp = Math.max(0, Math.min(hero.exp, expToNext(1, jobId) - 1));
  // 新しいジョブで使えない武器は持ち物へ。武器が無ければ、そのジョブの最初の武器を持つ
  const w = hero.equipment.weapon;
  if (w && !jobWeapons(jobId).includes(getItem(w.itemId).weaponType ?? '')) {
    hero.stash.push(w);
    delete hero.equipment.weapon;
  }
  const start = opt.job.startingEquipment.weapon;
  if (!hero.equipment.weapon && start) hero.equipment.weapon = { uid: `i${game.nextUid++}`, itemId: start };
  for (const cardId of opt.job.jobCards ?? []) hero.deck.push({ uid: `c${game.nextUid++}`, cardId });
  // 専用カード3枚から1枚選ぶ（PICK_JOB_CARD）
  const sig = signatureCards(opt.job);
  if (sig.length) hero.jobPick = sig;
  hero.hp = Math.max(1, Math.round(heroMaxHp(hero) * ratio));
  clampHero(hero);
  addLog(game, `${hero.name}は${getClass(prev).name}から${opt.job.name}に転職した！`);
  return undefined;
}

/** 転職した時の専用カードを1枚選ぶ */
export function pickJobCard(game: GameState, hero: Hero, cardId: string): string | undefined {
  if (!hero.jobPick?.length) return '選べるカードがありません';
  if (!hero.jobPick.includes(cardId)) return 'そのカードは選べません';
  hero.deck.push({ uid: `c${game.nextUid++}`, cardId });
  delete hero.jobPick;
  addLog(game, `${hero.name}は「${CARDS.get(cardId).name}」を手に入れた`);
  return undefined;
}

/** レベルが上がって、新しく転職できるようになったジョブを知らせる */
export function announceJobs(game: GameState, hero: Hero) {
  for (const o of jobOptions(hero)) {
    if (!o.qualified || hero.level !== jobChangeLevel(o.job)) continue;
    addLog(game, `${hero.name}は${o.job.name}に転職できるようになった（${jobPlaceText(o.job)}で）`);
  }
}

/**
 * キャラが報酬・ショップで出会うカードの候補
 * = 今のジョブ＋これまでのジョブの専用カード ＋ 装備できる武器種のカード ＋ 今のジョブの系統のカード ＋ 共通カード。
 * 異端カードは入らない（イベントでだけ手に入る）。
 */
/**
 * ジョブ寄りの候補（報酬のカードの「必ず1枚」に使う。K7）: 今と前のジョブの専用カード・今のジョブの系統のカード・
 * 装備している武器の種類のカード（武器が無ければ、そのジョブの得意な武器）。共通カード・異端カードは入れない
 */
export function heroJobCardPool(hero: Hero, solo = false): string[] {
  const pool = heroCardPool(hero, solo);
  const own = new Set<string>();
  for (const cls of [hero.classId, ...(hero.jobs ?? [])]) for (const id of getClass(cls).cardPool) own.add(id);
  const w = hero.equipment.weapon;
  const weapon = (w ? getItem(w.itemId).weaponType : undefined) ?? getClass(hero.classId).weaponType;
  const lineage = getClass(hero.classId).lineage;
  return pool.filter((id) => {
    const c = CARDS.get(id);
    if (c.heresy) return false;
    // 1枚が複数の場所に置かれている時（区切りD）: 自分のジョブのカード・今の武器・系統のどれかに当たれば入る
    if (own.has(id)) return true;
    if (c.common) return false;
    const wts = cardWeaponTypes(c);
    const lins = cardLineages(c);
    if (!wts.length && !lins.length) return own.has(id);
    return wts.includes(weapon) || (!!lineage && lins.includes(lineage));
  });
}

/**
 * 決め技（どれかのジョブの jobCards の札）の一覧。決め技は、その職に転職した時に1枚だけ入る札なので、
 * 報酬・イベントのカード・変異・行商人・町の店の候補には出さない（2026-11-13。点検 F4 の続き）
 */
export function finisherCards(): Set<string> {
  return new Set(CLASSES.all.flatMap((j) => j.jobCards ?? []));
}

/** solo = 1人プレイ（キャラが1人）。連携のカード（teamOnly）と決め技は入れない */
export function heroCardPool(hero: Hero, solo = false): string[] {
  const ids = new Set<string>();
  for (const cls of [hero.classId, ...(hero.jobs ?? [])]) for (const id of getClass(cls).cardPool) if (CARDS.has(id)) ids.add(id);
  const weapons = new Set(jobWeapons(hero.classId));
  const lineage = getClass(hero.classId).lineage;
  for (const c of CARDS.all) {
    if (c.heresy || (solo && c.teamOnly)) continue;
    if (c.common || cardWeaponTypes(c).some((w) => weapons.has(w)) || (!!lineage && cardLineages(c).includes(lineage))) ids.add(c.id);
  }
  const fin = finisherCards();
  return [...ids].filter((id) => !fin.has(id) && !(solo && CARDS.get(id).teamOnly));
}
