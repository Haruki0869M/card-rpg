// 嘆きの沼の敵: 沼の亡者・泥沼スライム・沼の怨霊・屍術師モルデア（2形態）
import { memo } from 'react';
import { GlowDef, Grad3, INK, Limb, STROKE, THIN, useArtIds } from '../kit';
import { ENEMY_VIEWBOX } from './common';
import { Aura, EnemyEye } from './parts';

const Svg = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={ENEMY_VIEWBOX} className={className} aria-hidden>
    {children}
  </svg>
);

// ---------- 沼の亡者 ----------
export const BogGhoul = memo(function BogGhoul({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  const skin = url('skin');
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('skin')} c={['#9aa88a', '#5a6a4e', '#22301e']} x2={0.5} />
        <Grad3 id={id('rag')} c={['#6a5a48', '#3a3026', '#16120c']} />
        <Grad3 id={id('mud')} c={['#4a4a2a', '#2a2a16', '#0e0e06']} />
        <GlowDef id={id('eye')} color="#6affe0" />
        <GlowDef id={id('aura')} color="#2a6a5a" opacity={0.5} />
      </defs>
      <Aura url={url('aura')} cy={180} />
      {/* 泥の沼から這い出す */}
      <ellipse cx="130" cy="276" rx="118" ry="22" fill={url('mud')} {...STROKE} />
      <path d="M40 270 q10 -8 20 0 M180 268 q12 -10 24 0 M100 282 q8 -6 16 0" stroke="#7a7a4a" strokeWidth="3" fill="none" />
      <g className="enemy-body">
        {/* 胴（前かがみ） */}
        <path d="M78 270 Q66 200 92 156 Q130 128 168 156 Q194 200 182 270 Z" fill={skin} {...STROKE} />
        <path d="M100 176 Q130 190 160 176 M104 200 Q130 214 156 200 M108 224 Q130 236 152 224" stroke="#2a3020" strokeWidth="3" fill="none" />
        {/* ぼろ布 */}
        <path d="M84 196 L176 196 L182 262 L164 246 L150 268 L134 244 L116 270 L100 246 L80 262 Z" fill={url('rag')} {...STROKE} />
        {/* 腕（長く垂れ下がる） */}
        <Limb d="M90 170 Q50 196 44 248" fill={skin} width={18} />
        <path d="M44 248 l-12 16 M44 248 l-2 20 M44 248 l10 16" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        <path d="M44 248 l-12 16 M44 248 l-2 20 M44 248 l10 16" stroke="#cfd8b8" strokeWidth="3" strokeLinecap="round" />
        <Limb d="M170 170 Q214 186 222 236" fill={skin} width={18} />
        <path d="M222 236 l-8 20 M222 236 l4 22 M222 236 l14 14" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        <path d="M222 236 l-8 20 M222 236 l4 22 M222 236 l14 14" stroke="#cfd8b8" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="enemy-head">
        {/* 頭（髪の残った頭蓋） */}
        <path d="M94 128 Q92 74 130 70 Q168 74 166 128 Q164 152 130 160 Q96 152 94 128 Z" fill={skin} {...STROKE} />
        <path d="M96 100 Q84 80 92 62 M164 100 Q178 82 170 60 M110 76 Q104 56 116 46 M150 76 Q158 58 148 48" stroke="#2a2a1e" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* くぼんだ目 */}
        <ellipse cx="114" cy="112" rx="12" ry="10" fill="#0a0e0a" />
        <ellipse cx="146" cy="112" rx="12" ry="10" fill="#0a0e0a" />
        <EnemyEye cx={114} cy={112} glow={url('eye')} d="M108 108 L120 112 L108 116 Z" color="#c8fff0" />
        <EnemyEye cx={146} cy={112} glow={url('eye')} d="M152 108 L140 112 L152 116 Z" color="#c8fff0" />
        {/* 開いた口 */}
        <path d="M112 136 Q130 128 148 136 Q144 154 130 156 Q116 154 112 136 Z" fill="#1a0a0a" {...THIN} />
        <path d="M118 138 l2 6 M126 136 l1 7 M134 136 l-1 7 M142 138 l-2 6" stroke="#d8d0b0" strokeWidth="2.4" />
      </g>
    </Svg>
  );
});

