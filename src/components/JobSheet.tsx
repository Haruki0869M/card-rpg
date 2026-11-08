// ===== 転職（転職先の一覧と、転職した時の専用カードの3択。設計 v2 §3） =====
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpCircle, Check, Lock, MapPin } from 'lucide-react';
import { useState } from 'react';
import { getCard } from '../data/cards';
import { getClass } from '../data/classes';
import { WEAPON_TYPES } from '../data/rules';
import { affinityFromStats, describeAbility, finalChance, heroStats, jobOptions, type JobOption } from '../engine';
import { isLocalPlayer } from '../store/battleConfig';
import { useBattle } from '../store/battleStore';
import type { ClassDef, GameState, Hero, JobTier } from '../types';
import { CardBody } from './ui/CardBody';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { HeroFace } from './ui/game';

export const TIER_NAME: Record<JobTier, string> = { base: '基本', mid: '中位', top: '最上位', special: '特殊' };

/** この端末のキャラのうち、今の場面にいるキャラ */
export function sceneLocalHeroes(game: GameState): Hero[] {
  return game.heroes.filter(
    (h) => !h.retired && h.hp > 0 && isLocalPlayer(h.playerId) && (game.party ? game.party.includes(h.id) : !game.expeditions?.some((x) => x.heroes.includes(h.id))),
  );
}

/** 今すぐ転職できるキャラがいるか（印を出す） */
export const canChangeNow = (game: GameState, hero: Hero) => isLocalPlayer(hero.playerId) && jobOptions(hero, game).some((o) => o.ready);

const weaponText = (job: ClassDef) =>
  [`◎${WEAPON_TYPES.get(job.weaponType).name}`, ...(job.subWeapons ?? []).map((w) => `○${WEAPON_TYPES.get(w).name}`)].join(' ');

