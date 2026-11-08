// ===== お供を迎える時の「シルエット → ポン！」の演出（フェーズ3 項目1。見た目だけ。乱数・保存は使わない） =====
// 毛色はエンジンが先に決めた物（hero.petOfferColors）を見せるだけ。タップで演出を飛ばせる。
import { useEffect, useRef, useState } from 'react';
import { petCry } from '../../audio/cues';
import { playSound } from '../../audio/player';
import { useBattle } from '../../store/battleStore';
import { PetToken } from './PetToken';

/** 演出の長さ（秒）。full = 初めて開いた時、short = 別の子を選び直した時、quick = 動きを減らす・高速モード */
export const PET_REVEAL_SECONDS = { full: 0.6, short: 0.3, quick: 0.2 } as const;

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** 集まってくる光の粒（角度・距離） */
const SPARKS = [0, 50, 105, 160, 215, 270, 320].map((deg, i) => ({ deg, dist: 0.55 + (i % 3) * 0.08, delay: (i % 4) * 0.06 }));

export function PetReveal({ petId, color, name, rare, isNew, short, size, onRevealed }: {
  petId: string;
  color: string;
  name: string;
  rare: boolean;
  isNew: boolean;
  /** 別の子を選び直した時は短い版 */
  short: boolean;
  size: number;
  onRevealed: () => void;
}) {
  const fast = useBattle((s) => s.settings.fastMode);
  const quick = fast || reducedMotion();
  const seconds = quick ? PET_REVEAL_SECONDS.quick : short ? PET_REVEAL_SECONDS.short : PET_REVEAL_SECONDS.full;
  const [shown, setShown] = useState(false);
  const done = useRef(false);
  const reveal = () => {
    if (done.current) return;
    done.current = true;
    setShown(true);
    playSound(petCry(petId), { quiet: true });
    onRevealed();
  };
  useEffect(() => {
    const t = setTimeout(reveal, seconds * 1000);
    return () => clearTimeout(t);
    // 開いた時に1回だけ（毛色は開いた時にもう決まっている）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <button
      type="button"
      onClick={reveal}
      className="relative flex items-center justify-center"
      style={{ width: size + 24, height: size + 24 }}
      aria-label={shown ? `${name}の姿` : 'タップしてすぐ見る'}
      data-pet-reveal={shown ? 'shown' : 'silhouette'}
    >
      {!shown && !quick && SPARKS.map((s, i) => (
        <span
          key={i}
          aria-hidden
          className="pet-spark pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-amber-100"
          style={{ ['--sx' as string]: `${Math.cos((s.deg * Math.PI) / 180) * size * s.dist}px`, ['--sy' as string]: `${Math.sin((s.deg * Math.PI) / 180) * size * s.dist}px`, animationDelay: `${s.delay}s`, animationDuration: `${seconds}s` }}
        />
      ))}
      {shown && !quick && <span aria-hidden className="pet-pop-flash pointer-events-none absolute rounded-full bg-white" style={{ width: size, height: size }} />}
      <span
        key={shown ? 'shown' : 'hidden'}
        className={`${shown ? (quick ? '' : 'pet-pop') : quick ? '' : 'pet-silhouette-bob'} ${shown && rare ? 'pet-rare-reveal rounded-full' : ''} block p-2`}
        style={shown ? undefined : { filter: 'brightness(0) drop-shadow(0 0 6px rgba(255,236,190,.55))' }}
      >
        <PetToken pet={{ petId, color, name, love: 0 }} size={size} />
      </span>
      {shown && isNew && (
        <span className="pet-new-badge font-display absolute right-0 top-1 rounded-full bg-pink-500 px-2 py-0.5 text-[13px] text-white shadow-[0_0_8px_#f9a8d4]" data-pet-new>
          NEW!
        </span>
      )}
    </button>
  );
}
