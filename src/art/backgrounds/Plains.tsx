// 戦場の背景: はじまりの平原（夕暮れ・遠くに魔王城・地平の瘴気）
import { memo } from 'react';
import { useArtIds } from '../kit';

export const PlainsBackground = memo(function PlainsBackground({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#120b2a" />
          <stop offset=".38" stopColor="#3a1d55" />
          <stop offset=".62" stopColor="#a8456a" />
          <stop offset=".78" stopColor="#f3955a" />
        </linearGradient>
        <radialGradient id={id('moon')}>
          <stop offset="0" stopColor="#ffe9d0" />
          <stop offset=".6" stopColor="#ffc8a0" />
          <stop offset="1" stopColor="#ff9a7a" />
        </radialGradient>
        <radialGradient id={id('moonGlow')}>
          <stop offset="0" stopColor="#ffb08a" stopOpacity=".55" />
          <stop offset="1" stopColor="#ffb08a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('miasma')}>
          <stop offset="0" stopColor="#9b2cff" stopOpacity=".6" />
          <stop offset="1" stopColor="#9b2cff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('ground')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f4a2a" />
          <stop offset=".35" stopColor="#24301c" />
          <stop offset="1" stopColor="#0c1009" />
        </linearGradient>
        <linearGradient id={id('path')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6a5a44" />
          <stop offset="1" stopColor="#2a2016" />
        </linearGradient>
        <linearGradient id={id('fog')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8b8ff" stopOpacity="0" />
          <stop offset=".5" stopColor="#d8b8ff" stopOpacity=".22" />
          <stop offset="1" stopColor="#d8b8ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={url('sky')} />
      {/* 星 */}
      <g fill="#fff" opacity=".8">
        {[
          [30, 20], [80, 42], [140, 14], [210, 30], [260, 10], [330, 36], [372, 18], [52, 70], [180, 58], [300, 64],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={x % 3 ? 0.9 : 1.4} />
        ))}
      </g>
      {/* 月 */}
      <circle cx="300" cy="86" r="70" fill={url('moonGlow')} />
      <circle cx="300" cy="86" r="26" fill={url('moon')} />
      <path d="M286 76 q6 -4 10 2 M306 96 q5 -3 8 2" stroke="#e8a07a" strokeWidth="2" fill="none" opacity=".6" />
      {/* 遠くの山 */}
      <path d="M0 150 L40 118 L70 136 L110 98 L150 132 L190 110 L230 140 L270 104 L310 128 L350 100 L400 130 L400 176 L0 176 Z" fill="#4a2a5a" />
      <path d="M0 162 L50 138 L96 154 L140 128 L196 156 L240 136 L292 158 L340 134 L400 152 L400 186 L0 186 Z" fill="#2e1c40" />
      {/* 魔王城（遠景） */}
      <g fill="#1a1028">
        <path d="M60 140 L60 112 L66 104 L72 112 L72 124 L80 124 L80 98 L86 86 L92 98 L92 124 L100 124 L100 108 L106 100 L112 108 L112 140 Z" />
      </g>
      <circle cx="86" cy="104" r="22" fill={url('miasma')} />
      <rect x="84" y="102" width="4" height="6" fill="#d07aff" />
      <rect x="64" y="116" width="3" height="4" fill="#d07aff" />
      {/* 地平の瘴気 */}
      <ellipse cx="86" cy="160" rx="120" ry="26" fill={url('miasma')} opacity=".6" />
      {/* 地面 */}
      <path d="M0 176 Q120 164 200 170 Q300 176 400 166 L400 300 L0 300 Z" fill={url('ground')} />
      <path d="M150 300 Q180 230 196 176 L212 176 Q236 230 300 300 Z" fill={url('path')} opacity=".55" />
      {/* 霧 */}
      <rect x="0" y="168" width="400" height="40" fill={url('fog')} />
      <rect x="0" y="230" width="400" height="30" fill={url('fog')} opacity=".6" />
      {/* 木のシルエット */}
      <g fill="#0f140c">
        <path d="M22 186 L22 160 Q8 158 12 146 Q4 136 16 128 Q16 114 30 116 Q40 106 50 118 Q62 120 58 134 Q66 144 54 152 Q50 160 36 160 L36 186 Z" />
        <path d="M368 190 L368 158 Q352 154 358 140 Q352 128 366 122 Q370 108 384 112 Q396 108 400 118 L400 190 Z" />
      </g>
      {/* 手前の草 */}
      <g stroke="#0a0e07" strokeWidth="2.4" strokeLinecap="round">
        {[10, 34, 60, 96, 128, 250, 284, 318, 352, 386].map((x, i) => (
          <path key={x} d={`M${x} 300 q${i % 2 ? 4 : -4} -14 ${i % 2 ? 2 : -6} -24 M${x + 6} 300 q2 -10 8 -18`} fill="none" />
        ))}
      </g>
      {/* 舞う火の粉 */}
      <g className="bg-embers" fill="#ffb27a">
        {[
          [40, 200], [120, 186], [230, 210], [330, 196], [370, 240], [80, 250], [270, 260],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 2 ? 1.2 : 1.8} opacity=".8" />
        ))}
      </g>
    </svg>
  );
});
