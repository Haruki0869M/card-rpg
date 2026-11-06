// 戦場の背景: 灼熱の火山（赤い空・噴煙・溶岩の川・岩場・火の粉）
import { memo } from 'react';
import { useArtIds } from '../kit';

export const VolcanoBackground = memo(function VolcanoBackground({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a0606" />
          <stop offset=".5" stopColor="#5a1408" />
          <stop offset="1" stopColor="#a8320a" />
        </linearGradient>
        <linearGradient id={id('mountain')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a1a14" />
          <stop offset="1" stopColor="#140806" />
        </linearGradient>
        <linearGradient id={id('lava')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff4a0a" />
          <stop offset=".5" stopColor="#ffd04a" />
          <stop offset="1" stopColor="#ff4a0a" />
        </linearGradient>
        <linearGradient id={id('ground')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2420" />
          <stop offset="1" stopColor="#0e0604" />
        </linearGradient>
        <radialGradient id={id('glow')}>
          <stop offset="0" stopColor="#ff8a2a" stopOpacity=".8" />
          <stop offset="1" stopColor="#ff8a2a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={url('sky')} />
      {/* 噴煙 */}
      <g fill="#2a1010" opacity=".8">
        <circle cx="200" cy="40" r="40" />
        <circle cx="240" cy="20" r="34" />
        <circle cx="166" cy="20" r="30" />
        <circle cx="210" cy="0" r="36" />
      </g>
      {/* 火山 */}
      <path d="M60 190 L170 70 L230 70 L340 190 Z" fill={url('mountain')} />
      <path d="M170 70 L230 70 L214 84 L186 84 Z" fill="#ff8a2a" />
      <path d="M196 84 L188 140 L200 170 M204 84 L212 130" stroke="#ff6a1a" strokeWidth="4" fill="none" opacity=".8" />
      <circle cx="200" cy="74" r="40" fill={url('glow')} />
      {/* 岩場と溶岩の川 */}
      <path d="M0 190 Q200 176 400 194 L400 300 L0 300 Z" fill={url('ground')} />
      <path d="M0 236 Q100 222 200 240 T400 232 L400 252 Q300 262 200 256 T0 254 Z" fill={url('lava')} opacity=".95" />
      <path d="M0 236 Q100 222 200 240 T400 232" stroke="#fff2a0" strokeWidth="2" fill="none" opacity=".7" />
      <g fill="#1a0c0a" stroke="#000" strokeWidth="1.5">
        <path d="M20 200 L60 186 L80 204 L30 214 Z M320 204 L360 190 L390 208 L340 216 Z M150 280 L190 268 L214 286 L160 296 Z" />
      </g>
      {/* 火の粉 */}
      <g fill="#ffd04a">
        {[
          [60, 150],
          [120, 110],
          [280, 130],
          [330, 90],
          [240, 200],
          [100, 210],
          [180, 160],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 2.4} opacity=".9" />
        ))}
      </g>
    </svg>
  );
});

/** 背景のID（ダンジョンの background・地形の background で指定する） */
export const background = { volcano: VolcanoBackground };
