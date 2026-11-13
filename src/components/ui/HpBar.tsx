import { Shield } from 'lucide-react';
import { memo } from 'react';
import { TIMING } from '../../data/balance';
import { speedFactor, useBattle } from '../../store/battleStore';

/** HPバー（減った分が少し遅れて縮む「残像」付き。transform だけで動かす） */
export const HpBar = memo(function HpBar({
  hp,
  max,
  block,
  tone,
  height = 14,
  incoming = 0,
  marks,
}: {
  hp: number;
  max: number;
  block: number;
  tone: 'enemy' | 'ally';
  height?: number;
  /** 次の敵の攻撃で減りそうな量（HPバーの上に赤く点滅させる） */
  incoming?: number;
  /** ボスの段階の境目（HPの割合 0〜1。細い縦線と小さな▼。文字は出さない。2026-11-14） */
  marks?: number[];
}) {
  const ratio = Math.max(0, Math.min(1, hp / max));
  const k = useBattle((s) => 1 / speedFactor(s.settings));
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
        {/* 減った分の残像（薄い黄色の帯）: 0.45秒残ってから追いかけて減る（段階B・段階4。高速モードは半分） */}
        <div
          className="absolute inset-y-0 left-0 w-full origin-left"
          style={{ transform: `scaleX(${ratio})`, transition: `transform ${Math.round(TIMING.hpGhostChase * 1000 * k)}ms ease-in ${Math.round(TIMING.hpGhostHold * 1000 * k)}ms`, background: 'linear-gradient(180deg,#fff9cf,#ffec8a)' }}
          data-hp-ghost
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
        {marks?.map((m) => (
          // 境目の線（▼は文字ではなく三角の形。小さな字にしないため）
          <div key={m} className="pointer-events-none absolute inset-y-0 w-[2px] -translate-x-1/2 bg-sky-100/95 shadow-[0_0_2px_rgba(0,0,0,.9)]" style={{ left: `${m * 100}%` }} data-phase-mark={Math.round(m * 100)}>
            <div className="absolute top-0 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[4px] border-t-[5px] border-x-transparent border-t-sky-100" />
          </div>
        ))}
        <div className="text-outline relative flex h-full items-center justify-center text-[12px] leading-none font-bold text-white tabular-nums">
          {hp}/{max}
        </div>
      </div>
    </div>
  );
});
