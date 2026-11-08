import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { getPet } from '../../data/pets';
import { useBattle } from '../../store/battleStore';

/** お供の発動は一度だけここに表示。操作やエンジンの進行は止めない。 */
export function AbilityCutins() {
  const notices = useBattle(s => s.cutins), mode = useBattle(s => s.settings.cutinMode);
  const heroes = useBattle(s => s.full?.heroes);
  const reduced = useReducedMotion(), simple = mode === 'simple' || reduced;
  return <div className="pointer-events-none absolute inset-x-2 top-14 z-[150] flex flex-col items-start gap-1" aria-live="polite" aria-atomic="false" data-ability-cutins>
    <AnimatePresence>
      {notices.map(n => <motion.div key={n.id} initial={simple ? { opacity: 0 } : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: simple ? 0.05 : 0.12 }} className={`flex max-w-[calc(100%-44px)] items-center gap-2 rounded-xl border px-2 py-1.5 text-[14px] leading-5 ${simple ? 'border-white/25 bg-black/90' : 'border-pink-200/70 bg-[#25162a]/95 shadow-lg'}`} data-ability-cutin={n.unitId}>
        <span className={simple ? 'text-[16px]' : 'text-[22px]'}>{n.source?.id ? getPet(n.source.id).icon : '✦'}</span>
        <span className="min-w-0 break-words"><b className="text-pink-100">{n.source?.label ?? 'お供'}</b>：{n.source?.effectName ?? n.name}！{(n.count ?? 1) > 1 && <span className="ml-1 text-[12px]">×{n.count}</span>}<span className="block text-[12px] leading-4 text-zinc-300">{heroes?.find(h => h.id === n.unitId)?.name ?? n.unitId}のお供</span></span>
      </motion.div>)}
    </AnimatePresence>
  </div>;
}
