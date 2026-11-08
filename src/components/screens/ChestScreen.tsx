// ===== 宝箱の画面: 運のスロット → 確率が上へずれる → 揺れと光の段階アップ → リーチ → レジェンド演出（spec §10.3） =====
// 格はエンジンが1回だけ抽選済み。ここは結果を「段階的に見せる」だけ（ガセ演出なし: 光・リーチ・予告は本当の格のときだけ出る）
import { VoteChips } from '../ui/Votes';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronsRight, Lock, Sparkles, Star, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BattleBackground, ChestImage } from '../../art';
import { BALANCE, REVEAL_TIMING, VIBRATION } from '../../data/balance';
import { chestOdds, expectedChestOdds, rarityIndex, statChance, sceneBackground, sceneHeroes } from '../../engine';
import { LOCAL_PLAYER, isLocalPlayer } from '../../store/battleConfig';
import { speedFactor, useBattle, vibrate } from '../../store/battleStore';
import { playSound } from '../../audio/player';
import type { SfxId } from '../../audio/ids';
import type { ChestRoll, Hero, Rarity, SlotResult } from '../../types';
import { CheckPanel, RollStrip } from '../ui/CheckPanel';
import { CHEST_NAME, fmtPct, OddsBar } from '../ui/ChestOdds';
import { RARITY_STYLE, Screen } from '../ui/game';
import { LootList } from './RoomScreens';

/** 光の色（白 → 青 → 紫 → 金）。本当の格の色で止まる */
const LIGHT = ['#ffffff', '#5ab0ff', '#c58bff', '#ffcf4a'];

type Step =
  | { kind: 'reels'; dur: number }
  | { kind: 'shift'; dur: number }
  | { kind: 'omen'; dur: number }
  | { kind: 'shake'; dur: number }
  | { kind: 'light'; level: number; dur: number }
  | { kind: 'reach'; dur: number }
  | { kind: 'premium'; dur: number }
  | { kind: 'result'; dur: 0 };

const isTenpai = (results: SlotResult[]) => results.length >= 3 && results.slice(0, -1).every((r) => r !== 'miss');

/** 演出の段取り（格が高いほど長く、段階が多い） */
function buildTimeline(roll: ChestRoll): Step[] {
  const T = REVEAL_TIMING;
  const g = rarityIndex(roll.grade ?? 'common');
  const n = roll.results.length;
  const steps: Step[] = [{ kind: 'reels', dur: T.reelStop * n + (isTenpai(roll.results) ? T.reelTenpai : 0) + 0.15 }];
  if (roll.results.some((r) => r !== 'miss')) steps.push({ kind: 'shift', dur: T.oddsShift });
  if (roll.omen) steps.push({ kind: 'omen', dur: T.omen });
  steps.push({ kind: 'shake', dur: T.shake });
  for (let l = 0; l <= Math.min(g, 2); l++) steps.push({ kind: 'light', level: l, dur: T.lightStep });
  if (g >= 2) steps.push({ kind: 'reach', dur: T.reach });
  if (g >= 3) {
    steps.push({ kind: 'light', level: 3, dur: T.lightStep });
    steps.push({ kind: 'premium', dur: T.premium });
  }
  steps.push({ kind: 'result', dur: 0 });
  return steps;
}

/** 判定に一番向いている、この端末のキャラ */
function bestHero(heroes: Hero[], score: (h: Hero) => number): string {
  const mine = heroes.filter((h) => h.hp > 0 && isLocalPlayer(h.playerId));
  return [...mine].sort((a, b) => score(b) - score(a))[0]?.id ?? heroes[0].id;
}

// ---------- スロットのリール ----------

const REEL_ICONS: SlotResult[] = ['hit', 'miss', 'hit', 'miss', 'focus', 'miss', 'hit', 'miss'];

function ReelFace({ r, size = 30 }: { r: SlotResult; size?: number }) {
  return r === 'focus' ? <Star size={size} className="text-amber-900" /> : r === 'hit' ? <Check size={size} strokeWidth={3} className="text-emerald-950" /> : <X size={size} strokeWidth={3} className="text-red-200" />;
}

