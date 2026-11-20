import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLayoutEffect, useRef, useState } from 'react';
import { getPet } from '../../data/pets';
import { artImage } from '../../art/images';
import { useBattle } from '../../store/battleStore';

/** 上の帯（侵食度など。data-cutin-anchor の付いた要素）の下の端から、この距離だけ下げて出す */
const GAP = 6;

/** お供の本物の絵（毛色ごとの WebP）。絵が無ければ記号 */
function PetFace({ petId, color, size }: { petId: string; color?: string; size: number }) {
  const def = getPet(petId);
  const col = def.colors.find((c) => c.id === color) ?? def.colors[0];
  const img = artImage(`pet/${petId}-${col.id}`);
  return img
    ? <img src={img} alt="" draggable={false} className="shrink-0 object-contain" style={{ width: size, height: size, filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,.8))' }} data-cutin-pet-art={`${petId}-${col.id}`} />
    : <span className="shrink-0 text-center" style={{ width: size, fontSize: size * 0.8, lineHeight: 1 }}>{def.icon}</span>;
}

/** お供の発動は一度だけここに表示。操作やエンジンの進行は止めない。上の侵食度の帯には重ねない */
export function AbilityCutins() {
  const notices = useBattle(s => s.cutins), mode = useBattle(s => s.settings.cutinMode);
  const heroes = useBattle(s => s.full?.heroes);
  const reduced = useReducedMotion(), simple = mode === 'simple' || reduced;
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(56);
  // 帯の位置は画面ごとに違う（戦闘・世界マップ・場面の切り替えのタブ）。出ている間、毎コマ測る（扉の演出の後に戦闘の画面へ替わることがある）
  const shown = notices.length > 0;
  useLayoutEffect(() => {
    if (!shown) return;
    let raf = 0;
    const measure = () => {
      const parent = ref.current?.parentElement;
      if (parent) {
        const base = parent.getBoundingClientRect().top;
        const anchors = [...document.querySelectorAll<HTMLElement>('[data-cutin-anchor]')].filter((el) => el.getClientRects().length > 0);
        const bottom = Math.max(0, ...anchors.map((el) => el.getBoundingClientRect().bottom - base));
        const next = Math.round((bottom || 50) + GAP);
        setTop((t) => (t === next ? t : next));
      }
      raf = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(raf);
  }, [shown]);
  return <div ref={ref} className="pointer-events-none absolute inset-x-2 z-[150] flex flex-col items-start gap-1" style={{ top }} aria-live="polite" aria-atomic="false" data-ability-cutins>
    <AnimatePresence>
      {notices.map(n => {
        const owner = heroes?.find(h => h.id === n.unitId);
        const petId = n.source?.kind === 'pet' ? n.source.id : undefined;
        return <motion.div key={n.id} initial={simple ? { opacity: 0 } : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: simple ? 0.05 : 0.12 }} className={`flex max-w-[calc(100%-44px)] items-center gap-2 rounded-xl border px-2 py-1 text-[14px] leading-5 ${simple ? 'border-white/25 bg-black/90' : 'border-pink-200/70 bg-[#25162a]/95 shadow-lg'}`} data-ability-cutin={n.unitId}>
          {petId ? <PetFace petId={petId} color={owner?.pet?.petId === petId ? owner.pet.color : undefined} size={simple ? 28 : 40} /> : <span className={simple ? 'text-[16px]' : 'text-[22px]'}>✦</span>}
          <span className="min-w-0 break-words"><b className="text-pink-100">{n.source?.label ?? 'お供'}</b>：{n.source?.effectName ?? n.name}！{(n.count ?? 1) > 1 && <span className="ml-1 text-[12px]">×{n.count}</span>}<span className="block text-[12px] leading-4 text-zinc-300">{owner?.name ?? n.unitId}のお供</span></span>
        </motion.div>;
      })}
    </AnimatePresence>
  </div>;
}
