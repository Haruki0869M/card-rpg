// 灼熱の火山の敵: 火トカゲ・灰コウモリ・溶岩ゴーレム・炎竜イグナヴァル（2形態）
import { memo } from 'react';
import { GlowDef, Grad3, INK, Limb, STROKE, THIN, useArtIds } from '../kit';
import { ENEMY_VIEWBOX } from './common';
import { Aura, EnemyEye } from './parts';

const Svg = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={ENEMY_VIEWBOX} className={className} aria-hidden>
    {children}
  </svg>
);

/** 炎のゆらめき（光の塊＋炎の形） */
function Flames({ url, points, color = '#ffd04a' }: { url: string; points: [number, number, number][]; color?: string }) {
  return (
    <g>
      {points.map(([x, y, s], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={s * 1.4} fill={url} />
          <path d={`M${x} ${y - s * 1.6} Q${x + s} ${y - s * 0.2} ${x + s * 0.5} ${y + s * 0.6} Q${x} ${y + s} ${x - s * 0.5} ${y + s * 0.6} Q${x - s} ${y - s * 0.2} ${x} ${y - s * 1.6} Z`} fill={color} {...THIN} />
        </g>
      ))}
    </g>
  );
}

// ---------- 火トカゲ ----------
export const FireSalamander = memo(function FireSalamander({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  const skin = url('skin');
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('skin')} c={['#ff9a4a', '#c23a1a', '#4a0e06']} x2={0.4} />
        <Grad3 id={id('belly')} c={['#ffe8a0', '#e8a84a', '#8a4a14']} />
        <GlowDef id={id('fire')} color="#ff7a1a" opacity={0.85} />
        <GlowDef id={id('eye')} color="#ffe84a" />
        <GlowDef id={id('aura')} color="#c23a0a" opacity={0.45} />
      </defs>
      <Aura url={url('aura')} cy={200} />
      <ellipse cx="130" cy="286" rx="116" ry="11" fill="#000" opacity=".6" />
      <g className="enemy-body">
        {/* しっぽ */}
        <path d="M200 236 Q250 230 254 180 Q256 150 236 140" stroke={INK} strokeWidth="26" fill="none" strokeLinecap="round" />
        <path d="M200 236 Q250 230 254 180 Q256 150 236 140" stroke={skin} strokeWidth="19" fill="none" strokeLinecap="round" />
        <Flames url={url('fire')} points={[[236, 128, 12]]} />
        {/* 胴 */}
        <path d="M40 232 Q50 176 120 170 Q190 168 212 220 Q214 262 190 270 L64 270 Q36 262 40 232 Z" fill={skin} {...STROKE} />
        <path d="M64 252 Q130 268 196 252 Q190 266 130 272 Q70 266 64 252 Z" fill={url('belly')} {...THIN} />
        {/* 背中の炎のとさか */}
        <Flames url={url('fire')} points={[[90, 166, 11], [126, 158, 13], [162, 164, 11], [194, 180, 9]]} />
        {/* 足 */}
        <path d="M70 262 L56 288 L84 288 L92 266 Z M176 262 L190 288 L162 288 L156 266 Z" fill={skin} {...STROKE} />
        {/* 背中の模様 */}
        <path d="M80 200 q10 -8 20 0 M120 190 q10 -8 20 0 M160 198 q10 -8 20 0" stroke="#5a0e06" strokeWidth="4" fill="none" />
      </g>
      <g className="enemy-head">
        <path d="M10 198 Q8 160 46 152 Q88 150 96 190 Q96 222 60 230 Q22 232 10 198 Z" fill={skin} {...STROKE} />
        <path d="M12 206 Q40 214 84 206" stroke={INK} strokeWidth="4" fill="none" />
        <path d="M18 208 l4 8 l4 -7 M34 210 l4 8 l4 -7 M50 210 l4 8 l4 -8" fill="#fff6e0" {...THIN} />
        <EnemyEye cx={56} cy={178} glow={url('eye')} d="M46 172 L66 178 L48 184 Z" color="#fff6a0" />
        <path d="M40 166 L68 174" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <circle cx="20" cy="190" r="3" fill="#2a0806" />
      </g>
    </Svg>
  );
});

