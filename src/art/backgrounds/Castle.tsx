// タイトル画面の背景: 侵食の魔王城（赤い月・紫の雷・崖の上の城）
import { memo } from 'react';
import { useArtIds } from '../kit';

export const CastleBackground = memo(function CastleBackground({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a0414" />
          <stop offset=".45" stopColor="#2a0a32" />
          <stop offset=".75" stopColor="#6a1430" />
          <stop offset="1" stopColor="#2a0a14" />
        </linearGradient>
        <radialGradient id={id('moon')}>
          <stop offset="0" stopColor="#ffd0b0" />
          <stop offset=".5" stopColor="#ff6a4a" />
          <stop offset="1" stopColor="#8a1020" />
        </radialGradient>
        <radialGradient id={id('moonGlow')}>
          <stop offset="0" stopColor="#ff4a3a" stopOpacity=".6" />
          <stop offset="1" stopColor="#ff4a3a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('miasma')}>
          <stop offset="0" stopColor="#b02cff" stopOpacity=".7" />
          <stop offset="1" stopColor="#b02cff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={url('sky')} />
      <g fill="#fff" opacity=".6">
        {[
          [30, 30],
          [90, 18],
          [160, 44],
          [330, 26],
          [370, 60],
          [60, 80],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 2 ? 0.9 : 1.4} />
        ))}
      </g>
      <circle cx="270" cy="96" r="90" fill={url('moonGlow')} />
      <circle cx="270" cy="96" r="44" fill={url('moon')} />
      <path d="M250 80 q10 -6 16 4 M276 110 q8 -4 12 4" stroke="#a02030" strokeWidth="3" fill="none" opacity=".6" />
      {/* 紫の雷 */}
      <path d="M90 0 L80 40 L96 44 L74 96 L104 50 L88 46 L104 0 Z" fill="#e2a8ff" opacity=".8" />
      {/* 瘴気 */}
      <ellipse cx="200" cy="170" rx="200" ry="60" fill={url('miasma')} opacity=".7" />
      {/* 崖と城 */}
      <path d="M90 300 L120 200 L150 180 L170 150 L230 150 L250 178 L280 196 L310 300 Z" fill="#12060e" />
      <g fill="#0a0408">
        <path d="M150 156 L150 100 L160 84 L170 100 L170 120 L182 120 L182 70 L192 40 L202 70 L202 120 L214 120 L214 92 L224 76 L234 92 L234 156 Z" />
        <path d="M126 186 L126 140 L134 128 L142 140 L142 186 Z M258 186 L258 136 L266 124 L274 136 L274 186 Z" />
      </g>
      <g fill="#d07aff">
        <rect x="190" y="84" width="4" height="8" />
        <rect x="158" y="110" width="4" height="6" />
        <rect x="222" y="104" width="4" height="6" />
        <rect x="132" y="150" width="3" height="5" />
        <rect x="264" y="150" width="3" height="5" />
      </g>
      <circle cx="192" cy="70" r="30" fill={url('miasma')} />
      {/* 手前の枯れ木と大地 */}
      <path d="M0 250 Q100 230 200 246 Q300 230 400 248 L400 300 L0 300 Z" fill="#08030a" />
      <path d="M30 250 L34 200 L20 176 M34 210 L48 186 M360 252 L356 196 L372 170 M356 208 L340 186" stroke="#08030a" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
});
