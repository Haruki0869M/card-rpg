// アイテムと宝箱の絵（レア度で色・光が変わる）
import { memo } from 'react';
import type { Rarity } from '../types';
import { GlowDef, Grad3, INK, THIN, useArtIds } from './kit';

export const RARITY_ACCENT: Record<Rarity, { c: [string, string, string]; glow: string }> = {
  common: { c: ['#ffffff', '#c8ccd8', '#6a6e80'], glow: '#ffffff' },
  rare: { c: ['#d8f0ff', '#4aa8ff', '#14407a'], glow: '#5ab0ff' },
  epic: { c: ['#f2d8ff', '#b46cff', '#4a147a'], glow: '#c58bff' },
  legend: { c: ['#fff6c8', '#ffc23a', '#8a5a08'], glow: '#ffcf4a' },
};

const S = { stroke: INK, strokeWidth: 2.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** アイテムの絵（64×64） */
export const ItemArt = memo(function ItemArt({ icon, rarity, className }: { icon: string; rarity: Rarity; className?: string }) {
  const { id, url } = useArtIds();
  const acc = RARITY_ACCENT[rarity];
  const a = url('acc');
  const metal = url('metal');
  const wood = url('wood');
  const glow = rarity !== 'common' ? <circle cx="32" cy="32" r="28" fill={url('glow')} /> : null;
  let body: React.ReactNode;
  switch (icon) {
    case 'gun':
      body = <g transform="rotate(-25 32 32)"><path d="M9 23H51V33H9Z" fill={metal} {...S} /><path d="M14 33H28L23 53H11Z" fill={wood} {...S} /><path d="M30 33V42H39V33" fill="none" {...S} /><path d="M49 20V35M12 21V34" stroke={a} strokeWidth="4" /></g>;
      break;
    case 'instrument':
      body = <g transform="rotate(25 32 32)"><ellipse cx="30" cy="42" rx="17" ry="18" fill={wood} {...S} /><path d="M26 9H34V33H26Z" fill={wood} {...S} /><circle cx="30" cy="41" r="6" fill={INK} /><path d="M28 10V53M31 10V53" stroke="#ffe9a8" strokeWidth="1.3" /><path d="M22 51H38" stroke={a} strokeWidth="4" /></g>;
      break;
    case 'sword':
      body = (
        <g transform="rotate(45 32 32)">
          <path d="M29 4 L35 4 L36 40 L28 40 Z" fill={metal} {...S} />
          <path d="M32 6 L32 38" stroke="#fff" strokeWidth="1.4" />
          <path d="M20 40 L44 40 L42 46 L22 46 Z" fill={a} {...S} />
          <path d="M29 46 L35 46 L35 58 L29 58 Z" fill={wood} {...S} />
          <circle cx="32" cy="60" r="3.5" fill={a} {...S} />
        </g>
      );
      break;
    case 'staff':
      body = (
        <g>
          <path d="M18 58 L42 18" stroke={INK} strokeWidth="7" strokeLinecap="round" />
          <path d="M18 58 L42 18" stroke="#7a4a24" strokeWidth="4" strokeLinecap="round" />
          <path d="M38 22 Q36 8 48 6 Q42 14 44 20 Z M46 26 Q58 24 60 12 Q52 18 46 18 Z" fill={a} {...S} />
          <circle cx="46" cy="16" r="6.5" fill={a} {...S} />
          <circle cx="44" cy="14" r="2" fill="#fff" />
        </g>
      );
      break;
    case 'hammer':
      body = (
        <g transform="rotate(-30 32 32)">
          <path d="M30 22 L34 22 L35 60 L29 60 Z" fill={wood} {...S} />
          <path d="M14 8 L50 8 L50 26 L14 26 Z" fill={metal} {...S} />
          <path d="M14 8 L50 8" stroke="#fff" strokeWidth="1.6" />
          <path d="M26 10 L38 10 L38 24 L26 24 Z" fill={a} {...THIN} />
        </g>
      );
      break;
    case 'bow':
      body = (
        <g>
          <path d="M20 6 L20 58" stroke="#efe7d6" strokeWidth="1.4" />
          <path d="M20 6 Q58 32 20 58" stroke={INK} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M20 6 Q58 32 20 58" stroke="#8a5428" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M36 22 Q42 32 36 42" stroke={a} strokeWidth="3" fill="none" />
          <path d="M8 32 L50 32" stroke="#cbb48a" strokeWidth="2.2" />
          <path d="M50 32 l-7 -4 l0 8 z" fill={metal} {...THIN} />
          <path d="M8 32 l-4 -4 M8 32 l-4 4" stroke={a} strokeWidth="2.4" />
        </g>
      );
      break;
    case 'armor':
      body = (
        <g>
          <path d="M14 14 Q32 6 50 14 L54 26 L46 30 L46 56 Q32 62 18 56 L18 30 L10 26 Z" fill={metal} {...S} />
          <path d="M32 12 L32 58" stroke="#5a607a" strokeWidth="1.6" />
          <path d="M26 24 L38 24 L36 36 L28 36 Z" fill={a} {...THIN} />
          <path d="M18 18 Q32 12 46 18" stroke="#fff" strokeWidth="1.6" fill="none" />
        </g>
      );
      break;
    case 'robe':
      body = (
        <g>
          <path d="M22 8 Q32 14 42 8 L50 20 L44 26 L48 58 L16 58 L20 26 L14 20 Z" fill={a} {...S} />
          <path d="M32 14 L32 58" stroke={INK} strokeWidth="1.4" />
          <path d="M26 10 Q32 18 38 10" stroke="#ffe08a" strokeWidth="2.4" fill="none" />
          <path d="M18 54 L46 54" stroke="#ffe08a" strokeWidth="2.4" />
        </g>
      );
      break;
    case 'ring':
      body = (
        <g>
          <ellipse cx="32" cy="38" rx="16" ry="14" fill="none" stroke={INK} strokeWidth="9" />
          <ellipse cx="32" cy="38" rx="16" ry="14" fill="none" stroke="#f2c24a" strokeWidth="5" />
          <path d="M24 18 L32 10 L40 18 L32 28 Z" fill={a} {...S} />
          <path d="M28 18 L32 14 L36 18" stroke="#fff" strokeWidth="1.4" fill="none" />
        </g>
      );
      break;
    case 'amulet':
      body = (
        <g>
          <path d="M14 8 Q32 34 50 8" stroke="#c8a040" strokeWidth="2.6" fill="none" />
          <path d="M32 28 L46 40 L32 60 L18 40 Z" fill="#f2c24a" {...S} />
          <path d="M32 34 L40 41 L32 52 L24 41 Z" fill={a} {...THIN} />
        </g>
      );
      break;
    case 'charm':
      body = (
        <g>
          <path d="M32 8 L34 6 L36 10" stroke="#c8a040" strokeWidth="2.4" fill="none" />
          <path d="M18 18 Q32 8 46 18 L44 50 Q32 60 20 50 Z" fill={a} {...S} />
          <path d="M32 24 l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1 z" fill="#fff6c8" {...THIN} />
        </g>
      );
      break;
    case 'crest':
      body = (
        <g>
          <path d="M32 6 L54 16 L50 42 Q42 56 32 60 Q22 56 14 42 L10 16 Z" fill="#f2c24a" {...S} />
          <path d="M32 14 L46 21 L43 40 Q38 50 32 53 Q26 50 21 40 L18 21 Z" fill={a} {...THIN} />
          <path d="M24 26 L28 34 L32 24 L36 34 L40 26 L38 40 L26 40 Z" fill="#fff6c8" {...THIN} />
        </g>
      );
      break;
    case 'boots':
      body = (
        <g>
          <path d="M20 8 L36 8 L36 40 L54 46 L54 56 L18 56 Z" fill={wood} {...S} />
          <path d="M20 14 L36 14" stroke={a} strokeWidth="3" />
          <path d="M40 18 Q52 14 56 22 Q50 26 40 26" fill={a} {...THIN} />
        </g>
      );
      break;
    case 'potion':
    case 'ether':
    case 'antidote': {
      const liquid = icon === 'potion' ? '#ff4a6a' : icon === 'ether' ? '#4ac8ff' : '#7aff8a';
      body = (
        <g>
          <path d="M26 6 L38 6 L38 18 Q52 26 50 42 Q48 58 32 58 Q16 58 14 42 Q12 26 26 18 Z" fill="#dff4ff" fillOpacity=".25" {...S} />
          <path d="M16 38 Q32 32 48 38 Q48 56 32 56 Q16 56 16 38 Z" fill={liquid} />
          <path d="M24 2 L40 2 L40 8 L24 8 Z" fill={wood} {...S} />
          <path d="M20 28 Q18 36 20 44" stroke="#fff" strokeWidth="2.4" fill="none" opacity=".7" />
        </g>
      );
      break;
    }
    case 'smoke':
      body = (
        <g>
          <circle cx="30" cy="40" r="16" fill="#3a3a4a" {...S} />
          <path d="M30 24 L34 14" stroke="#c8a878" strokeWidth="2.4" />
          <circle cx="38" cy="10" r="6" fill="#d8d8e8" opacity=".8" />
          <circle cx="48" cy="18" r="5" fill="#d8d8e8" opacity=".6" />
          <path d="M22 36 Q26 30 32 32" stroke="#8a8aa0" strokeWidth="2" fill="none" />
        </g>
      );
      break;
    default:
      body = <circle cx="32" cy="32" r="16" fill={a} {...S} />;
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <Grad3 id={id('acc')} c={acc.c} />
        <Grad3 id={id('metal')} c={['#ffffff', '#b8c4d8', '#4e5670']} x2={1} />
        <Grad3 id={id('wood')} c={['#b07a48', '#6e3d1d', '#3a1d0b']} />
        <GlowDef id={id('glow')} color={acc.glow} opacity={0.55} />
      </defs>
      {glow}
      {body}
    </svg>
  );
});

/** 宝箱の絵（木 / 鉄 / 装飾 / 黄金）。open で開いた姿 */
export const ChestArt = memo(function ChestArt({ rarity, open, className }: { rarity: Rarity; open?: boolean; className?: string }) {
  const { id, url } = useArtIds();
  const acc = RARITY_ACCENT[rarity];
  const body =
    rarity === 'common'
      ? (['#c08850', '#7a4a20', '#3a200a'] as const)
      : rarity === 'rare'
        ? (['#c8d0e0', '#6a7690', '#2a3040'] as const)
        : rarity === 'epic'
          ? (['#a070e0', '#5a2a9a', '#24104a'] as const)
          : (['#ffe9a0', '#e2a830', '#7a4a08'] as const);
  const band = rarity === 'legend' ? url('gem') : rarity === 'common' ? '#3a3a44' : url('trim');
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 130" className={className} aria-hidden>
      <defs>
        <Grad3 id={id('body')} c={body} />
        <Grad3 id={id('trim')} c={['#fff3c4', '#f2c24a', '#8a5a0a']} />
        <Grad3 id={id('gem')} c={acc.c} />
        <GlowDef id={id('glow')} color={acc.glow} opacity={0.9} />
      </defs>
      <ellipse cx="80" cy="122" rx="62" ry="7" fill="#000" opacity=".5" />
      {open && (
        <g>
          {/* 後ろに開いたふた */}
          <path d="M30 62 L130 62 L122 18 Q80 8 38 18 Z" fill={url('body')} {...S} strokeWidth={3.5} />
          <path d="M44 60 L48 20 M116 60 L112 20" stroke={band} strokeWidth="7" />
          <path d="M40 62 L120 62 L150 -10 L10 -10 Z" fill={url('glow')} opacity=".75" />
          <ellipse cx="80" cy="64" rx="48" ry="12" fill="#fff6d8" opacity=".85" />
        </g>
      )}
      {/* 本体 */}
      <path d="M24 62 L136 62 L132 116 Q80 124 28 116 Z" fill={url('body')} {...S} strokeWidth={3.5} />
      <path d="M28 82 L132 82" stroke={INK} strokeWidth="2" opacity=".5" />
      <path d="M44 62 L46 118 M116 62 L114 118" stroke={band} strokeWidth="8" />
      <path d="M44 62 L46 118 M116 62 L114 118" stroke={INK} strokeWidth="1.4" fill="none" />
      {/* 錠前 */}
      <path d="M70 66 L90 66 L90 88 Q80 94 70 88 Z" fill={url('trim')} {...S} />
      <circle cx="80" cy="76" r="3.5" fill={INK} />
      {/* ふた */}
      {!open && (
        <g>
          <path d="M24 62 Q24 26 80 22 Q136 26 136 62 Z" fill={url('body')} {...S} strokeWidth={3.5} />
          <path d="M44 60 Q44 32 80 28 Q116 32 116 60" stroke={band} strokeWidth="8" fill="none" />
          <path d="M40 40 Q60 30 80 30" stroke="#fff" strokeWidth="3" fill="none" opacity=".45" strokeLinecap="round" />
          {rarity !== 'common' && <circle cx="80" cy="42" r="7" fill={url('gem')} {...THIN} />}
        </g>
      )}
      {rarity === 'legend' && (
        <g fill="#fff6c8">
          <path d="M20 30 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" />
          <path d="M142 46 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 l4 -2 z" />
        </g>
      )}
    </svg>
  );
});
