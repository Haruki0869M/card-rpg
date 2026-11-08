import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { TIMING } from '../../data/balance';
import { speedFactor, useBattle } from '../../store/battleStore';

const TONE: Record<string, string> = {
  damage: 'text-[22px] text-red-300', block: 'text-[14px] text-sky-200',
  status: 'text-[14px] text-fuchsia-200', zero: 'text-[14px] text-zinc-100',
  ability: 'text-[12px] font-display text-amber-100', heal: 'text-[17px] text-emerald-200',
  resource: 'text-[14px] text-yellow-100',
};
/** 段の高さ（px）。数字は1行、能力の名前は2行まで */
const LANE = 28;

/**
 * 受けたキャラ（敵・味方）の頭のすぐ上に出す数字。各キャラ最大3段。固定した段番号を使い、先の文字が消えても重ならない。
 * 黒い札ではなく、縁取りの文字で出す（どのキャラの上に出たかが分かるように）
 */
export function UnitPopups({ unitId, top = '20%' }: { unitId: string; top?: string }) {
  const popups = useBattle(s => s.popups), settings = useBattle(s => s.settings), reduced = useReducedMotion();
  const dur = TIMING.resultPopup / speedFactor(settings), simple = reduced || settings.cutinMode === 'simple';
  return <div className="pointer-events-none absolute inset-x-0 z-30 flex justify-center" style={{ top }}>
    <AnimatePresence>
      {popups.filter(p => p.unitId === unitId).map(p => <motion.div key={p.id}
        initial={{ opacity: 1, y: 0 }} animate={{ opacity: [1, 1, 0], y: simple ? [0, 0, 0] : [0, -12, -16] }} exit={{ opacity: 0, transition: { duration: 0 } }}
        transition={{ duration: dur, times: [0, 0.8, 1], ease: 'easeOut' }}
        className={`text-outline absolute w-full max-w-[120px] text-center font-black leading-[22px] break-words ${TONE[p.tone]}`}
        style={{ top: p.lane * LANE, textShadow: '0 0 4px rgba(0,0,0,.95), 0 1px 2px #000' }} title={p.text} data-popup-unit={p.unitId} data-popup-tone={p.tone} data-popup-lane={p.lane}>
        <span className={`line-clamp-2 ${p.tone === 'ability' ? 'rounded bg-black/55 px-1 leading-4' : ''}`}>{p.text}</span>
      </motion.div>)}
    </AnimatePresence>
  </div>;
}
