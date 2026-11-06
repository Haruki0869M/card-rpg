// 戦場の背景: 翠の森（深い森・木漏れ日・倒木・シダ）
import { memo } from 'react';
import { useArtIds } from '../kit';

export const ForestBackground = memo(function ForestBackground({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a2414" />
          <stop offset=".55" stopColor="#1e4a2a" />
          <stop offset="1" stopColor="#2a5a30" />
        </linearGradient>
        <linearGradient id={id('ray')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0ffc0" stopOpacity=".5" />
          <stop offset="1" stopColor="#f0ffc0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('ground')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a5a24" />
          <stop offset="1" stopColor="#0c1a08" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={url('sky')} />
      {/* 奥の木々（3段） */}
      <g fill="#14361e">
        {[20, 70, 120, 180, 230, 290, 340, 390].map((x, i) => (
          <path key={i} d={`M${x} 190 L${x - 26} 190 L${x} ${70 + (i % 3) * 18} L${x + 26} 190 Z`} />
        ))}
      </g>
      <g fill="#0e2816">
        {[0, 50, 100, 160, 210, 260, 320, 370].map((x, i) => (
          <path key={i} d={`M${x + 20} 200 L${x - 10} 200 L${x + 5} ${100 + (i % 2) * 24} L${x + 35} 200 Z`} />
        ))}
      </g>
      {/* 木漏れ日 */}
      <path d="M120 0 L150 0 L210 220 L150 220 Z" fill={url('ray')} />
      <path d="M250 0 L266 0 L318 200 L284 200 Z" fill={url('ray')} opacity=".7" />
      {/* 地面と小道 */}
      <path d="M0 196 Q200 182 400 198 L400 300 L0 300 Z" fill={url('ground')} />
      <path d="M150 300 Q190 240 196 200 L214 200 Q222 240 270 300 Z" fill="#6a5a34" opacity=".55" />
      {/* 倒木 */}
      <path d="M40 224 L150 212 L152 230 L42 242 Z" fill="#4a3018" stroke="#1a0e06" strokeWidth="2.5" />
      <ellipse cx="150" cy="221" rx="6" ry="10" fill="#8a6a3a" stroke="#1a0e06" strokeWidth="2" />
      {/* 手前の幹とシダ */}
      <path d="M0 0 L40 0 Q34 150 48 300 L0 300 Z" fill="#081a0c" />
      <path d="M400 0 L364 0 Q370 150 356 300 L400 300 Z" fill="#081a0c" />
      <g stroke="#1e4a22" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M60 300 Q70 266 104 256 M86 300 Q100 276 130 274 M340 300 Q328 266 296 258 M316 300 Q300 278 274 280" />
      </g>
      <g fill="#e8ff9a">
        {[
          [100, 150],
          [240, 120],
          [300, 210],
          [180, 250],
          [70, 230],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 2.2} opacity=".85" />
        ))}
      </g>
    </svg>
  );
});

/** 背景のID（ダンジョンの background・地形の background で指定する） */
export const background = { forest: ForestBackground };
