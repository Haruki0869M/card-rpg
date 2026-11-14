import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { TIMING } from '../../data/balance';
import { speedFactor, useBattle } from '../../store/battleStore';
import { BATTLE_LAYER } from '../ui/layers';

const TONE: Record<string, string> = {
  damage: 'text-[22px] text-red-300', block: 'text-[14px] text-sky-200',
  status: 'text-[14px] text-fuchsia-200', zero: 'text-[14px] text-zinc-100',
  ability: 'text-[12px] font-display text-amber-100', heal: 'text-[17px] text-emerald-200',
  resource: 'text-[14px] text-yellow-100',
  break: 'text-[20px] font-display text-amber-200',
};
/** 段の高さ（px）。数字は1行、能力の名前は2行まで */
const LANE = 28;
/** 重なりの段階2以上のダメージ（Step C）: 数字を1.25倍（22px → 28px）にして金色に光らせる。見た目だけ（ダメージは同じ） */
const BIG_DAMAGE = 'text-[28px] text-amber-200';
const GOLD_GLOW = '0 0 6px rgba(251,191,36,.95), 0 0 14px rgba(251,191,36,.6), 0 1px 2px #000';
const SHADOW = '0 0 4px rgba(0,0,0,.95), 0 1px 2px #000';

/** 段階3: 数字の後ろに広がる金の輪。動きを減らす設定では広がらず、ふわっと消えるだけ */
function SynergyRing({ dur, gentle }: { dur: number; gentle: boolean }) {
  return <motion.span aria-hidden data-synergy-ring
    className="pointer-events-none absolute top-1/2 left-1/2 -mt-7 -ml-7 h-14 w-14 rounded-full border-2 border-amber-300/90"
    style={{ boxShadow: '0 0 10px rgba(251,191,36,.7), inset 0 0 8px rgba(251,191,36,.5)' }}
    initial={{ opacity: 0.9, scale: gentle ? 1 : 0.3 }} animate={{ opacity: 0, scale: gentle ? 1 : 1.8 }}
    transition={{ duration: dur, ease: 'easeOut' }} />;
}

/**
 * 受けたキャラ（敵・味方）の頭のすぐ上に出す数字。各キャラ最大3段。固定した段番号を使い、先の文字が消えても重ならない。
 * 黒い札ではなく、縁取りの文字で出す（どのキャラの上に出たかが分かるように）
 */
export function UnitPopups({ unitId, top = '20%', breakDrop = 0 }: { unitId: string; top?: string; /** 「⚡BREAK!」だけを下げる量（px）。敵の絵の真ん中寄りに出して、技名の帯の高さを避ける（実機の不具合④(2)） */ breakDrop?: number }) {
  const popups = useBattle(s => s.popups), settings = useBattle(s => s.settings), reduced = useReducedMotion();
  const dur = TIMING.resultPopup / speedFactor(settings), simple = reduced || settings.cutinMode === 'simple';
  return <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ top, zIndex: BATTLE_LAYER.unitPopup }}>
    <AnimatePresence>
      {popups.filter(p => p.unitId === unitId).map(p => <motion.div key={p.id}
        initial={{ opacity: 1, y: 0 }} animate={{ opacity: [1, 1, 0], y: simple ? [0, 0, 0] : [0, -12, -16] }} exit={{ opacity: 0, transition: { duration: 0 } }}
        transition={{ duration: dur, times: [0, 0.8, 1], ease: 'easeOut' }}
        className={`text-outline absolute w-full max-w-[120px] text-center font-black break-words ${p.tier ? `leading-[28px] ${BIG_DAMAGE}` : `leading-[22px] ${TONE[p.tone]}`}`}
        style={{ top: p.lane * LANE + (p.tone === 'break' ? breakDrop : 0), textShadow: p.tier ? GOLD_GLOW : SHADOW }} title={p.text} data-popup-unit={p.unitId} data-popup-tone={p.tone} data-popup-lane={p.lane} data-popup-tier={p.tier}>
        {p.tier === 3 && <SynergyRing dur={Math.min(0.6, dur * 0.6)} gentle={simple} />}
        <span className={`line-clamp-2 ${p.tone === 'ability' ? 'rounded bg-black/55 px-1 leading-4' : ''}`}>{p.text}</span>
      </motion.div>)}
    </AnimatePresence>
  </div>;
}
