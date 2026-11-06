// 戦場の背景: 嘆きの沼（霧・枯れ木・沼の水面・鬼火・沈んだ墓石）
import { memo } from 'react';
import { useArtIds } from '../kit';

export const SwampBackground = memo(function SwampBackground({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c1418" />
          <stop offset=".6" stopColor="#24363a" />
          <stop offset="1" stopColor="#3a4a3a" />
        </linearGradient>
        <linearGradient id={id('water')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a3a2a" />
          <stop offset="1" stopColor="#06100a" />
        </linearGradient>
        <linearGradient id={id('fog')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8e0d8" stopOpacity="0" />
          <stop offset=".5" stopColor="#c8e0d8" stopOpacity=".22" />
          <stop offset="1" stopColor="#c8e0d8" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('wisp')}>
          <stop offset="0" stopColor="#8affe0" stopOpacity=".95" />
          <stop offset="1" stopColor="#8affe0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('moon')}>
          <stop offset="0" stopColor="#e8f0d8" stopOpacity=".9" />
          <stop offset=".4" stopColor="#c8d8b8" stopOpacity=".35" />
          <stop offset="1" stopColor="#c8d8b8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={url('sky')} />
      <circle cx="300" cy="60" r="70" fill={url('moon')} />
      <circle cx="300" cy="60" r="20" fill="#e8f0d8" opacity=".85" />
      {/* 枯れ木 */}
      <g stroke="#0a1210" strokeLinecap="round" fill="none">
        <path d="M70 200 L74 80 M74 120 L46 90 M74 100 L100 70 M72 150 L50 136" strokeWidth="7" />
        <path d="M330 200 L326 100 M326 130 L350 104 M326 116 L302 92" strokeWidth="6" />
        <path d="M200 196 L202 130 M202 150 L186 136 M202 140 L220 124" strokeWidth="4" />
      </g>
      {/* 沈んだ墓石 */}
      <g fill="#4a5450" stroke="#0a1210" strokeWidth="2">
        <path d="M120 200 L120 176 Q130 164 140 176 L140 204 Z" transform="rotate(-8 130 190)" />
        <path d="M260 204 L260 184 Q268 174 276 184 L276 206 Z" transform="rotate(6 268 194)" />
      </g>
      {/* 沼の水面 */}
      <path d="M0 196 Q200 186 400 198 L400 300 L0 300 Z" fill={url('water')} />
      <g stroke="#6a8a7a" strokeWidth="2" fill="none" opacity=".45">
        <path d="M30 230 q20 -6 40 0 M150 250 q24 -6 48 0 M260 228 q20 -6 40 0 M300 270 q24 -6 48 0 M60 280 q24 -6 48 0" />
      </g>
      <g stroke="#3a5a3a" strokeWidth="3" strokeLinecap="round">
        <path d="M20 300 V250 M28 300 V240 M36 300 V256 M370 300 V246 M378 300 V238 M386 300 V254" />
      </g>
      {/* 霧と鬼火 */}
      <rect x="0" y="170" width="400" height="70" fill={url('fog')} />
      {[
        [90, 170],
        [230, 150],
        [340, 190],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="16" fill={url('wisp')} />
          <circle cx={x} cy={y} r="3" fill="#e8fff8" />
        </g>
      ))}
    </svg>
  );
});

/** 背景のID（ダンジョンの background・地形の background で指定する） */
export const background = { swamp: SwampBackground };
