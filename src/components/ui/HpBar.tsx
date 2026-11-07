import { Shield } from 'lucide-react';
import { memo } from 'react';

/** HPバー（減った分が少し遅れて縮む「残像」付き。transform だけで動かす） */
export const HpBar = memo(function HpBar({
  hp,
  max,
  block,
  tone,
  height = 14,
  incoming = 0,
}: {
  hp: number;
  max: number;
  block: number;
  tone: 'enemy' | 'ally';
  height?: number;
  /** 次の敵の攻撃で減りそうな量（HPバーの上に赤く点滅させる） */
  incoming?: number;
}) {
  const ratio = Math.max(0, Math.min(1, hp / max));
  const fill = tone === 'enemy' ? 'linear-gradient(180deg,#ff6a5a,#c41e2a 55%,#7a0a14)' : 'linear-gradient(180deg,#7dffa8,#22b45a 55%,#0d6a30)';
  return (
    <div className="flex w-full items-center gap-0.5">
      {block > 0 && (
        <span className="relative flex shrink-0 items-center justify-center text-sky-200" style={{ height: height + 6, width: height + 6 }}>
          <Shield size={height + 6} className="absolute fill-sky-700 text-sky-200" strokeWidth={2} />
          <span className="relative text-[12px] leading-none font-black text-white tabular-nums">{block}</span>
        </span>
      )}
      <div
        className="relative min-w-0 flex-1 overflow-hidden rounded-[4px] border border-black/80 bg-[#140c10]"
        style={{ height, boxShadow: block > 0 ? '0 0 0 1.5px #7ac8ff' : 'inset 0 1px 2px rgba(0,0,0,.8)' }}
      >
        <div
          className="absolute inset-y-0 left-0 w-full origin-left bg-[#f6e3a0]"
          style={{ transform: `scaleX(${ratio})`, transition: 'transform 500ms ease-out 250ms' }}
        />
        <div
          className="absolute inset-y-0 left-0 w-full origin-left"
          style={{ transform: `scaleX(${ratio})`, transition: 'transform 140ms ease-out', background: fill }}
        />
        {incoming > 0 && hp > 0 && (
          // 減りそうな分（ブロックで防げる分は除く）を赤く点滅
          <div
            className="blink-red absolute inset-y-0"
            style={{
              left: `${(Math.max(0, hp - Math.max(0, incoming - block)) / max) * 100}%`,
              width: `${(Math.min(hp, Math.max(0, incoming - block)) / max) * 100}%`,
              background: 'repeating-linear-gradient(135deg,#ff3a3a 0 4px,#a80010 4px 8px)',
            }}
          />
        )}
        <div className="absolute inset-x-0 top-0 h-[40%] bg-white/20" />
        <div className="text-outline relative flex h-full items-center justify-center text-[12px] leading-none font-bold text-white tabular-nums">
          {hp}/{max}
        </div>
      </div>
    </div>
  );
});