// ---------- 灰コウモリ ----------
export const AshBat = memo(function AshBat({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  const wing = url('wing');
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('wing')} c={['#6a5a5a', '#3a2a2e', '#140c10']} />
        <Grad3 id={id('fur')} c={['#8a7a72', '#4a3e3a', '#1a1214']} />
        <GlowDef id={id('ember')} color="#ff6a1a" opacity={0.9} />
        <GlowDef id={id('eye')} color="#ff3a2a" />
        <GlowDef id={id('aura')} color="#8a2a10" opacity={0.4} />
      </defs>
      <Aura url={url('aura')} cy={150} />
      <ellipse cx="130" cy="284" rx="60" ry="8" fill="#000" opacity=".45" />
      <g className="enemy-body">
        {/* 翼（ふちが燃えている） */}
        <path d="M110 150 Q60 70 6 96 Q24 120 18 150 Q42 140 52 166 Q70 150 84 180 Q96 160 112 176 Z" fill={wing} {...STROKE} />
        <path d="M150 150 Q200 70 254 96 Q236 120 242 150 Q218 140 208 166 Q190 150 176 180 Q164 160 148 176 Z" fill={wing} {...STROKE} />
        <path d="M110 150 L18 150 M110 150 L52 166 M110 150 L84 180 M150 150 L242 150 M150 150 L208 166 M150 150 L176 180" stroke={INK} strokeWidth="2.4" />
        {[
          [18, 150],
          [52, 166],
          [84, 180],
          [242, 150],
          [208, 166],
          [176, 180],
          [6, 96],
          [254, 96],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="9" fill={url('ember')} />
        ))}
        {/* 胴 */}
        <ellipse cx="130" cy="170" rx="30" ry="36" fill={url('fur')} {...STROKE} />
        <path d="M118 204 l-4 14 M142 204 l4 14" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      </g>
      <g className="enemy-head">
        <path d="M108 116 L100 82 L120 108 Z M152 116 L160 82 L140 108 Z" fill={url('fur')} {...STROKE} />
        <circle cx="130" cy="130" r="26" fill={url('fur')} {...STROKE} />
        <EnemyEye cx={120} cy={126} glow={url('eye')} d="M114 122 L126 126 L115 130 Z" color="#ffb0a0" />
        <EnemyEye cx={140} cy={126} glow={url('eye')} d="M146 122 L134 126 L145 130 Z" color="#ffb0a0" />
        <path d="M120 142 Q130 150 140 142" stroke={INK} strokeWidth="3" fill="none" />
        <path d="M122 143 l2 6 l2 -5 M134 143 l2 6 l2 -6" fill="#fff6e0" {...THIN} />
      </g>
    </Svg>
  );
});

// ---------- 溶岩ゴーレム ----------
export const MagmaGolem = memo(function MagmaGolem({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  const rock = url('rock');
  const lava = url('lava');
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('rock')} c={['#6a5a5a', '#3a2e30', '#120c0e']} x2={0.5} />
        <GlowDef id={id('lava')} color="#ff6a1a" opacity={0.95} />
        <GlowDef id={id('eye')} color="#ffd04a" />
        <GlowDef id={id('aura')} color="#c2420a" opacity={0.5} />
      </defs>
      <Aura url={url('aura')} cy={170} />
      <ellipse cx="130" cy="290" rx="122" ry="12" fill="#000" opacity=".65" />
      <g className="enemy-body">
        {/* 脚 */}
        <path d="M70 230 L56 288 L110 288 L112 236 Z M150 236 L150 288 L204 288 L190 230 Z" fill={rock} {...STROKE} />
        {/* 胴（岩の塊） */}
        <path d="M48 140 L84 96 L176 96 L214 140 L206 236 L54 236 Z" fill={rock} {...STROKE} />
        {/* 溶岩のひび */}
        <path d="M80 120 L104 150 L92 180 L118 206 M180 118 L160 150 L172 186 L150 214 M130 110 L134 150 L126 190" stroke={lava} strokeWidth="12" strokeLinecap="round" fill="none" />
        <path d="M80 120 L104 150 L92 180 L118 206 M180 118 L160 150 L172 186 L150 214 M130 110 L134 150 L126 190" stroke="#ffe08a" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* 胸の核 */}
        <circle cx="130" cy="166" r="20" fill={lava} />
        <path d="M120 156 L140 156 L146 172 L130 182 L114 172 Z" fill="#ffd04a" {...THIN} />
        {/* 腕（大きな岩の拳） */}
        <Limb d="M54 150 Q22 180 26 230" fill={rock} width={30} />
        <path d="M6 222 L48 220 L50 262 L4 260 Z" fill={rock} {...STROKE} />
        <path d="M14 236 l28 0" stroke={lava} strokeWidth="6" />
        <Limb d="M206 150 Q238 180 234 230" fill={rock} width={30} />
        <path d="M254 222 L212 220 L210 262 L256 260 Z" fill={rock} {...STROKE} />
        <path d="M218 236 l28 0" stroke={lava} strokeWidth="6" />
      </g>
      <g className="enemy-head">
        <path d="M92 98 L100 52 L160 52 L168 98 Z" fill={rock} {...STROKE} />
        <path d="M100 74 L160 74" stroke={INK} strokeWidth="3" />
        <EnemyEye cx={116} cy={84} glow={url('eye')} d="M106 80 L126 84 L106 89 Z" color="#fff2b0" />
        <EnemyEye cx={144} cy={84} glow={url('eye')} d="M154 80 L134 84 L154 89 Z" color="#fff2b0" />
        <path d="M112 62 L94 40 L120 54 M148 62 L166 40 L140 54" fill={rock} {...THIN} />
      </g>
    </Svg>
  );
});

