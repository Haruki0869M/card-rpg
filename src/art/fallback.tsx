// 絵が未作成の職業・敵に使う汎用の仮の絵（spec §2.4）
import { memo } from 'react';
import { HERO_VIEWBOX } from './hero/Hero';
import { ENEMY_VIEWBOX } from './enemies/common';
import { INK, STROKE, useArtIds } from './kit';

export const FallbackHero = memo(function FallbackHero({ label, className }: { label: string; className?: string }) {
  const { id, url } = useArtIds();
  return (
    <svg viewBox={HERO_VIEWBOX} className={className} aria-hidden>
      <defs>
        <linearGradient id={id('g')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a6a90" />
          <stop offset="1" stopColor="#1c2236" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="290" rx="70" ry="10" fill="#000" opacity=".45" />
      <path d="M84 290 L90 190 Q120 172 150 190 L156 290 Z" fill={url('g')} {...STROKE} />
      <circle cx="120" cy="110" r="62" fill={url('g')} {...STROKE} />
      <path d="M60 100 Q62 44 120 40 Q178 44 180 100" stroke="#9fb0d8" strokeWidth="3" fill="none" opacity=".5" />
      <text x="120" y="132" textAnchor="middle" fontSize="64" fontWeight="900" fill="#dfe8ff" stroke={INK} strokeWidth="2">
        {label}
      </text>
    </svg>
  );
});

export const FallbackEnemy = memo(function FallbackEnemy({ label, className }: { label: string; className?: string }) {
  const { id, url } = useArtIds();
  return (
    <svg viewBox={ENEMY_VIEWBOX} className={className} aria-hidden>
      <defs>
        <radialGradient id={id('g')} cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#6a2a5a" />
          <stop offset="1" stopColor="#1a0814" />
        </radialGradient>
      </defs>
      <ellipse cx="130" cy="290" rx="90" ry="12" fill="#000" opacity=".55" />
      <path d="M50 290 Q40 150 130 90 Q220 150 210 290 Z" fill={url('g')} {...STROKE} />
      <circle cx="104" cy="170" r="9" fill="#ff3a2a" />
      <circle cx="156" cy="170" r="9" fill="#ff3a2a" />
      <text x="130" y="250" textAnchor="middle" fontSize="54" fontWeight="900" fill="#ffd0c8" stroke={INK} strokeWidth="2">
        {label}
      </text>
    </svg>
  );
});
