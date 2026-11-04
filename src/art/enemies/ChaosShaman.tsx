// カオスシャーマン: 獣の頭蓋骨の冠・紫の混沌の炎・浮かぶルーン
import { memo } from 'react';
import { GlowDef, Grad3, INK, Limb, STROKE, THIN, useArtIds } from '../kit';
import { ENEMY_VIEWBOX } from './common';
import { Aura, EnemyEye } from './parts';

export const ChaosShaman = memo(function ChaosShaman({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  const skin = url('skin');
  const bone = url('bone');
  return (
    <svg viewBox={ENEMY_VIEWBOX} className={className} aria-hidden>
      <defs>
        <Grad3 id={id('skin')} c={['#8fb85a', '#4a6a26', '#1a2a0a']} x2={0.4} />
        <Grad3 id={id('robe')} c={['#6a3a9a', '#2e1450', '#0e0418']} />
        <Grad3 id={id('bone')} c={['#fff8e2', '#e0cfa2', '#8f7a50']} />
        <Grad3 id={id('flame')} c={['#ffffff', '#d07aff', '#5a12b0']} />
        <GlowDef id={id('eye')} color="#c46bff" />
        <GlowDef id={id('aura')} color="#8a2cff" opacity={0.55} />
        <GlowDef id={id('orb')} color="#d07aff" opacity={0.95} />
      </defs>
      <Aura url={url('aura')} cy={160} />
      <ellipse cx="130" cy="290" rx="86" ry="11" fill="#000" opacity=".6" />
      {/* 浮かぶルーン */}
      <g className="enemy-runes" stroke="#e2a8ff" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".85">
        <path d="M24 150 l8 -12 l8 12 m-8 -12 v20" />
        <path d="M226 168 l10 0 m-5 -8 v16 m-6 -10 l12 4" />
        <path d="M40 232 q8 -10 16 0 q-8 10 -16 0" />
      </g>
      <g className="enemy-body">
        {/* 杖 */}
        <g className="enemy-weapon">
          <path d="M208 290 Q196 170 196 50" stroke={INK} strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d="M208 290 Q196 170 196 50" stroke="#4a2a14" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M200 120 Q190 112 202 102 Q192 94 200 84" stroke="#2a1608" strokeWidth="2.4" fill="none" />
          <circle cx="196" cy="30" r="40" fill={url('orb')} />
          <path d="M180 46 Q172 20 186 6 M212 46 Q220 20 206 6" stroke={bone} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="196" cy="26" r="13" fill={url('flame')} {...STROKE} />
          <circle cx="192" cy="22" r="3.5" fill="#fff" />
        </g>
        {/* ローブ（裾がぼろぼろ） */}
        <path
          d="M86 150 Q130 130 174 150 L198 286 L172 272 L156 290 L130 276 L104 290 L88 272 L62 286 Z"
          fill={url('robe')}
          {...STROKE}
        />
        <path d="M130 156 Q150 200 160 280" stroke="#000" strokeWidth="18" fill="none" opacity=".25" />
        <g stroke="#c46bff" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".9">
          <path d="M84 256 l6 -8 l6 8 M110 262 v-10 m-5 5 h10 M150 262 q6 -8 12 0 M172 254 l6 -8 l6 8" />
        </g>
        {/* 骨の首飾り */}
        <path d="M96 156 Q130 182 164 156" stroke="#5a3a20" strokeWidth="2.4" fill="none" />
        {[102, 114, 126, 138, 150, 160].map((x, i) => (
          <path key={x} d={`M${x} ${160 + Math.sin((i / 5) * Math.PI) * 14} l-3 9 l6 0 z`} fill={bone} {...THIN} />
        ))}
        {/* 左手（混沌の炎） */}
        <Limb d="M96 166 Q66 150 60 120" fill={skin} width={12} />
        <circle cx="58" cy="94" r="38" fill={url('orb')} />
        <path
          d="M58 116 Q40 100 52 76 Q54 92 62 88 Q58 72 70 58 Q80 92 70 112 Q66 120 58 116 Z"
          fill={url('flame')}
          {...STROKE}
        />
        <circle cx="60" cy="118" r="9" fill={skin} {...STROKE} />
        {/* 右手（杖を握る） */}
        <Limb d="M166 166 Q190 178 196 196" fill={skin} width={12} />
        <circle cx="198" cy="200" r="9.5" fill={skin} {...STROKE} />
      </g>
      {/* 頭 */}
      <g className="enemy-head">
        <path d="M104 112 L52 128 L104 132 Z" fill={skin} {...STROKE} />
        <path d="M156 112 L208 128 L156 132 Z" fill={skin} {...STROKE} />
        <path d="M100 118 Q100 90 130 86 Q160 90 160 118 Q156 146 130 152 Q104 146 100 118 Z" fill={skin} {...STROKE} />
        <path d="M108 124 L120 128 M152 124 L140 128" stroke="#a040e0" strokeWidth="3" strokeLinecap="round" />
        <EnemyEye cx={116} cy={114} glow={url('eye')} d="M106 110 L126 114 L108 119 Z" color="#f2c6ff" />
        <EnemyEye cx={144} cy={114} glow={url('eye')} d="M154 110 L134 114 L152 119 Z" color="#f2c6ff" />
        <path d="M114 136 Q130 146 148 134" stroke="#2a0404" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M140 137 L143 146 L146 136" fill="#fff4d8" {...THIN} />
        {/* 獣の頭蓋骨の冠 */}
        <path d="M100 82 Q70 58 62 22 Q84 42 108 62 Z" fill={bone} {...STROKE} />
        <path d="M160 82 Q190 58 198 22 Q176 42 152 62 Z" fill={bone} {...STROKE} />
        <path d="M94 102 Q92 54 130 46 Q168 54 166 102 Q150 92 130 92 Q110 92 94 102 Z" fill={bone} {...STROKE} />
        <path d="M112 66 Q118 58 124 66 Q118 76 112 66 Z M136 66 Q142 58 148 66 Q142 76 136 66 Z" fill="#1a0a10" />
        <circle cx="118" cy="67" r="7" fill={url('eye')} />
        <circle cx="142" cy="67" r="7" fill={url('eye')} />
        <path d="M126 78 L130 86 L134 78" stroke={INK} strokeWidth="2" fill="none" />
        <path d="M164 98 Q160 140 134 150" stroke="#d07aff" strokeWidth="2.6" fill="none" opacity=".75" />
      </g>
    </svg>
  );
});
