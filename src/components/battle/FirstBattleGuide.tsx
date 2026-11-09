// ===== はじめての戦闘の案内（Step A ④） =====
// 画面の上（指や手札で隠れない所）に、3段の短い案内を出す。この端末だけの表示で、冒険の状態・乱数・同期は変えない。
// 押せるのは小さな×だけ。ほかは pointer-events: none なので、下の敵や味方はそのまま押せる。
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { GUIDE_TEXT, guideWanted, nextGuideStep, type GuideStep } from '../../store/help';
import { useProfile } from '../../store/profileStore';

const STEP_MARK = ['', '①', '②', '③'] as const;

export function FirstBattleGuide() {
  // 出すかどうかは戦闘の画面を開いた時に1回だけ決める（途中で設定が false になっても、この戦闘の案内は最後まで出す）
  const [active, setActive] = useState(() => guideWanted(useBattle.getState().settings, useProfile.getState().profile.battles.length));
  const [step, setStep] = useState<GuideStep>(1);
  const selecting = useBattle((s) => !!s.selection);
  const phase = useBattle((s) => s.battle.phase);
  // この端末で操作するキャラが、このターンにカードを1枚以上使ったか
  const played = useBattle((s) => s.battle.allies.some((a) => isLocalPlayer(a.playerId) && (a.played ?? 0) > 0));
  const setSettings = useBattle((s) => s.setSettings);
  const finished = useRef(false);
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    setSettings({ firstGuide: false });
  };

  useEffect(() => {
    if (!active) return;
    const next = nextGuideStep(step, { selecting, played });
    if (next !== step) setStep(next);
    // ③まで見たら「はじめての案内」は済み（次の戦闘では出さない）。この戦闘の③はそのまま出しておく
    if (next === 3) finish();
  }, [active, step, selecting, played]); // eslint-disable-line react-hooks/exhaustive-deps

  // 戦闘が終わったら済みにする（③まで行かずに勝った・負けた時も、次の戦闘では出さない）
  useEffect(() => {
    if (active && (phase === 'victory' || phase === 'defeat' || phase === 'escaped')) finish();
  }, [active, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const show = active && phase === 'ally';
  return (
    <div className="pointer-events-none relative z-30 h-0 shrink-0">
      <AnimatePresence>
        {show && (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-1.5 top-0.5 flex items-start gap-1 rounded-xl border border-amber-300/70 bg-black/85 py-1 pr-0.5 pl-2 shadow-lg"
            role="status"
            aria-live="polite"
            data-first-guide={step}
          >
            <span className="font-display shrink-0 pt-[3px] text-[16px] leading-5 text-amber-300" aria-hidden>
              {STEP_MARK[step]}
            </span>
            <span className="min-w-0 flex-1 pt-[3px] pb-0.5 text-[13px] leading-[18px] text-amber-50">{GUIDE_TEXT[step]}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                finish();
                setActive(false);
              }}
              aria-label="案内を閉じる"
              className="btn pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-300"
              data-first-guide-close
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
