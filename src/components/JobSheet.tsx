// ===== 転職（転職先の一覧と、転職した時の専用カードの3択。設計 v2 §3） =====
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpCircle, Check, Lock, MapPin, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { getCard } from '../data/cards';
import { getClass } from '../data/classes';
import { WEAPON_TYPES } from '../data/rules';
import { affinityFromStats, describeAbility, finalChance, heroStats, jobOptions, type JobOption } from '../engine';
import { isLocalPlayer } from '../store/battleConfig';
import { useBattle } from '../store/battleStore';
import type { ClassDef, GameState, Hero, JobTier } from '../types';
import { CardBody } from './ui/CardBody';
import { CardPickPanel } from './ui/CardPickPanel';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { HeroFace } from './ui/game';
import { HiddenNoticeBadge } from './ui/HiddenNotices';
import { LAYER } from './ui/layers';

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

/** 転職の条件の1行（✓/✗・文・進み具合の棒） */
function ReqRow({ ok, text, now, need }: { ok: boolean; text: string; now?: number; need?: number }) {
  return (
    <div className="flex flex-col gap-0.5" data-job-req={ok ? 'ok' : 'ng'}>
      <div className={`flex items-start gap-1 text-[12px] leading-4 ${ok ? 'text-emerald-200' : 'text-zinc-200'}`}>
        {ok ? <Check size={14} className="mt-[1px] shrink-0 text-emerald-300" /> : <X size={14} className="mt-[1px] shrink-0 text-red-300" />}
        <span className="min-w-0 flex-1">{text}</span>
        {need !== undefined && <b className="shrink-0 tabular-nums">{Math.min(now ?? 0, need)}/{need}</b>}
      </div>
      {need !== undefined && (
        <div className="ml-[18px] h-[6px] overflow-hidden rounded-full bg-black/60" data-job-progress>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((now ?? 0) / Math.max(1, need)) * 100)}%`, background: ok ? 'linear-gradient(90deg,#22b45a,#7dffa8)' : 'linear-gradient(90deg,#b07a1a,#ffd76a)' }} />
        </div>
      )}
    </div>
  );
}

/** 転職の条件の一覧（レベル・条件）。今の進み具合と並べて1か所に出す */
export function jobRequirements(opt: JobOption, level: number): { ok: boolean; text: string; now?: number; need?: number }[] {
  const rows: { ok: boolean; text: string; now?: number; need?: number }[] = [];
  const lv = opt.needLevel ?? 1;
  rows.push({ ok: level >= lv, text: `Lv${lv}以上（今 Lv${level}）` });
  const r = opt.job.requires;
  if (r) rows.push({ ok: (opt.progress ?? 0) >= r.count, text: r.text, now: opt.progress ?? 0, need: r.count });
  return rows;
}

function JobCard({ opt, level, onPick }: { opt: JobOption; level: number; onPick: () => void }) {
  const j = opt.job;
  return (
    // 自動の確認用の見えない印（B17）: 転職先のジョブの id と、下の段と同じ分け方の状態（ready = 転職できる・place = 場所だけ足りない・locked = 条件が足りない）
    <div className={`rounded-xl border p-2 ${opt.ready ? 'border-amber-300/70 bg-amber-500/10' : 'border-white/10 bg-black/30'}`} data-job-option={j.id} data-job-state={opt.ready ? 'ready' : opt.qualified ? 'place' : 'locked'}>
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
      <div className="mt-1.5 flex flex-col gap-1 rounded-lg bg-black/30 px-2 py-1.5" data-job-reqs>
        {jobRequirements(opt, level).map((r) => (
          <ReqRow key={r.text} {...r} />
        ))}
      </div>
      {opt.ready ? (
        <button onClick={onPick} className="btn btn-gold mt-1.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg text-[15px] font-bold" data-job-change={j.id}>
          <ArrowUpCircle size={18} /> {j.name}に転職する
        </button>
      ) : opt.qualified ? (
        // 条件はそろっていて、場所だけが足りない時（レベル・条件の文は上の一覧に出しているので、ここは場所の案内だけ）
        <div className="mt-1.5 flex items-center gap-1 rounded-lg bg-black/40 px-2 py-1.5 text-[13px] text-sky-100">
          <MapPin size={15} className="shrink-0 text-sky-300" />
          {opt.reason}
        </div>
      ) : (
        <div className="mt-1.5 flex items-center gap-1 px-1 text-[12px] text-zinc-400">
          <Lock size={14} className="shrink-0" />
          上の ✗ をそろえると転職できます
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
        <JobCard key={o.job.id} opt={o} level={hero.level} onPick={() => setPick(o.job.id)} />
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
  // 押したカード（回2: 戦闘のカード報酬と同じく、下に説明の窓を開く。決めるのは窓の「このカードにする」だけ）
  const [sel, setSel] = useState<string | null>(null);
  const close = useCallback(() => setSel(null), []);
  // 【提案】隠れている通信の知らせを見る間だけ、カード選びを下に畳む（選ぶまでは閉じられない。戻るボタンで開き直す）
  const [peek, setPeek] = useState(false);
  const hero = full?.heroes.find((h) => h.jobPick?.length && isLocalPlayer(h.playerId));
  if (!hero) return null;
  if (peek)
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-3 pb-3" style={{ zIndex: LAYER.cardPick }} data-job-pick-peek>
        <button onClick={() => setPeek(false)} className="btn btn-gold pointer-events-auto h-12 w-full max-w-md rounded-xl text-[15px] font-bold">
          {hero.name}の専用カード選びに戻る
        </button>
      </div>
    );
  const job = getClass(hero.classId);
  const aff = affinityFromStats(heroStats(hero));
  const picked = sel && hero.jobPick!.includes(sel) ? getCard(sel) : undefined;
  return (
    // 実機の不具合⑤: 背景は不透明（後ろのマップやダンジョンの文字が透けない。お供・カードの作業の画面と同じ地の色）
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col overflow-y-auto overscroll-contain bg-[#0b0910] px-3 py-3" style={{ zIndex: LAYER.cardPick }} data-job-pick>
      <div className="flex shrink-0 justify-end">
        <HiddenNoticeBadge onOpen={() => setPeek(true)} />
      </div>
      {/* 説明を開いて縦に収まらない時は、この中だけ縦にスクロールする（収まる時は真ん中に置く） */}
      <div className="my-auto flex w-full flex-col items-center">
        <div className="font-display text-outline text-center text-[24px] text-amber-100">{job.name}に転職した！</div>
        <div className="mt-1 text-center text-[14px] text-zinc-200">{hero.name}の山札に加える専用カードを1枚選んでください（残りは報酬に出るようになります）</div>
        <div className="mt-3 flex w-full justify-center gap-2">
          {hero.jobPick!.map((id, i) => {
            const card = getCard(id);
            return (
              <button key={id} onClick={() => setSel((x) => (x === id ? null : id))} className="btn shrink-0" aria-label={card.name} aria-pressed={sel === id} data-pick-card={i}>
                <CardBody card={card} chance={finalChance(card, aff)} width={108} height={168} selected={sel === id} />
              </button>
            );
          })}
        </div>
        {!picked && <div className="mt-3 text-center text-[12px] text-zinc-400">カードを押すと、くわしい説明が出ます</div>}
        {picked && (
          <div className="w-full max-w-md">
            <CardPickPanel
              card={picked}
              chance={finalChance(picked, aff)}
              who={`${hero.name}の成功率`}
              action={
                <>
                  <Check size={20} /> このカードにする
                </>
              }
              onAction={() => {
                dispatchWire({ type: 'PICK_JOB_CARD', playerId: hero.playerId, heroId: hero.id, cardId: picked.id });
                setSel(null);
              }}
              onClose={close}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
