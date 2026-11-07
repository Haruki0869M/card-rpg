// ===== 転職（spec §6.4） =====
// 段は 基本 → 中位 → 最上位。中位からは、条件を満たすと特殊ジョブ（脇道）にも転職できる。
// 転職するとLv1に戻る。成長ボーナス・山札・装備は引き継ぎ、前のジョブの戦闘の特殊能力を1つ持ち越す。
// 転職できる場所は段で分かれる: 基本→中位 = 世界マップ・町・休憩部屋など（戦闘・探索中以外） / 中位→最上位・特殊 = 町の聖堂・神殿など
import { BALANCE } from '../../data/balance';
import { CARDS } from '../../data/cards';
import { CLASSES, getClass } from '../../data/classes';
import { getItem } from '../../data/items';
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
export const featOf = (hero: Pick<Hero, 'feats'>, key: string) => hero.feats?.[key] ?? 0;

/**
 * キャラが今いる所（転職できるかの判定用）。
 * map 世界マップ / town 町 / shrine 祠 / rest 休憩部屋 / hub 拠点 / busy 戦闘・探索・遭遇の途中
 */
export type HeroPlace = 'map' | 'town' | 'shrine' | 'rest' | 'hub' | 'busy';

export function heroPlace(game: GameState, hero: Hero): HeroPlace {
  const scene = sceneOfHero(game, hero.id);
  // ダンジョンの中（場面を処理中なら冒険に載っている方が新しい）
  if (scene !== WORLD_SCENE) {
    const mode = game.activeScene === scene ? game.mode : findExpedition(game, scene)?.mode;
    return mode === 'rest' ? 'rest' : 'busy';
  }
  if (game.activeScene && game.activeScene !== WORLD_SCENE) return 'busy';
  switch (game.mode) {
    case 'town':
      return game.town?.heroId === hero.id ? 'town' : 'map';
    case 'shrine':
      return game.shrine?.heroId === hero.id ? 'shrine' : 'map';
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

/** 中位→最上位・特殊の転職ができる「聖なる場所」（町の聖堂・祠・拠点。神殿と祭壇は J3d で足す） */
const SACRED: HeroPlace[] = ['town', 'shrine', 'hub'];
/** 基本→中位の転職ができる場所 */
const ANYWHERE: HeroPlace[] = ['map', 'town', 'shrine', 'rest', 'hub'];

/** そのジョブへ転職できる場所の説明 */
export const jobPlaceText = (job: ClassDef) => (job.tier === 'mid' ? '世界マップ・町・休憩部屋' : '町の聖堂・祠');

export interface JobOption {
  job: ClassDef;
  /** 今すぐ転職できるか（場所も含む） */
  ready: boolean;
  /** レベルと条件はそろっている（場所だけが足りない時も true） */
  qualified: boolean;
  /** できない理由（レベル・条件・場所） */
  reason?: string;
}

/** 今のジョブから転職できるジョブ（できるかどうかと、できない理由つき）。game を渡すと場所も確かめる */
export function jobOptions(hero: Hero, game?: GameState): JobOption[] {
  const place = game ? heroPlace(game, hero) : undefined;
  return CLASSES.all
    .filter((c) => c.from?.includes(hero.classId))
    .map((job) => {
      const lv = jobChangeLevel(job);
      if (hero.level < lv) return { job, ready: false, qualified: false, reason: `Lv${lv}で転職できる` };
      const r = job.requires;
      if (r && featOf(hero, r.feat) < r.count) return { job, ready: false, qualified: false, reason: `条件: ${r.text}（${featOf(hero, r.feat)}/${r.count}）` };
      if (place && !(job.tier === 'mid' ? ANYWHERE : SACRED).includes(place)) return { job, ready: false, qualified: true, reason: `${jobPlaceText(job)}で転職できる` };
      return { job, ready: true, qualified: true };
    });
}

/** 転職した時に選べる専用カード（3枚。無ければ報酬の候補の先頭から） */
export function signatureCards(job: ClassDef): string[] {
  const ids = job.signature?.length ? job.signature : job.cardPool;
  return ids.filter((id) => CARDS.has(id)).slice(0, 3);
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

/** キャラが報酬・ショップで出会うカードの候補（今のジョブ＋これまでのジョブ） */
export function heroCardPool(hero: Hero): string[] {
  const ids = new Set<string>();
  for (const cls of [hero.classId, ...(hero.jobs ?? [])]) for (const id of getClass(cls).cardPool) if (CARDS.has(id)) ids.add(id);
  return [...ids];
}