// ---------- 泥沼スライム ----------
export const MireSlime = memo(function MireSlime({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('body')} c={['#8ac85a', '#3a7a2a', '#123a10']} x2={0.4} />
        <GlowDef id={id('glow')} color="#b8ff4a" opacity={0.8} />
        <GlowDef id={id('aura')} color="#3a8a2a" opacity={0.45} />
      </defs>
      <Aura url={url('aura')} cy={200} />
      <ellipse cx="130" cy="284" rx="112" ry="12" fill="#000" opacity=".6" />
      <g className="enemy-body">
        {/* 体（たれる泥） */}
        <path
          d="M28 270 Q22 196 64 150 Q100 108 130 110 Q160 108 196 150 Q238 196 232 270 Q214 280 200 268 Q190 284 172 272 Q160 288 140 276 Q124 290 108 276 Q90 288 80 272 Q62 284 52 270 Q40 280 28 270 Z"
          fill={url('body')}
          {...STROKE}
        />
        <path d="M60 170 Q90 136 128 132" stroke="#d8ff9a" strokeWidth="6" fill="none" opacity=".5" strokeLinecap="round" />
        {/* 毒の泡 */}
        <circle cx="70" cy="226" r="12" fill={url('glow')} />
        <circle cx="70" cy="226" r="7" fill="#d8ff8a" {...THIN} />
        <circle cx="196" cy="214" r="9" fill={url('glow')} />
        <circle cx="196" cy="214" r="5" fill="#d8ff8a" {...THIN} />
        <circle cx="160" cy="250" r="6" fill="#d8ff8a" {...THIN} />
        <circle cx="104" cy="252" r="4" fill="#d8ff8a" {...THIN} />
        {/* 中の骨 */}
        <path d="M100 236 L150 220 M108 228 l-6 -8 M142 224 l6 -8" stroke="#e8e0c0" strokeWidth="5" strokeLinecap="round" opacity=".55" />
      </g>
      <g className="enemy-head">
        <ellipse cx="108" cy="174" rx="18" ry="20" fill="#f6fff0" {...STROKE} />
        <ellipse cx="156" cy="174" rx="18" ry="20" fill="#f6fff0" {...STROKE} />
        <ellipse cx="112" cy="180" rx="8" ry="10" fill="#1a0a1a" />
        <ellipse cx="152" cy="180" rx="8" ry="10" fill="#1a0a1a" />
        <circle cx="109" cy="176" r="3" fill="#fff" />
        <circle cx="149" cy="176" r="3" fill="#fff" />
        <path d="M100 152 L124 162 M164 152 L140 162" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <path d="M110 208 Q130 222 150 208" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    </Svg>
  );
});

// ---------- 沼の怨霊 ----------
export const BogWraith = memo(function BogWraith({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('shroud')} c={['#c8e8f0', '#6a8aa8', '#1a2a40']} x2={0.3} />
        <GlowDef id={id('eye')} color="#7ad8ff" />
        <GlowDef id={id('aura')} color="#2a5a9a" opacity={0.6} />
      </defs>
      <Aura url={url('aura')} cy={150} />
      <ellipse cx="130" cy="288" rx="70" ry="9" fill="#000" opacity=".5" />
      <g className="enemy-body">
        {/* ぼろぼろの衣（下は霧になって消える） */}
        <path
          d="M70 120 Q60 200 40 268 L66 252 L80 280 L100 250 L118 284 L134 252 L152 286 L166 250 L186 278 L196 248 L222 266 Q200 200 190 120 Z"
          fill={url('shroud')}
          opacity=".92"
          {...STROKE}
        />
        <path d="M96 140 Q92 200 84 250 M130 140 V256 M164 140 Q168 200 176 248" stroke="#2a3a5a" strokeWidth="3" fill="none" opacity=".6" />
        {/* 鎖 */}
        <path d="M78 196 Q130 216 184 194" stroke="#4a4a58" strokeWidth="9" fill="none" strokeDasharray="10 5" {...{ strokeLinecap: 'round' as const }} />
        <path d="M78 196 Q130 216 184 194" stroke="#a8a8b8" strokeWidth="3" fill="none" strokeDasharray="10 5" />
        {/* 長い腕 */}
        <Limb d="M76 136 Q30 140 18 186" fill={url('shroud')} width={14} />
        <path d="M18 186 l-6 18 M18 186 l6 18 M18 186 l14 10" stroke="#e8f8ff" strokeWidth="3" strokeLinecap="round" />
        <Limb d="M184 136 Q230 140 242 186" fill={url('shroud')} width={14} />
        <path d="M242 186 l6 18 M242 186 l-6 18 M242 186 l-14 10" stroke="#e8f8ff" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="enemy-head">
        {/* フード */}
        <path d="M74 132 Q70 54 130 40 Q190 54 186 132 Q160 116 130 118 Q100 116 74 132 Z" fill={url('shroud')} {...STROKE} />
        <path d="M92 124 Q96 76 130 70 Q164 76 168 124 Q150 114 130 114 Q110 114 92 124 Z" fill="#06080e" />
        <EnemyEye cx={114} cy={98} glow={url('eye')} d="M104 94 L122 98 L106 104 Z" color="#e0f8ff" />
        <EnemyEye cx={146} cy={98} glow={url('eye')} d="M156 94 L138 98 L154 104 Z" color="#e0f8ff" />
        <path d="M116 116 Q130 108 144 116" stroke="#7ad8ff" strokeWidth="3" fill="none" />
      </g>
    </Svg>
  );
});

