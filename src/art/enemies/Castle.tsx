// 魔王城の敵: 魔王軍の騎士・門番ガルザ・侵食の魔王ヴァルグリム（3形態）
import { memo } from 'react';
import { GlowDef, Grad3, INK, Limb, STROKE, THIN, useArtIds } from '../kit';
import { ENEMY_VIEWBOX } from './common';
import { Aura, EnemyEye } from './parts';

const Svg = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={ENEMY_VIEWBOX} className={className} aria-hidden>
    {children}
  </svg>
);

// ---------- 魔王軍の騎士 ----------
export const DarkKnight = memo(function DarkKnight({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  const steel = url('steel');
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('steel')} c={['#7a7a90', '#34344a', '#0e0e18']} x2={0.5} />
        <Grad3 id={id('cape')} c={['#8a1a2a', '#4a0a14', '#16020a']} />
        <Grad3 id={id('blade')} c={['#c8a8ff', '#5a2a9a', '#1a0a3a']} x2={1} />
        <GlowDef id={id('eye')} color="#c84aff" />
        <GlowDef id={id('aura')} color="#5a1a9a" opacity={0.5} />
      </defs>
      <Aura url={url('aura')} cy={160} />
      <ellipse cx="130" cy="290" rx="104" ry="11" fill="#000" opacity=".65" />
      {/* マント */}
      <path d="M78 110 Q50 200 40 286 L220 286 Q210 200 182 110 Z" fill={url('cape')} {...STROKE} />
      <g className="enemy-body">
        {/* 脚 */}
        <path d="M96 220 L88 286 L122 286 L124 224 Z M136 224 L138 286 L172 286 L164 220 Z" fill={steel} {...STROKE} />
        {/* 鎧の胴 */}
        <path d="M82 112 Q130 92 178 112 L172 226 Q130 240 88 226 Z" fill={steel} {...STROKE} />
        <path d="M130 104 V232 M96 150 Q130 164 164 150 M94 190 Q130 204 166 190" stroke="#0a0a14" strokeWidth="3" fill="none" />
        <path d="M100 122 Q130 112 160 122" stroke="#c8c8e0" strokeWidth="3" fill="none" opacity=".5" />
        {/* 肩当て（とげ） */}
        <path d="M60 116 Q76 94 104 108 L96 138 Q70 140 60 116 Z M200 116 Q184 94 156 108 L164 138 Q190 140 200 116 Z" fill={steel} {...STROKE} />
        <path d="M66 108 L52 88 L78 102 M194 108 L208 88 L182 102" fill={steel} {...THIN} />
        {/* 盾 */}
        <path d="M28 150 L76 142 L80 210 Q56 236 32 214 Z" fill={steel} {...STROKE} />
        <path d="M44 166 L64 162 L66 200 L48 204 Z" fill={url('cape')} {...THIN} />
        {/* 大剣 */}
        <path d="M206 160 L240 20 L252 26 L222 166 Z" fill={url('blade')} {...STROKE} />
        <path d="M196 158 L234 168 M212 158 L210 200" stroke={INK} strokeWidth="10" strokeLinecap="round" />
        <path d="M196 158 L234 168" stroke="#c8a04a" strokeWidth="5" strokeLinecap="round" />
        <Limb d="M176 128 Q206 150 210 180" fill={steel} width={18} />
      </g>
      <g className="enemy-head">
        {/* 兜 */}
        <path d="M96 106 Q92 50 130 42 Q168 50 164 106 Q130 116 96 106 Z" fill={steel} {...STROKE} />
        <path d="M104 80 L156 80 L152 92 L108 92 Z" fill="#06060c" />
        <EnemyEye cx={118} cy={86} glow={url('eye')} d="M110 84 L126 86 L110 89 Z" color="#f0d0ff" />
        <EnemyEye cx={142} cy={86} glow={url('eye')} d="M150 84 L134 86 L150 89 Z" color="#f0d0ff" />
        <path d="M130 42 Q120 20 132 4 Q150 22 136 44" fill={url('cape')} {...THIN} />
        <path d="M100 60 L82 30 L110 52 M160 60 L178 30 L150 52" fill={steel} {...THIN} />
      </g>
    </Svg>
  );
});

