// ===== 手番のカットイン（docs/tasks/turn-cutin.md） =====
// 手番が移った時: この端末で操作するキャラの番なら、画面を暗くしてプレイヤーの色の帯を滑り込ませる（タップで消せる）。
// 画面の切り替えはこの後ろで済んでいるので、消えると新しい場面が見える。ほかの人の番なら上に小さなお知らせ。
// 見た目だけ。ゲームの状態・同期は待たせない。
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { TIMING } from '../../data/balance';
import { PLAYER_COLOR } from '../../data/theme';
import { WORLD_SCENE } from '../../engine';
import { useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import { HeroFace } from './game';

/** 物語を読んでいる間は、手番の帯は出さない（物語を閉じたら出す） */
export const cutinToShow = <T,>(cutin: T | null, storyOpen: boolean): T | null => (storyOpen ? null : cutin);

export function TurnCutin() {
  const cutin = useBattle((s) => s.turnCutin);
  const full = useBattle((s) => s.full);
  const dismiss = useBattle((s) => s.dismissTurnCutin);
  const settings = useBattle((s) => s.settings);
  const reduced = useReducedMotion();
  const short = settings.fastMode || settings.cutinMode === 'simple' || !!reduced;
  // 物語（冒頭・地域の紹介・制覇後の物語）を読んでいる間は、手番の帯を後回しにする。物語を閉じてから出す（物語が隠れないように）
  const storyOpen = !!full?.world?.story;
  const shown = cutinToShow(cutin, storyOpen);
  const seconds = cutin && !cutin.mine ? TIMING.turnNotice : short ? TIMING.turnCutinShort : TIMING.turnCutin;
  useEffect(() => {
    if (!cutin || storyOpen) return;
    const t = setTimeout(() => dismiss(cutin.id), seconds * 1000);
    return () => clearTimeout(t);
  }, [cutin, storyOpen, seconds, dismiss]);
  const hero = cutin && full?.heroes.find((h) => h.id === cutin.heroId);
  const exp = cutin && cutin.scene !== WORLD_SCENE ? full?.expeditions?.find((x) => x.id === cutin.scene) : undefined;
  const place = exp ? `${exp.dungeon?.name ?? 'ダンジョン'}（ダンジョン）` : '世界マップ';
  const who = hero ? (exp && exp.heroes.length > 1 ? `${hero.name}たち` : hero.name) : '';
  const room = useOnline.getState().room;
  const seat = hero ? room?.seatName(hero.playerId) : undefined;
  // 1台を回して遊ぶ時（この端末に2人以上のプレイヤー）は、渡す相手を一言。
  // 世界マップには元から受け渡しの画面（「スマホを渡して、タップで始める」）があるので、ダンジョンの番の時だけ
  const hotseat = !room && !!exp && new Set(full?.heroes.filter((h) => !h.retired).map((h) => h.playerId)).size > 1;
  const color = hero ? PLAYER_COLOR[hero.playerId] : '#ffd76a';
  return (
    <AnimatePresence>
      {shown && hero && shown.mine && (
        <motion.div
          key={cutin.id}
          className="absolute inset-0 z-[160] flex items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: short ? 0.08 : 0.15 }}
          onClick={() => dismiss(cutin.id)}
          role="status"
          aria-live="assertive"
          data-turn-cutin={hero.id}
        >
          <div className="absolute inset-0 bg-black/60" />
          <motion.div
            className="relative w-full py-3"
            initial={short ? { opacity: 0 } : { x: '-110%' }}
            animate={short ? { opacity: 1 } : { x: 0 }}
            transition={short ? { duration: 0.08 } : { type: 'spring', stiffness: 420, damping: 34 }}
            style={{ background: `linear-gradient(90deg, ${color}ee 0%, ${color}cc 55%, ${color}33 100%)`, boxShadow: `0 0 24px ${color}88` }}
          >
            <div className="absolute inset-x-0 top-0 h-[3px] bg-white/70" />
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/70" />
            <div className="flex items-center gap-3 px-4">
              <span className="shrink-0 rounded-full border-2 border-white/90 shadow-lg">
                <HeroFace hero={hero} size={64} />
              </span>
              <div className="min-w-0 flex-1 text-black">
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-black/80 px-1.5 text-[13px] font-bold text-white">{hero.playerId}</span>
                  {seat && <span className="truncate text-[13px] font-bold">{seat}さん</span>}
                </div>
                <div className="font-display truncate text-[26px] leading-8 drop-shadow-[0_1px_0_rgba(255,255,255,.6)]">{who}の番！</div>
                <div className="truncate text-[14px] font-bold">{place}</div>
              </div>
            </div>
          </motion.div>
          {hotseat && (
            <div className="absolute inset-x-0 top-[calc(50%+72px)] text-center text-[14px] font-bold text-white drop-shadow" data-turn-hotseat>
              スマホを {hero.playerId} さんに渡してください
            </div>
          )}
          <div className={`absolute inset-x-0 text-center text-[12px] text-zinc-300 ${hotseat ? 'top-[calc(50%+100px)]' : 'top-[calc(50%+72px)]'}`}>タップで閉じる</div>
        </motion.div>
      )}
      {shown && hero && !shown.mine && (
        <motion.div
          key={cutin.id}
          className="pointer-events-none absolute inset-x-2 top-14 z-[155] flex justify-center"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          role="status"
          data-turn-notice={hero.id}
        >
          <span className="flex items-center gap-2 rounded-xl border bg-black/85 px-3 py-1.5 text-[14px] text-zinc-100 shadow-lg" style={{ borderColor: color }}>
            <HeroFace hero={hero} size={28} />
            <span>
              <b style={{ color }}>{hero.playerId}</b> {who}の番です<span className="text-[12px] text-zinc-400">（{place}）</span>
            </span>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