// ---------- 屍術師モルデア ----------
export const Mordea = memo(function Mordea({ className, phase = 0 }: { className?: string; phase?: number }) {
  const { id, url } = useArtIds();
  const rage = phase >= 1;
  const robe = url('robe');
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('robe')} c={rage ? ['#7a2a8a', '#3a0a4a', '#12021a'] : ['#4a5a4a', '#24302a', '#0a100c']} x2={0.4} />
        <Grad3 id={id('trim')} c={['#e8d8a0', '#a08a4a', '#4a3a14']} />
        <Grad3 id={id('bone')} c={['#fff6e0', '#d0c4a0', '#7a6a48']} />
        <GlowDef id={id('eye')} color={rage ? '#ff4ad8' : '#7aff8a'} />
        <GlowDef id={id('fire')} color={rage ? '#d04aff' : '#4aff7a'} opacity={0.9} />
        <GlowDef id={id('aura')} color={rage ? '#9a1aff' : '#1a8a4a'} opacity={0.55} />
      </defs>
      <Aura url={url('aura')} cy={150} />
      <ellipse cx="130" cy="290" rx="110" ry="12" fill="#000" opacity=".65" />
      {/* 漂うドクロ（第2形態） */}
      {rage &&
        [
          [34, 90],
          [222, 70],
          [30, 200],
          [230, 190],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="20" fill={url('fire')} />
            <path d={`M${x - 11} ${y + 2} Q${x - 12} ${y - 14} ${x} ${y - 14} Q${x + 12} ${y - 14} ${x + 11} ${y + 2} L${x + 6} ${y + 10} L${x - 6} ${y + 10} Z`} fill={url('bone')} {...THIN} />
            <circle cx={x - 5} cy={y - 3} r="3.4" fill="#1a0a1a" />
            <circle cx={x + 5} cy={y - 3} r="3.4" fill="#1a0a1a" />
          </g>
        ))}
      <g className="enemy-body">
        {/* ローブ */}
        <path d="M80 120 Q60 210 44 286 L216 286 Q200 210 180 120 Q130 104 80 120 Z" fill={robe} {...STROKE} />
        <path d="M130 124 V286 M92 150 Q82 220 70 286 M168 150 Q178 220 190 286" stroke="#0a0a0a" strokeWidth="3" fill="none" opacity=".5" />
        <path d="M118 126 L130 286 L142 126" fill="none" stroke={url('trim')} strokeWidth="6" />
        {rage && <path d="M60 240 L74 286 M196 230 L184 286 M110 250 L120 286" stroke={INK} strokeWidth="4" />}
        {/* 骨のネックレス */}
        <path d="M96 130 Q130 156 164 130" stroke={INK} strokeWidth="3" fill="none" />
        {[104, 116, 130, 144, 156].map((x, i) => (
          <circle key={i} cx={x} cy={136 + (i === 2 ? 10 : i % 2 ? 6 : 2)} r="5" fill={url('bone')} {...THIN} />
        ))}
        {/* 杖（ドクロの杖） */}
        <path d="M206 286 L196 70" stroke={INK} strokeWidth="11" strokeLinecap="round" />
        <path d="M206 286 L196 70" stroke="#5a3a20" strokeWidth="6" strokeLinecap="round" />
        <circle cx="196" cy="62" r="30" fill={url('fire')} />
        <path d="M180 66 Q178 40 196 38 Q214 40 212 66 L206 78 L186 78 Z" fill={url('bone')} {...STROKE} />
        <circle cx="189" cy="58" r="5" fill={rage ? '#ff4ad8' : '#4aff7a'} />
        <circle cx="203" cy="58" r="5" fill={rage ? '#ff4ad8' : '#4aff7a'} />
        {/* 手 */}
        <Limb d="M168 150 Q196 160 198 150" fill={robe} width={16} />
        <circle cx="198" cy="150" r="9" fill={url('bone')} {...THIN} />
        <Limb d="M92 150 Q60 170 46 150" fill={robe} width={16} />
        <circle cx="44" cy="148" r="16" fill={url('fire')} />
        <circle cx="46" cy="150" r="9" fill={url('bone')} {...THIN} />
      </g>
      <g className="enemy-head">
        {/* フードと顔 */}
        <path d="M82 124 Q76 50 130 34 Q184 50 178 124 Q154 108 130 110 Q106 108 82 124 Z" fill={robe} {...STROKE} />
        <path d="M98 116 Q102 70 130 62 Q158 70 162 116 Q146 106 130 106 Q114 106 98 116 Z" fill="#0c0610" />
        <path d="M110 112 Q112 84 130 80 Q148 84 150 112 Q140 120 130 120 Q120 120 110 112 Z" fill={url('bone')} {...THIN} />
        <EnemyEye cx={121} cy={96} glow={url('eye')} d="M114 92 L127 96 L115 101 Z" color={rage ? '#ffd0f8' : '#e0ffe0'} />
        <EnemyEye cx={139} cy={96} glow={url('eye')} d="M146 92 L133 96 L145 101 Z" color={rage ? '#ffd0f8' : '#e0ffe0'} />
        <path d="M122 110 L138 110" stroke={INK} strokeWidth="2.4" />
        {rage && <path d="M98 40 L88 10 L110 34 M162 40 L172 10 L150 34" fill="#3a0a4a" {...STROKE} />}
      </g>
    </Svg>
  );
});

/** この絵を使う敵のID（ファイルを置くだけで自動で登録される） */
export const enemyArt = { bogGhoul: BogGhoul, mireSlime: MireSlime, bogWraith: BogWraith, mordea: Mordea };