// ---------- 門番ガルザ ----------
export const Gatekeeper = memo(function Gatekeeper({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  const skin = url('skin');
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('skin')} c={['#6a8a9a', '#2e4a5a', '#0e1a22']} x2={0.5} />
        <Grad3 id={id('armor')} c={['#8a7a5a', '#4a3a24', '#1a120a']} />
        <Grad3 id={id('axe')} c={['#e8e8f0', '#8a8aa0', '#2a2a3a']} x2={1} />
        <Grad3 id={id('horn')} c={['#fff6e0', '#c8b890', '#4a3a20']} />
        <GlowDef id={id('eye')} color="#ff4a2a" />
        <GlowDef id={id('aura')} color="#9a1a1a" opacity={0.5} />
      </defs>
      <Aura url={url('aura')} cy={150} />
      <ellipse cx="130" cy="290" rx="124" ry="13" fill="#000" opacity=".7" />
      <g className="enemy-body">
        {/* 大斧 */}
        <path d="M222 286 L214 30" stroke={INK} strokeWidth="13" strokeLinecap="round" />
        <path d="M222 286 L214 30" stroke="#5a3a1a" strokeWidth="7" strokeLinecap="round" />
        <path d="M214 50 Q262 40 266 100 Q252 120 216 112 Z" fill={url('axe')} {...STROKE} />
        <path d="M214 56 Q170 46 164 96 Q178 116 214 106 Z" fill={url('axe')} {...STROKE} />
        {/* 脚 */}
        <path d="M78 220 L64 288 L112 288 L116 226 Z M144 226 L148 288 L196 288 L182 220 Z" fill={skin} {...STROKE} />
        <path d="M60 270 L116 270 L114 288 L58 288 Z M144 270 L200 270 L198 288 L146 288 Z" fill={url('armor')} {...THIN} />
        {/* 胴（筋肉） */}
        <path d="M56 120 Q130 90 204 120 L196 230 Q130 250 64 230 Z" fill={skin} {...STROKE} />
        <path d="M96 140 Q130 160 164 140 M100 176 Q130 186 160 176 M130 150 V220" stroke="#0e1a22" strokeWidth="3.5" fill="none" />
        {/* ベルト */}
        <path d="M62 206 Q130 224 198 206 L196 230 Q130 248 64 230 Z" fill={url('armor')} {...THIN} />
        <circle cx="130" cy="226" r="12" fill="#c8a04a" {...THIN} />
        {/* 腕 */}
        <Limb d="M62 128 Q20 160 34 220" fill={skin} width={30} />
        <circle cx="34" cy="226" r="16" fill={skin} {...STROKE} />
        <Limb d="M198 128 Q226 150 216 186" fill={skin} width={30} />
        <circle cx="218" cy="190" r="16" fill={skin} {...STROKE} />
        {/* 肩当て */}
        <path d="M40 112 Q60 92 96 104 L90 140 Q54 142 40 112 Z M220 112 Q200 92 164 104 L170 140 Q206 142 220 112 Z" fill={url('armor')} {...STROKE} />
      </g>
      <g className="enemy-head">
        {/* 角 */}
        <path d="M96 76 Q60 50 56 14 Q80 40 108 60 Z M164 76 Q200 50 204 14 Q180 40 152 60 Z" fill={url('horn')} {...STROKE} />
        <path d="M92 108 Q88 50 130 44 Q172 50 168 108 Q130 124 92 108 Z" fill={skin} {...STROKE} />
        <EnemyEye cx={114} cy={80} glow={url('eye')} d="M102 76 L124 80 L104 86 Z" color="#ffd0a0" />
        <EnemyEye cx={146} cy={80} glow={url('eye')} d="M158 76 L136 80 L156 86 Z" color="#ffd0a0" />
        <path d="M98 68 L126 76 M162 68 L134 76" stroke={INK} strokeWidth="6" strokeLinecap="round" />
        {/* 牙 */}
        <path d="M108 100 Q130 112 152 100" stroke={INK} strokeWidth="4" fill="none" />
        <path d="M110 100 l4 -14 l4 14 M142 100 l4 -14 l4 14" fill="#fff6e0" {...THIN} />
      </g>
    </Svg>
  );
});