// ---------- 炎竜イグナヴァル ----------
export const Ignavarl = memo(function Ignavarl({ className, phase = 0 }: { className?: string; phase?: number }) {
  const { id, url } = useArtIds();
  const rage = phase >= 1;
  const scale = url('scale');
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('scale')} c={rage ? ['#ff6a3a', '#a01a0a', '#2a0402'] : ['#d84a2a', '#7a1a10', '#220604']} x2={0.5} />
        <Grad3 id={id('wing')} c={rage ? ['#ff8a4a', '#8a1a0a', '#2a0602'] : ['#a83a2a', '#5a120a', '#1a0404']} />
        <Grad3 id={id('belly')} c={['#ffe8a0', '#e8a04a', '#7a3a0a']} />
        <Grad3 id={id('horn')} c={['#fff6e0', '#c8b890', '#5a4a30']} />
        <GlowDef id={id('fire')} color={rage ? '#ffd04a' : '#ff8a1a'} opacity={0.9} />
        <GlowDef id={id('eye')} color={rage ? '#ffffff' : '#ffe04a'} />
        <GlowDef id={id('aura')} color={rage ? '#ff4a0a' : '#c2220a'} opacity={0.55} />
      </defs>
      <Aura url={url('aura')} cy={140} />
      <ellipse cx="130" cy="290" rx="126" ry="13" fill="#000" opacity=".7" />
      {/* 翼 */}
      <path d="M86 130 Q20 40 -6 30 Q10 80 4 120 Q24 110 30 140 Q46 128 56 160 Q70 144 86 170 Z" fill={url('wing')} {...STROKE} />
      <path d="M174 130 Q240 40 266 30 Q250 80 256 120 Q236 110 230 140 Q214 128 204 160 Q190 144 174 170 Z" fill={url('wing')} {...STROKE} />
      <path d="M86 130 L4 120 M86 130 L30 140 M86 130 L56 160 M174 130 L256 120 M174 130 L230 140 M174 130 L204 160" stroke={INK} strokeWidth="3" />
      {rage && <Flames url={url('fire')} points={[[-2, 34, 10], [262, 34, 10], [6, 120, 7], [254, 120, 7]]} />}
      <g className="enemy-body">
        {/* 胴 */}
        <path d="M70 160 Q72 120 130 116 Q188 120 190 160 L200 262 Q130 290 60 262 Z" fill={scale} {...STROKE} />
        <path d="M100 150 Q130 140 160 150 L164 260 Q130 274 96 260 Z" fill={url('belly')} {...THIN} />
        <path d="M100 176 H160 M98 202 H162 M98 228 H162" stroke="#7a3a0a" strokeWidth="3" />
        {/* 前脚 */}
        <Limb d="M76 180 Q44 220 54 270" fill={scale} width={24} />
        <path d="M44 272 l-8 12 M54 274 l0 14 M64 272 l8 12" stroke="#fff6e0" strokeWidth="4" strokeLinecap="round" />
        <Limb d="M184 180 Q216 220 206 270" fill={scale} width={24} />
        <path d="M196 272 l-8 12 M206 274 l0 14 M216 272 l8 12" stroke="#fff6e0" strokeWidth="4" strokeLinecap="round" />
        {/* 背びれ */}
        <path d="M86 128 L80 106 L98 120 L100 96 L114 116 L130 90 L146 116 L160 96 L162 120 L180 106 L174 128" fill={url('horn')} {...THIN} />
      </g>
      <g className="enemy-head">
        {/* 首と頭 */}
        <path d="M104 126 Q100 80 130 64 Q160 80 156 126 Z" fill={scale} {...STROKE} />
        <path d="M92 64 Q90 22 130 14 Q170 22 168 64 Q166 92 130 100 Q94 92 92 64 Z" fill={scale} {...STROKE} />
        {/* 角 */}
        <path d="M100 30 Q78 0 64 -6 Q84 20 94 44 Z M160 30 Q182 0 196 -6 Q176 20 166 44 Z" fill={url('horn')} {...STROKE} />
        {/* 口（炎を吐く） */}
        <path d="M108 78 Q130 70 152 78 Q148 98 130 102 Q112 98 108 78 Z" fill="#2a0402" {...THIN} />
        <path d="M112 80 l3 8 l3 -7 M142 80 l3 7 l3 -8 M124 98 l3 -8 l3 8" fill="#fff6e0" {...THIN} />
        {rage && <Flames url={url('fire')} points={[[130, 112, 10]]} color="#fff2a0" />}
        <EnemyEye cx={112} cy={50} glow={url('eye')} d="M100 44 L124 50 L102 56 Z" color={rage ? '#ffffff' : '#fff6a0'} />
        <EnemyEye cx={148} cy={50} glow={url('eye')} d="M160 44 L136 50 L158 56 Z" color={rage ? '#ffffff' : '#fff6a0'} />
        <path d="M98 36 L126 46 M162 36 L134 46" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      </g>
    </Svg>
  );
});

/** この絵を使う敵のID（ファイルを置くだけで自動で登録される） */
export const enemyArt = { fireSalamander: FireSalamander, ashBat: AshBat, magmaGolem: MagmaGolem, ignavarl: Ignavarl };
