// ===== 転職（spec §6.4） =====
// 段は 基本 → 中位 → 最上位。中位からは、条件を満たすと特殊ジョブ（脇道）にも転職できる。
// 転職するとLv1に戻る。成長ボーナス・山札・装備は引き継ぎ、前のジョブの戦闘の特殊能力を1つ持ち越す。
import { BALANCE } from '../../data/balance';
import { CLASSES, getClass } from '../../data/classes';
import { getItem } from '../../data/items';
import type { ClassDef, GameState, Hero } from '../../types';
import { addLog } from './common';
import { clampHero, heroMaxHp, jobWeapons } from './hero';

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

export interface JobOption {
  job: ClassDef;
  /** 今すぐ転職できるか */
  ready: boolean;
  /** できない理由（レベル・条件） */
  reason?: string;
}

/** 今のジョブから転職できるジョブ（できるかどうかと、できない理由つき） */
export function jobOptions(hero: Hero): JobOption[] {
  return CLASSES.all
    .filter((c) => c.from?.includes(hero.classId))
    .map((job) => {
      const lv = jobChangeLevel(job);
      if (hero.level < lv) return { job, ready: false, reason: `Lv${lv}で転職できる` };
      const r = job.requires;
      if (r && featOf(hero, r.feat) < r.count) return { job, ready: false, reason: `条件: ${r.text}（${featOf(hero, r.feat)}/${r.count}）` };
      return { job, ready: true };
    });
}

/** 転職する。Lv1に戻り、前のジョブの戦闘の特殊能力を持ち越す */
export function changeJob(game: GameState, hero: Hero, jobId: string): string | undefined {
  const opt = jobOptions(hero).find((o) => o.job.id === jobId);
  if (!opt) return 'そのジョブには転職できません';
  if (!opt.ready) return opt.reason ?? 'まだ転職できません';
  const ratio = hero.hp / Math.max(1, heroMaxHp(hero));
  const prev = hero.classId;
  hero.jobs = [...(hero.jobs ?? []), prev];
  hero.carried = prev;
  hero.classId = jobId;
  hero.level = 1;
  hero.exp = 0;
  // 新しいジョブで使えない武器は持ち物へ。武器が無ければ、そのジョブの最初の武器を持つ
  const w = hero.equipment.weapon;
  if (w && !jobWeapons(jobId).includes(getItem(w.itemId).weaponType ?? '')) {
    hero.stash.push(w);
    delete hero.equipment.weapon;
  }
  const start = opt.job.startingEquipment.weapon;
  if (!hero.equipment.weapon && start) hero.equipment.weapon = { uid: `i${game.nextUid++}`, itemId: start };
  for (const cardId of opt.job.jobCards ?? []) hero.deck.push({ uid: `c${game.nextUid++}`, cardId });
  hero.hp = Math.max(1, Math.round(heroMaxHp(hero) * ratio));
  clampHero(hero);
  addLog(game, `${hero.name}は${getClass(prev).name}から${opt.job.name}に転職した！`);
  return undefined;
}