function JobCard({ opt, onPick }: { opt: JobOption; onPick: () => void }) {
  const j = opt.job;
  return (
    <div className={`rounded-xl border p-2 ${opt.ready ? 'border-amber-300/70 bg-amber-500/10' : 'border-white/10 bg-black/30'}`}>
      <div className="flex items-center gap-2">
        <span className="text-[22px]" aria-hidden>
          {j.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[18px] leading-6" style={{ color: j.color }}>
            {j.name}
            <span className="ml-1.5 rounded-full bg-black/50 px-1.5 py-0.5 align-middle text-[12px] text-amber-200">{TIER_NAME[j.tier ?? 'base']}</span>
          </div>
          <div className="text-[12px] text-zinc-300">
            {j.role}・{weaponText(j)}
          </div>
        </div>
      </div>
      <div className="mt-1 text-[12px] leading-4">
        <span className="font-display text-amber-200">《{j.battleAbility.name}》</span>
        {describeAbility(j.battleAbility)}
        <br />
        <span className="font-display text-sky-200">《{j.exploreAbility.name}》</span>
        {j.exploreAbility.description}
      </div>
      {j.requires && <div className="mt-1 text-[12px] text-amber-100">条件：{j.requires.text}（{opt.progress ?? 0}/{j.requires.count}）</div>}
      {opt.ready ? (
        <button onClick={onPick} className="btn btn-gold mt-1.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg text-[15px] font-bold">
          <ArrowUpCircle size={18} /> {j.name}に転職する
        </button>
      ) : (
        <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-black/40 px-2 py-1.5 text-[13px] text-zinc-300">
          {opt.qualified ? <MapPin size={15} className="text-sky-300" /> : <Lock size={15} className="text-zinc-400" />}
          {opt.reason}
        </div>
      )}
    </div>
  );
}

/** 転職先の一覧（この端末の、今の場面にいるキャラ） */
export function JobSheetBody() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const openSheet = useBattle((s) => s.openSheet);
  const heroes = sceneLocalHeroes(game).filter((h) => jobOptions(h).length);
  const activeId = useBattle(s => s.activeId);
  const [heroId, setHeroId] = useState(heroes.find(h => h.id === activeId)?.id ?? heroes.find((h) => canChangeNow(game, h))?.id ?? heroes[0]?.id);
  const [pick, setPick] = useState<string | null>(null);
  const hero = heroes.find((h) => h.id === heroId) ?? heroes[0];
  if (!hero) return <div className="py-6 text-center text-[14px] text-zinc-400">今の場面に、転職できるキャラはいません</div>;
  const opts = jobOptions(hero, game);
  const cur = getClass(hero.classId);
  return (
    <div className="flex flex-col gap-2">
      {heroes.length > 1 && (
        <div className="flex gap-1">
          {heroes.map((h) => (
            <button key={h.id} onClick={() => setHeroId(h.id)} className={`btn relative flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border-b-2 py-1 ${h.id === hero.id ? 'sel-on' : 'border-transparent bg-black/30'}`}>
              <HeroFace hero={h} size={28} />
              <span className="truncate text-[12px] font-bold">{h.name}</span>
              {canChangeNow(game, h) && <span className="absolute top-0.5 right-1 h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_6px_#ffd76a]" />}
            </button>
          ))}
        </div>
      )}
      <div className="rounded-lg bg-black/30 px-2 py-1.5 text-[12px] leading-4 text-zinc-300">
        今：<b style={{ color: cur.color }}>{cur.name}</b> Lv{hero.level}。転職するとLv1に戻ります（成長の上乗せ・山札・装備はそのまま。今のジョブの戦闘の能力を持ち越します）。基本→中位は世界マップ・町・休憩部屋で、それより上は町の聖堂・祠で転職できます。
      </div>
      {opts.map((o) => (
        <JobCard key={o.job.id} opt={o} onPick={() => setPick(o.job.id)} />
      ))}
      <AnimatePresence>
        {pick && (
          <ConfirmDialog
            title={`${getClass(pick).name}に転職`}
            text={`${hero.name}はLv1に戻ります。今の「${cur.battleAbility.name}」は持ち越せます。転職しますか？`}
            ok="転職する"
            danger={false}
            onCancel={() => setPick(null)}
            onOk={() => {
              const err = dispatchGame({ type: 'CHANGE_JOB', playerId: hero.playerId, heroId: hero.id, jobId: pick });
              setPick(null);
              if (!err) openSheet(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** 転職した直後: 専用カード3枚から1枚選ぶ（この端末のキャラ。どの場面にいても出す） */
export function JobPickOverlay() {
  const full = useBattle((s) => s.full);
  const dispatchWire = useBattle((s) => s.dispatchWire);
  const [sel, setSel] = useState<string | null>(null);
  const hero = full?.heroes.find((h) => h.jobPick?.length && isLocalPlayer(h.playerId));
  if (!hero) return null;
  const job = getClass(hero.classId);
  const aff = affinityFromStats(heroStats(hero));
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/85 px-3" data-job-pick>
      <div className="font-display text-outline text-center text-[24px] text-amber-100">{job.name}に転職した！</div>
      <div className="mt-1 text-center text-[14px] text-zinc-200">{hero.name}の山札に加える専用カードを1枚選んでください（残りは報酬に出るようになります）</div>
      <div className="mt-3 flex w-full justify-center gap-2">
        {hero.jobPick!.map((id) => {
          const card = getCard(id);
          return (
            <button key={id} onClick={() => setSel(id)} className="btn shrink-0" aria-label={card.name} aria-pressed={sel === id}>
              <CardBody card={card} chance={finalChance(card, aff)} width={108} height={168} selected={sel === id} />
            </button>
          );
        })}
      </div>
      <button
        disabled={!sel}
        onClick={() => {
          if (!sel) return;
          dispatchWire({ type: 'PICK_JOB_CARD', playerId: hero.playerId, heroId: hero.id, cardId: sel });
          setSel(null);
        }}
        className="btn btn-gold font-display mt-4 flex h-12 w-full max-w-xs items-center justify-center gap-1.5 rounded-xl text-[18px] disabled:opacity-40"
      >
        <Check size={20} /> このカードにする
      </button>
    </motion.div>
  );
}