// ---------- 侵食の魔王ヴァルグリム ----------
export const Valgrim = memo(function Valgrim({ className, phase = 0 }: { className?: string; phase?: number }) {
  const { id, url } = useArtIds();
  const robe = url('robe');
  const p1 = phase >= 1;
  const p2 = phase >= 2;
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('robe')} c={p2 ? ['#5a1a3a', '#2a0418', '#0a0006'] : ['#3a2a5a', '#160a2e', '#06020e']} x2={0.4} />
        <Grad3 id={id('skin')} c={p1 ? ['#9a6aaa', '#4a2a5a', '#160a1e'] : ['#c8b8d8', '#7a6a8a', '#2a1e34']} x2={0.5} />
        <Grad3 id={id('gold')} c={['#fff2b0', '#f2c24a', '#7a4a0a']} />
        <Grad3 id={id('horn')} c={['#3a2a3a', '#1a0e1a', '#060206']} />
        <Grad3 id={id('wing')} c={['#6a2a8a', '#2a0a3a', '#0a020e']} />
        <GlowDef id={id('eye')} color={p2 ? '#ff2a4a' : '#e04aff'} />
        <GlowDef id={id('core')} color={p2 ? '#ff3a5a' : '#c84aff'} opacity={0.95} />
        <GlowDef id={id('aura')} color={p2 ? '#ff1a4a' : '#7a1aff'} opacity={0.65} />
      </defs>
      <Aura url={url('aura')} cy={140} />
      <ellipse cx="130" cy="292" rx="128" ry="13" fill="#000" opacity=".75" />
      {/* 真の姿: 翼 */}
      {p1 && (
        <g>
          <path d="M90 120 Q10 30 -10 60 Q8 100 -4 140 Q24 130 30 170 Q50 150 64 190 Q74 166 92 180 Z" fill={url('wing')} {...STROKE} />
          <path d="M170 120 Q250 30 270 60 Q252 100 264 140 Q236 130 230 170 Q210 150 196 190 Q186 166 168 180 Z" fill={url('wing')} {...STROKE} />
          <path d="M90 120 L-4 140 M90 120 L30 170 M90 120 L64 190 M170 120 L264 140 M170 120 L230 170 M170 120 L196 190" stroke="#c84aff" strokeWidth="2" opacity=".6" />
        </g>
      )}
      <g className="enemy-body">
        {/* ローブ */}
        <path d="M74 116 Q50 210 30 290 L230 290 Q210 210 186 116 Q130 98 74 116 Z" fill={robe} {...STROKE} />
        <path d="M100 130 Q86 210 76 290 M160 130 Q174 210 184 290" stroke={url('gold')} strokeWidth="5" fill="none" />
        {/* 胸の核（侵食の源） */}
        <circle cx="130" cy="168" r={p2 ? 34 : 26} fill={url('core')} />
        <path d="M130 146 L146 168 L130 190 L114 168 Z" fill={p2 ? '#ffd0d8' : '#f0d0ff'} {...THIN} />
        {p2 && <path d="M100 150 L114 164 M160 150 L146 164 M104 196 L116 182 M156 196 L144 182 M90 230 L110 210 M170 230 L150 210" stroke={url('core')} strokeWidth="6" strokeLinecap="round" />}
        {/* 腕 */}
        <Limb d="M80 130 Q36 150 26 200" fill={url('skin')} width={18} />
        <path d="M26 200 l-12 14 M26 200 l-2 20 M26 200 l12 14" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        <path d="M26 200 l-12 14 M26 200 l-2 20 M26 200 l12 14" stroke={p1 ? '#c84aff' : '#e8d8f0'} strokeWidth="3" strokeLinecap="round" />
        <circle cx="22" cy="200" r="22" fill={url('core')} opacity=".7" />
        <Limb d="M180 130 Q224 150 234 200" fill={url('skin')} width={18} />
        <path d="M234 200 l12 14 M234 200 l2 20 M234 200 l-12 14" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        <path d="M234 200 l12 14 M234 200 l2 20 M234 200 l-12 14" stroke={p1 ? '#c84aff' : '#e8d8f0'} strokeWidth="3" strokeLinecap="round" />
        {/* 肩の飾り */}
        <path d="M54 118 Q74 92 106 108 L98 138 Q64 142 54 118 Z M206 118 Q186 92 154 108 L162 138 Q196 142 206 118 Z" fill={url('gold')} {...STROKE} />
      </g>
      <g className="enemy-head">
        {/* 大きな角 */}
        <path d={p1 ? 'M100 70 Q50 40 40 -8 Q76 20 112 50 Z M160 70 Q210 40 220 -8 Q184 20 148 50 Z' : 'M104 66 Q74 40 70 6 Q94 30 114 50 Z M156 66 Q186 40 190 6 Q166 30 146 50 Z'} fill={url('horn')} {...STROKE} />
        {/* 顔 */}
        <path d="M98 106 Q94 50 130 42 Q166 50 162 106 Q150 126 130 128 Q110 126 98 106 Z" fill={url('skin')} {...STROKE} />
        {p1 && <path d="M104 70 L116 80 M156 70 L144 80 M110 112 L118 104 M150 112 L142 104" stroke="#c84aff" strokeWidth="3" />}
        {/* 冠 */}
        <path d="M100 56 L104 30 L116 46 L130 22 L144 46 L156 30 L160 56 Q130 48 100 56 Z" fill={url('gold')} {...STROKE} />
        <circle cx="130" cy="40" r="5" fill={url('core')} />
        <EnemyEye cx={115} cy={84} glow={url('eye')} d="M104 80 L126 84 L106 90 Z" color={p2 ? '#ffffff' : '#f8d8ff'} />
        <EnemyEye cx={145} cy={84} glow={url('eye')} d="M156 80 L134 84 L154 90 Z" color={p2 ? '#ffffff' : '#f8d8ff'} />
        <path d="M100 72 L126 80 M160 72 L134 80" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <path d="M116 108 Q130 116 144 108" stroke={INK} strokeWidth="3.4" fill="none" />
        {p1 && <path d="M118 110 l3 8 l3 -7 M136 110 l3 7 l3 -8" fill="#fff6e0" {...THIN} />}
      </g>
    </Svg>
  );
});

/** この絵を使う敵のID（ファイルを置くだけで自動で登録される） */
export const enemyArt = { darkKnight: DarkKnight, gatekeeper: Gatekeeper, valgrim: Valgrim };
