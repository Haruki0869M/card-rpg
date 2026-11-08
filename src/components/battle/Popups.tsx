import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { TIMING } from '../../data/balance';
import { speedFactor, useBattle } from '../../store/battleStore';

const TONE: Record<string, string> = {
  damage: 'text-[20px] text-red-300', block: 'text-[13px] text-sky-200',
  status: 'text-[13px] text-fuchsia-200', zero: 'text-[13px] text-zinc-100',
  ability: 'text-[12px] font-display text-amber-100', heal: 'text-[15px] text-emerald-200',
  resource: 'text-[13px] text-yellow-100',
};

/** 各キャラ最大3段。固定した段番号を使い、先の文字が消えても重ならない。 */
export function UnitPopups({ unitId, top = '20%' }: { unitId: string; top?: string }) {
  const popups = useBattle(s => s.popups), settings = useBattle(s => s.settings), reduced = useReducedMotion();
  const dur = TIMING.resultPopup / speedFactor(settings), simple = reduced || settings.cutinMode === 'simple';
  return <div className="pointer-events-none absolute inset-x-0 z-30 flex justify-center" style={{ top }}>
    <AnimatePresence>
      {popups.filter(p => p.unitId === unitId).map(p => <motion.div key={p.id}
        initial={{ opacity: 1, y: 0 }} animate={{ opacity: [1, 1, 0], y: simple ? [0, 0, 0] : [0, -12, -16] }} exit={{ opacity: 0, transition: { duration: 0 } }}
        transition={{ duration: dur, times: [0, 0.8, 1], ease: 'easeOut' }}
        className={`absolute w-full max-w-[112px] rounded-md bg-black/80 px-0.5 py-0.5 text-center font-bold leading-[16px] break-words ${TONE[p.tone]}`}
        style={{ top: p.lane * 34 }} title={p.text} data-popup-unit={p.unitId} data-popup-tone={p.tone} data-popup-lane={p.lane}>
        <span className="line-clamp-2">{p.text}</span>
      </motion.div>)}
    </AnimatePresence>
  </div>;
}
