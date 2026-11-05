// 戦場の背景: 翠の神殿（森の奥の遺跡・光の筋・光る紋様・霧）
import { memo } from 'react';
import { useArtIds } from '../kit';

export const TempleBackground = memo(function TempleBackground({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#06150f" />
          <stop offset=".5" stopColor="#123a2a" />
          <stop offset="1" stopColor="#1e4a30" />
        </linearGradient>
        <linearGradient id={id('ray')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8ffb0" stopOpacity=".45" />
          <stop offset="1" stopColor="#d8ffb0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('stone')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6a7a6a" />
          <stop offset=".5" stopColor="#4a5a4c" />
          <stop offset="1" stopColor="#263026" />
        </linearGradient>
        <linearGradient id={id('ground')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a4a2a" />
          <stop offset="1" stopColor="#081208" />
        </linearGradient>
        <radialGradient id={id('rune')}>
          <stop offset="0" stopColor="#7affb0" stopOpacity=".9" />
          <stop offset="1" stopColor="#7affb0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('fog')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8ffd8" stopOpacity="0" />
          <stop offset=".5" stopColor="#c8ffd8" stopOpacity=".18" />
          <stop offset="1" stopColor="#c8ffd8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={url('sky')} />
      {/* 奥の木々 */}
      <g fill="#0b2418">
        <path d="M0 40 L30 40 L34 190 L0 190 Z M60 0 L80 0 L84 180 L56 180 Z M330 0 L352 0 L356 186 L326 186 Z M376 20 L400 20 L400 190 L372 190 Z" />
      </g>
      <path d="M0 30 Q60 0 120 24 Q200 -6 280 22 Q340 0 400 26 L400 0 L0 0 Z" fill="#06120c" />
      {/* 光の筋 */}
      <path d="M150 0 L190 0 L250 240 L170 240 Z" fill={url('ray')} />
      <path d="M220 0 L240 0 L300 220 L262 220 Z" fill={url('ray')} opacity=".6" />
      {/* 神殿の門 */}
      <g>
        <path d="M120 72 L280 72 L292 92 L108 92 Z" fill={url('stone')} stroke="#0a120a" strokeWidth="2.5" />
        <path d="M134 92 L156 92 L156 196 L134 196 Z M244 92 L266 92 L266 196 L244 196 Z" fill={url('stone')} stroke="#0a120a" strokeWidth="2.5" />
        <path d="M156 92 Q200 62 244 92 L244 110 Q200 84 156 110 Z" fill="#3a4a3c" stroke="#0a120a" strokeWidth="2" />
        <circle cx="200" cy="140" r="38" fill={url('rune')} />
        <path d="M200 112 L214 140 L200 168 L186 140 Z M200 124 L200 156 M190 140 L210 140" stroke="#9affc8" strokeWidth="2.5" fill="none" />
        <path d="M140 110 l4 8 l-4 8 M250 110 l4 8 l-4 8" stroke="#7affb0" strokeWidth="2" fill="none" />
        {/* 苔とツタ */}
        <path d="M120 72 Q124 86 120 100 M290 76 Q284 96 292 112 M150 92 Q146 120 152 150 M248 96 Q254 130 246 160" stroke="#3a8a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M120 72 Q150 66 180 74 Q210 64 250 72 Q270 66 282 74" stroke="#4aa04a" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".8" />
      </g>
      {/* 石段と地面 */}
      <path d="M0 190 Q200 176 400 192 L400 300 L0 300 Z" fill={url('ground')} />
      <path d="M150 196 L250 196 L262 206 L138 206 Z M140 206 L260 206 L276 218 L124 218 Z" fill="#3a4a3c" stroke="#0a120a" strokeWidth="1.5" />
      <rect x="0" y="180" width="400" height="44" fill={url('fog')} />
      {/* 手前の大きな幹とシダ */}
      <path d="M0 0 L46 0 Q40 120 56 300 L0 300 Z" fill="#071008" />
      <path d="M400 0 L360 0 Q366 140 350 300 L400 300 Z" fill="#071008" />
      <g stroke="#0d2a12" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M60 300 Q74 270 104 262 M80 300 Q96 280 122 280 M330 300 Q316 270 288 264 M310 300 Q296 282 270 284" />
      </g>
      {/* 蛍 */}
      <g fill="#d8ff8a">
        {[
          [90, 150],
          [124, 230],
          [300, 160],
          [270, 236],
          [210, 250],
          [176, 120],
          [330, 220],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 2.2} opacity=".85" />
        ))}
      </g>
    </svg>
  );
});