const REEL_BG: Record<SlotResult, string> = {
  focus: 'linear-gradient(180deg,#ffe9a8,#e2a72a)',
  hit: 'linear-gradient(180deg,#5af2a8,#138a50)',
  miss: 'linear-gradient(180deg,#5a2430,#2a0c12)',
};

/** リールが左から順に止まる。テンパイ（あと1つで完全成功）なら最後のリールは溜めてから止まる */
function Reels({ results, speed }: { results: SlotResult[]; speed: number }) {
  const [stopped, setStopped] = useState(() => results.map((r) => r === 'focus'));
  const tenpai = isTenpai(results);
  useEffect(() => {
    const timers = results.map((r, i) => {
      if (r === 'focus') return undefined;
      const last = i === results.length - 1;
      const t = (REVEAL_TIMING.reelStop * (i + 1) + (last && tenpai ? REVEAL_TIMING.reelTenpai : 0)) / speed;
      return setTimeout(() => {
        setStopped((s) => s.map((v, j) => (j === i ? true : v)));
        playSound('sfx_slot_stop');
        if (tenpai && i === results.length - 2) playSound('sfx_slot_reach');
      }, t * 1000);
    });
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [results, speed, tenpai]);
  const waitingLast = tenpai && !stopped[results.length - 1] && stopped.slice(0, -1).every(Boolean);
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-2">
        {results.map((r, i) => {
          const done = stopped[i];
          const hot = waitingLast && i === results.length - 1;
          return (
            <div
              key={i}
              className={`relative h-14 w-14 overflow-hidden rounded-xl border-[3px] ${hot ? 'glow-pulse' : ''}`}
              style={{
                borderColor: hot ? '#ffcf4a' : done ? '#fff3c4' : '#6a5a40',
                background: done ? REEL_BG[r] : '#120e16',
                boxShadow: hot ? '0 0 18px #ffcf4a' : done && r !== 'miss' ? '0 0 10px rgba(120,255,180,.5)' : undefined,
              }}
            >
              {done ? (
                <motion.div initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.12 }} className="flex h-full w-full items-center justify-center">
                  <ReelFace r={r} />
                </motion.div>
              ) : (
                <div className={hot ? 'reel-spin-slow' : 'reel-spin'}>
                  {[...REEL_ICONS, ...REEL_ICONS].map((x, j) => (
                    <div key={j} className="flex h-14 w-full items-center justify-center opacity-70" style={{ background: REEL_BG[x] }}>
                      <ReelFace r={x} size={24} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="font-display text-outline mt-1 h-6 text-[18px] text-amber-200">{waitingLast ? 'テンパイ！' : ''}</div>
    </div>
  );
}

// ---------- 宝箱の舞台 ----------

function LightLeak({ level, hard }: { level: number; hard: boolean }) {
  const c = LIGHT[level];
  return (
    <>
      {/* ふたの隙間から漏れる光の筋 */}
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{ top: '45%', width: '74%', height: 10, background: c, boxShadow: `0 0 18px 6px ${c}, 0 0 46px 14px ${c}99`, transition: 'background .2s, box-shadow .2s' }}
      />
      {/* 上へ伸びる光 */}
      <span
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${hard ? 'glow-pulse' : ''}`}
        style={{
          bottom: '54%',
          width: '90%',
          height: 60 + level * 26,
          background: `linear-gradient(0deg, ${c}cc, transparent)`,
          clipPath: 'polygon(30% 100%, 70% 100%, 100% 0, 0 0)',
          transition: 'height .25s, background .2s',
        }}
      />
    </>
  );
}

const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  dx: `${((i * 53) % 60) - 30}px`,
  dur: `${1.8 + ((i * 7) % 10) / 10}s`,
  delay: `${((i * 13) % 20) / 10}s`,
  color: ['#ffcf4a', '#fff6c8', '#ff7a8a', '#5ab0ff', '#c58bff', '#5af2a8'][i % 6],
}));

function PremiumLayer({ dim }: { dim?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 45%, #fff6c8 0%, #ffcf4a 28%, #b06a08 62%, #3a1e04 100%)' }} />
      {/* 虹色の光の柱 */}
      <div
        className="pillar-pulse absolute top-0 bottom-0 left-1/2 w-28 -translate-x-1/2"
        style={{ background: 'linear-gradient(90deg, transparent, #ff7a8a88, #ffcf4acc, #fff, #5af2a8cc, #5ab0ff88, transparent)' }}
      />
      {/* 結果を読みやすくするため、結果の表示中は暗くする */}
      {dim && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/55" />}
      {CONFETTI.map((c, i) => (
        <span key={i} className="confetti" style={{ left: c.left, background: c.color, ['--dx' as string]: c.dx, ['--dur' as string]: c.dur, ['--delay' as string]: c.delay }} />
      ))}
    </div>
  );
}

function ReachLayer() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="pointer-events-none absolute inset-0 z-10 overflow-hidden bg-black/70">
      <div className="speed-lines absolute top-1/2 left-1/2 h-[200vmax] w-[200vmax] -translate-x-1/2 -translate-y-1/2" />
      <motion.div
        initial={{ scale: 3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.22 }}
        className="font-display text-outline absolute top-[8%] right-0 left-0 text-center text-[54px] text-fuchsia-200"
      >
        ！？
      </motion.div>
    </motion.div>
  );
}

// ---------- 画面 ----------

export function ChestScreen() {
  const game = useBattle((s) => s.game)!;
  const settings = useBattle((s) => s.settings);
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const chest = game.chest!;
  const locked = !chest.unlocked;
  const look = chest.spec.rarity;
  const [heroId, setHeroId] = useState(() => (!game.activeScene && game.world?.turn) || bestHero(sceneHeroes(game), (h) => statChance(h, locked ? 'dex' : 'luk')));
  const [focus, setFocus] = useState(0);
  const [recipientId, setRecipientId] = useState<string>();
  const opened = !!chest.contents;
  const roll = chest.lastRoll?.kind === 'luck' ? chest.lastRoll : undefined;
  const grade: Rarity = chest.grade ?? roll?.grade ?? look;
  const speed = speedFactor(settings);

  // この端末で開けた時だけ演出する（再開した時は結果をそのまま見せる）
  const [stepIdx, setStepIdx] = useState<number | null>(null);
  const timeline = useMemo(() => (roll && roll.grade ? buildTimeline(roll) : []), [roll]);
  const step = stepIdx === null ? undefined : timeline[stepIdx];
  const animating = !!step && step.kind !== 'result';
  const pendingOpen = useRef(false);

  useEffect(() => {
    if (pendingOpen.current && opened && timeline.length) {
      pendingOpen.current = false;
      setStepIdx(0);
    }
  }, [opened, timeline]);

  useEffect(() => {
    if (!step || step.kind === 'result') return;
    if (step.kind === 'light' && step.level > 0) vibrate(settings, VIBRATION.chestStep);
    if (step.kind === 'reach') vibrate(settings, VIBRATION.chestReach);
    if (step.kind === 'premium') vibrate(settings, VIBRATION.chestLegend);
    // 音（K6）。簡易カットインでは、光は最後の段だけ鳴らす
    const lastLight = Math.max(...timeline.map((s) => (s.kind === 'light' ? s.level : -1)));
    if (step.kind === 'light' && (settings.cutinMode !== 'simple' || step.level === lastLight)) playSound(`sfx_chest_glow${step.level + 1}` as SfxId);
    if (step.kind === 'shake') playSound('sfx_chest_shake');
    if (step.kind === 'reach') playSound('sfx_chest_reach');
    if (step.kind === 'premium') playSound('sfx_chest_legend');
    const t = setTimeout(() => setStepIdx((i) => (i === null ? i : i + 1)), (step.dur * 1000) / speed);
    return () => clearTimeout(t);
    // settings は振動の有無だけなので段取りの再実行はしない
  }, [stepIdx, speed]);

  const skip = () => {
    if (animating) setStepIdx(timeline.length - 1);
  };

  // 今の光の段階（-1 = まだ光っていない）
  let light = -1;
  if (stepIdx !== null) for (let i = 0; i <= stepIdx; i++) if (timeline[i]?.kind === 'light') light = (timeline[i] as { level: number }).level;
  const passed = (kind: Step['kind']) => stepIdx !== null && timeline.slice(0, stepIdx + 1).some((s) => s.kind === kind);
  const showResult = opened && !animating;

  // 帯グラフ: 開ける前 = 今の設定での確率 / 演出中 = スロット後にずれる / 結果 = 当たった格を強調
  const hero = sceneHeroes(game).find((h) => h.id === heroId) ?? sceneHeroes(game)[0];
  const chance = statChance(hero, 'luk', 'luck');
  const slots = BALANCE.chestLuckSlots;
  const expected = useMemo(() => expectedChestOdds(look, slots, Math.min(focus, slots, hero.focus), chance), [look, slots, focus, hero.focus, chance]);
  const perfectOdds = useMemo(() => chestOdds(look, slots), [look, slots]);
  const shownOdds = !opened ? expected : roll?.odds && (passed('shift') || showResult || !roll.oddsBefore) ? roll.odds : (roll?.oddsBefore ?? chestOdds(look, 0));

  const r = RARITY_STYLE[showResult ? grade : look];
  const title = chest.spec.big ? `大宝箱（${CHEST_NAME[look]}）` : CHEST_NAME[look];
  const reach = step?.kind === 'reach';
  const premium = step?.kind === 'premium' || (showResult && grade === 'legend' && stepIdx !== null);
  const shakeClass = step?.kind === 'omen' ? 'chest-rattle' : step?.kind === 'shake' || step?.kind === 'light' ? (light >= 2 ? 'chest-shake-hard' : 'chest-shake') : '';

  return (
    <Screen>
      <div className="relative min-h-0 flex-1 overflow-hidden" onClick={skip}>
        <BattleBackground kind={sceneBackground(game)} className="absolute inset-0 h-full w-full opacity-35" />
        {premium && <PremiumLayer dim={showResult} />}
        <AnimatePresence>{reach && <ReachLayer key="reach" />}</AnimatePresence>
        {/* 光が上がった瞬間のフラッシュ */}
        <AnimatePresence>
          {step?.kind === 'light' && step.level > 0 && (
            <motion.div
              key={`flash${stepIdx}`}
              initial={{ opacity: 0.75 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="pointer-events-none absolute inset-0 z-30"
              style={{ background: LIGHT[step.level] }}
            />
          )}
        </AnimatePresence>

        <div className="relative z-20 flex h-full flex-col items-center overflow-y-auto overscroll-contain px-3 pt-3">
          <div className="font-display text-outline text-[22px]" style={{ color: RARITY_STYLE[look].color }}>
            {title}
            {locked && <Lock size={18} className="ml-1 inline text-amber-200" />}
          </div>

          {/* 演出中のリール */}
          {roll && stepIdx !== null && animating && (
            <div className="mt-2">
              <Reels results={roll.results} speed={speed} />
            </div>
          )}

          {!opened && <label className="flex items-center gap-2 text-[13px]">報酬を受け取る人<select aria-label="報酬を受け取る人" value={recipientId ?? heroId} onChange={e => setRecipientId(e.target.value)} className="min-h-11 max-w-[180px] rounded bg-zinc-900 px-2 text-[13px]">{sceneHeroes(game).map(h => <option key={h.id} value={h.id}>{h.playerId}・{h.name}</option>)}</select></label>}
          {/* 宝箱 */}
          <motion.div
            animate={reach || step?.kind === 'premium' ? { y: -14, scale: 1.12 } : showResult ? { y: 0, scale: [0.85, 1.15, 1] } : { y: 0, scale: 1 }}
            transition={{ duration: showResult ? 0.45 : 0.3 }}
            className="relative my-2 flex h-[150px] w-[184px] shrink-0 items-center justify-center"
          >
            <span className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(closest-side, ${showResult ? r.glow : light >= 0 ? `${LIGHT[light]}88` : RARITY_STYLE[look].glow}, transparent)` }} />
            {/* レア以上: 格の色の後光（光の筋がゆっくり回る） */}
            {showResult && rarityIndex(grade) >= 1 && (
              <span
                className="speed-lines pointer-events-none absolute -inset-[60%] rounded-full opacity-70"
                style={{ background: `repeating-conic-gradient(from 0deg, ${r.glow} 0deg 6deg, transparent 6deg 18deg)`, maskImage: 'radial-gradient(closest-side, #000 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(closest-side, #000 30%, transparent 75%)' }}
                data-halo
              />
            )}
            <div className={`relative h-[150px] w-[184px] ${shakeClass}`}>
              <ChestImage rarity={look} open={showResult} className="h-full w-full" />
              {/* 開いた瞬間: 中からはじける光（描いた宝箱は閉じた姿だけなので、光で開いたことを見せる） */}
              {showResult && (
                <>
                  <motion.span
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{ background: `radial-gradient(closest-side, #fff8e0, ${r.glow} 45%, transparent)` }}
                    initial={{ opacity: 0.95, scale: 0.4 }}
                    animate={{ opacity: 0, scale: 2.2 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  />
                  <motion.span
                    className="pointer-events-none absolute inset-[-10%] rounded-full border-4"
                    style={{ borderColor: r.glow }}
                    initial={{ opacity: 0.9, scale: 0.5 }}
                    animate={{ opacity: 0, scale: 1.8 }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05 }}
                  />
                </>
              )}
              {light >= 0 && !showResult && <LightLeak level={light} hard={light >= 2} />}
              {step?.kind === 'omen' && (
                <span className="pointer-events-none absolute inset-0">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 1, x: 0, y: 0 }}
                      animate={{ opacity: 0, x: (i - 2) * 26, y: -40 - (i % 2) * 18 }}
                      transition={{ duration: 0.7 }}
                      className="absolute top-[45%] left-1/2"
                    >
                      <Sparkles size={18} className="text-amber-200" />
                    </motion.span>
                  ))}
                </span>
              )}
            </div>
            {locked && !opened && <Lock size={28} className="absolute bottom-0 rounded-full bg-zinc-900 p-1 text-amber-200" />}
          </motion.div>

          {/* 確率の帯 */}
          {!showResult && (
            <div className="mt-2 w-full max-w-[380px] rounded-xl border border-amber-300/25 bg-black/55 px-2 py-1.5" data-chest-odds>
              <OddsBar odds={shownOdds} label={!opened ? (locked ? '中身の格の確率（鍵を開けた後に運で上げられる）' : `${hero.name}・フォーカス${focus}で開けた時の確率`) : passed('shift') ? 'スロットの結果で確率が上がった！' : '中身の格の確率'} duration={REVEAL_TIMING.oddsShift / speed} height={18} />
              {!opened && !locked && (
                <div className="mt-1 opacity-80">
                  <OddsBar odds={perfectOdds} label="完全成功（3つ全部成功）なら" height={12} />
                </div>
              )}
            </div>
          )}

          {/* レジェンドの文字 */}
          <AnimatePresence>
            {step?.kind === 'premium' && (
              <motion.div
                initial={{ scale: 4, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="font-display text-outline text-[56px] leading-none"
                style={{ color: '#fff6c8', textShadow: '0 0 24px #ffcf4a, 0 2px 0 #7a4a08' }}
              >
                伝 説
              </motion.div>
            )}
          </AnimatePresence>

          {/* 鍵開けの結果 */}
          {chest.lastRoll?.kind === 'lock' && !opened && (
            <div className="flex flex-col items-center gap-1">
              <RollStrip results={chest.lastRoll.results} />
              {chest.lastRoll.success ? (
                <div className="text-[15px] font-bold text-emerald-300">鍵が開いた！ 次は運のスロットで宝箱を開けよう</div>
              ) : (
                <div className="text-center">
                  <div className="text-[15px] font-bold text-red-300">{chest.lastRoll.trap}</div>
                  <div className="text-[12px] text-zinc-400">鍵はまだ閉まっている。もう一度挑戦するか、立ち去れます</div>
                </div>
              )}
            </div>
          )}

          {/* 結果 */}
          {showResult && (
            <div className="flex w-full max-w-[420px] flex-col items-center gap-1 pb-3">
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: [0.4, 1.15, 1], opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center rounded-xl border-2 px-4 py-1"
                style={{ borderColor: r.color, background: 'rgba(0,0,0,.65)', boxShadow: `0 0 ${10 + rarityIndex(grade) * 10}px ${r.glow}` }}
              >
                <div className="font-display text-outline text-[26px] leading-8" style={{ color: r.color }}>
                  {r.name}
                  {grade === 'legend' ? '！！' : grade === 'epic' ? '！' : ''}
                </div>
                {roll?.gradeChance !== undefined && (
                  <div className="text-[13px] font-bold text-amber-100">{rarityIndex(grade) >= 1 ? `${fmtPct(roll.gradeChance)}を引き当てた！` : `出る確率 ${fmtPct(roll.gradeChance)}`}</div>
                )}
              </motion.div>
              {roll && (
                <div className="flex items-center gap-1.5 text-[12px] text-zinc-400">
                  <span>運のスロット</span>
                  <RollStrip results={roll.results} neutral small />
                </div>
              )}
              {roll?.odds && <OddsBar odds={roll.odds} highlight={grade} height={8} />}
              {/* 手に入れた物: 格の色の縁と金の四隅 */}
              <div className="panel-ornate mt-1 w-full rounded-xl border-2 p-1.5" style={{ borderColor: r.color, background: 'rgba(0,0,0,.55)', boxShadow: `0 0 14px ${r.glow}` }} data-loot-frame>
                <LootList loot={chest.contents!} />
                <div className="mt-1 text-center text-[12px] text-zinc-400">装備品は「パーティ・装備」から誰にでも装備できます</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="panel relative z-20 shrink-0 rounded-t-2xl px-3 pt-2 pb-3">
        {animating ? (
          <button onClick={skip} className="btn btn-dark flex h-12 w-full items-center justify-center gap-1 rounded-xl text-[15px] font-bold">
            <ChevronsRight size={20} /> タップで結果まで飛ばす
          </button>
        ) : !opened ? (
          <>
            <CheckPanel
              heroes={sceneHeroes(game).filter(h => !game.world || game.activeScene || chest.tile === undefined || h.id === game.world.turn)}
              heroId={heroId}
              setHeroId={setHeroId}
              focus={focus}
              setFocus={setFocus}
              stat={locked ? 'dex' : 'luk'}
              tag={locked ? 'lock' : 'luck'}
              slots={locked ? BALANCE.lockSlots : slots}
              need={locked ? BALANCE.lockNeed : slots}
              successLabel={locked ? '鍵が開く（0成功は罠：全員5ダメージ）' : '完全成功'}
              bonusOnly={!locked}
            />
            <div className="mt-2 grid grid-cols-[1fr_2fr] gap-2">
              <button onClick={() => dispatchGame({ type: 'LEAVE_CHEST', playerId: LOCAL_PLAYER })} className="btn btn-dark h-12 rounded-xl text-[14px] font-bold">
                {chest.spec.big ? '開けずに去る' : '立ち去る'}
                <VoteChips cmd={{ type: 'LEAVE_CHEST', playerId: LOCAL_PLAYER }} />
              </button>
              <button
                onClick={() => {
                  if (!locked) pendingOpen.current = true;
                  dispatchGame({ type: 'OPEN_CHEST', playerId: LOCAL_PLAYER, heroId, recipientId: recipientId ?? heroId, focusUsed: focus });
                  setFocus(0);
                }}
                className="btn btn-gold font-display h-12 rounded-xl text-[18px]"
              >
                {locked ? '鍵を開ける' : '運のスロットで開ける'}
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => dispatchGame({ type: 'LEAVE_CHEST', playerId: LOCAL_PLAYER })} className="btn btn-gold font-display h-12 w-full rounded-xl text-[18px]">
            {chest.spec.big ? 'ダンジョン制覇！' : '先へ進む'}
            <VoteChips cmd={{ type: 'LEAVE_CHEST', playerId: LOCAL_PLAYER }} />
          </button>
        )}
      </div>
    </Screen>
  );
}


