// ゴブリン斥候: ぼろぼろのフード・二刀の曲刀・裂けた笑み
import { memo } from 'react';
import { GlowDef, Grad3, INK, Limb, STROKE, THIN, useArtIds } from '../kit';
import { ENEMY_VIEWBOX } from './common';
import { Aura, EnemyEye } from './parts';

export const GoblinScout = memo(function GoblinScout({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  const skin = url('skin');
  const blade = url('blade');
  return (
    <svg viewBox={ENEMY_VIEWBOX} className={className} aria-hidden>
      <defs>
        <Grad3 id={id('skin')} c={['#a8c860', '#5e7c2c', '#22300c']} x2={0.4} />
        <Grad3 id={id('cloak')} c={['#a8323e', '#5a1220', '#1e050a']} />
        <Grad3 id={id('leather')} c={['#7a5a3a', '#40281a', '#160c06']} />
        <Grad3 id={id('blade')} c={['#f4f0ff', '#9a94b0', '#3a344a']} x2={1} />
        <GlowDef id={id('eye')} color="#d4ff3a" />
        <GlowDef id={id('aura')} color="#b8222e" opacity={0.42} />
        <GlowDef id={id('poison')} color="#7dff4a" opacity={0.7} />
      </defs>
      <Aura url={url('aura')} cy={180} />
      <ellipse cx="130" cy="290" rx="84" ry="11" fill="#000" opacity=".6" />
      <g className="enemy-body">
        {/* マント（裾がぼろぼろ） */}
        <path
          d="M76 132 Q62 214 52 284 L84 268 L98 288 L122 272 L144 290 L162 270 L184 286 L206 268 Q196 214 184 132 Z"
          fill={url('cloak')}
          {...STROKE}
        />
        <path d="M84 150 Q76 210 70 262" stroke="#d24a56" strokeWidth="2.6" fill="none" opacity=".5" />
        {/* 脚（低い構え） */}
        <path d="M104 214 L80 250 L92 280 L114 280 L104 254 L122 226 Z" fill={skin} {...STROKE} />
        <path d="M156 214 L180 250 L168 280 L146 280 L156 254 L138 226 Z" fill={skin} {...STROKE} />
        <path d="M84 266 L114 266 L114 282 L82 282 Z M146 266 L176 266 L178 282 L146 282 Z" fill={url('leather')} {...THIN} />
        {/* 胴 */}
        <path d="M94 158 Q130 138 166 158 L162 226 Q130 240 98 226 Z" fill={url('leather')} {...STROKE} />
        <path d="M98 164 L160 220 M162 164 L100 220" stroke="#2a180c" strokeWidth="5" />
        <path d="M98 164 L160 220 M162 164 L100 220" stroke="#8a6a44" strokeWidth="2" />
        <circle cx="130" cy="192" r="6" fill="#c8b070" {...THIN} />
        <path d="M98 216 Q130 228 162 216 L162 226 Q130 238 98 226 Z" fill="#3a2414" {...THIN} />
        {/* 左腕（曲刀を振り上げる） */}
        <path d="M54 112 Q30 66 46 22 Q56 70 70 106 Z" fill={blade} {...STROKE} />
        <path d="M50 96 Q38 64 46 34" stroke="#ffffff" strokeWidth="2" fill="none" />
        <path d="M44 70 Q40 56 46 42" stroke="#7dff4a" strokeWidth="3" fill="none" opacity=".9" />
        <Limb d="M100 170 Q70 150 62 116" fill={skin} width={13} />
        <rect x="48" y="104" width="24" height="9" rx="3" transform="rotate(-20 60 108)" fill="#6a4a2a" {...THIN} />
        <circle cx="62" cy="114" r="9" fill={skin} {...STROKE} />
        {/* 右腕（曲刀を前に） */}
        <Limb d="M160 172 Q188 192 200 206" fill={skin} width={13} />
        <path d="M206 214 Q238 204 252 178 Q240 214 210 226 Z" fill={blade} {...STROKE} />
        <path d="M214 216 Q236 206 246 188" stroke="#ffffff" strokeWidth="2" fill="none" />
        <circle cx="204" cy="212" r="9" fill={skin} {...STROKE} />
        <circle cx="244" cy="194" r="12" fill={url('poison')} />
      </g>
      {/* 頭（フード） */}
      <g className="enemy-head">
        <path d="M98 100 L28 74 L56 98 L36 108 L100 122 Z" fill={skin} {...STROKE} />
        <path d="M162 100 L232 74 L204 98 L224 108 L160 122 Z" fill={skin} {...STROKE} />
        <path d="M92 120 Q90 74 130 68 Q170 74 168 120 Q164 152 130 160 Q96 152 92 120 Z" fill={skin} {...STROKE} />
        <path
          d="M78 124 Q72 40 130 26 Q170 22 196 -4 Q190 30 184 54 Q190 84 182 124 Q176 96 166 88 Q150 66 130 66 Q110 66 94 88 Q84 96 78 124 Z"
          fill={url('cloak')}
          {...STROKE}
        />
        <path d="M92 94 Q130 78 168 94 L166 110 Q130 98 94 110 Z" fill="#000" opacity=".5" />
        <EnemyEye cx={113} cy={110} glow={url('eye')} d="M102 105 L124 111 L104 116 Z" color="#eaff7a" />
        <EnemyEye cx={147} cy={110} glow={url('eye')} d="M158 105 L136 111 L156 116 Z" color="#eaff7a" />
        <path d="M128 112 Q140 122 131 130" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {/* 裂けた笑み */}
        <path d="M100 128 Q130 154 160 128 Q154 148 130 150 Q106 148 100 128 Z" fill="#2a0404" {...THIN} />
        <path
          d="M104 131 L108 138 L112 133 L116 141 L120 135 L124 143 L128 136 L132 143 L136 136 L140 142 L144 135 L148 140 L152 133 L156 137"
          stroke="#fff4d8"
          strokeWidth="2.2"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M166 116 Q162 142 136 156" stroke="#ff6a7a" strokeWidth="2.4" fill="none" opacity=".7" />
      </g>
    </svg>
  );
});
