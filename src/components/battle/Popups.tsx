import { AnimatePresence, motion } from 'framer-motion';
import { TIMING } from '../../data/balance';
import { speedFactor, useBattle } from '../../store/battleStore';

const TONE: Record<string, string> = {
  damage: 'text-[22px] text-red-400',
  block: 'text-[18px] text-sky-300',
  status: 'text-[15px] text-fuchsia-300',
  zero: 'text-[16px] text-zinc-300',
  ability: 'text-[15px] font-display text-amber-200',
};

/** ダメージ数値・特殊能力名などのポップアップ（操作をブロックしない） */
export function UnitPopups({ unitId, top = '20%' }: { unitId: string; top?: string }) {
  const popups = useBattle((s) => s.popups);
  const fast = useBattle((s) => s.settings.fastMode);
  const dur = TIMING.resultPopup / speedFactor({ fastMode: fast, vibration: false });
  const mine = popups.filter((p) => p.unitId === unitId);
  return (
    <div className="pointer-events-none absolute inset-x-0 z-30 flex justify-center" style={{ top }}>
      <AnimatePresence>
        {mine.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, y: 0, scale: p.tone === 'damage' ? 1.5 : 1.1 }}
            animate={{ opacity: [1, 1, 0], y: -34, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur + 0.15, ease: 'easeOut' }}
            className={`text-outline absolute font-black whitespace-nowrap ${TONE[p.tone]}`}
            style={{ top: i * 6 - (p.tone === 'ability' ? 22 : 0) }}
          >
            {p.tone === 'ability' ? `《${p.text}》` : p.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
