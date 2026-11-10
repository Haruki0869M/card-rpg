// ===== ピンの見た目（ステップ2）: 「P2: こっち！」の小さな札と、画面の上の帯。世界マップ・店でも使える =====
import { MapPin } from 'lucide-react';
import { PLAYER_COLOR } from '../../data/theme';
import { pinWord, type ShownPin } from '../../store/pins';

/** 指された物に付ける札（席の色）。word を省くと、ピンの種類の言葉（こっち！・ほしい！など） */
export function PinChips({ pins, word, className = '' }: { pins: ShownPin[]; word?: string; className?: string }) {
  if (!pins.length) return null;
  return (
    <span className={`pointer-events-none inline-flex flex-wrap gap-0.5 ${className}`} data-pin-chips>
      {pins.map((p) => (
        <span key={p.uid} className="pin-pop rounded px-1 text-[12px] leading-4 font-bold whitespace-nowrap text-black shadow-[0_0_6px_rgba(0,0,0,.6)]" style={{ background: PLAYER_COLOR[p.seat] }}>
          {p.seat}: {word ?? pinWord(p.target)}
        </span>
      ))}
    </span>
  );
}

/** 画面の上に出す帯（だれが・何を指したか）。describe = 指した物の名前 */
export function PinBanner({ pins, describe }: { pins: ShownPin[]; describe: (p: ShownPin) => string }) {
  if (!pins.length) return null;
  return (
    <div className="pointer-events-none flex flex-col items-start gap-0.5" data-pin-banner>
      {pins.map((p) => (
        <span key={p.uid} className="pin-pop flex max-w-full items-center gap-1 rounded-lg border bg-black/80 px-2 py-0.5 text-[12px] leading-4 font-bold text-white" style={{ borderColor: PLAYER_COLOR[p.seat] }}>
          <MapPin size={13} style={{ color: PLAYER_COLOR[p.seat] }} className="shrink-0" />
          <span className="rounded px-1 text-black" style={{ background: PLAYER_COLOR[p.seat] }}>
            {p.seat}
          </span>
          <span className="truncate">
            {p.name !== p.seat ? `${p.name}: ` : ''}
            {pinWord(p.target)}（{describe(p)}）
          </span>
        </span>
      ))}
    </div>
  );
}
