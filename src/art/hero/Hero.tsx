// ===== 味方キャラ（2.5頭身）の共通の絵 =====
// 職業ごとの違いは HeroLook（色・髪型・服・武器・頭の装備）で表現する。
// 部位ごとに className を付け、CSS の transform アニメーション（呼吸・揺れ）を当てられるようにしている。

import { memo } from 'react';
import { GlowDef, Grad3, INK, Limb, STROKE, THIN, useArtIds, type Ids } from '../kit';

type C3 = readonly [string, string, string];

export interface HeroLook {
  gender: 'male' | 'female';
  skin: C3;
  hair: C3;
  hairStyle: 'spiky' | 'long' | 'ponytail' | 'short' | 'bob' | 'messy';
  eyes: string;
  outfit: 'plate' | 'robe' | 'heavy' | 'leather';
  cloth: C3;
  cloth2: C3;
  cape: C3;
  metal: C3;
  trim: C3;
  weapon: 'greatsword' | 'staff' | 'hammer' | 'bow';
  headgear: 'circlet' | 'wizardHat' | 'helmet' | 'hood' | 'featherBand' | 'none';
  /** 宝石・発光部分の色 */
  gem: string;
  /** リムライトの色 */
  rim: string;
}

export const HERO_VIEWBOX = '0 -30 240 330';

// ---------- 部品 ----------

function Defs({ look, ids }: { look: HeroLook; ids: Ids }) {
  const { id } = ids;
  return (
    <defs>
      <Grad3 id={id('skin')} c={look.skin} />
      <Grad3 id={id('hair')} c={look.hair} x2={0.3} />
      <Grad3 id={id('cloth')} c={look.cloth} />
      <Grad3 id={id('cloth2')} c={look.cloth2} />
      <Grad3 id={id('cape')} c={look.cape} x2={1} />
      <Grad3 id={id('metal')} c={look.metal} x2={1} />
      <Grad3 id={id('trim')} c={look.trim} />
      <Grad3 id={id('leather')} c={['#a8673a', '#6e3d1d', '#3a1d0b']} />
      <Grad3 id={id('blade')} c={['#ffffff', '#cfe9ff', '#5f7fa6']} x2={1} y2={0} />
      <radialGradient id={id('iris')} cx="50%" cy="68%" r="62%">
        <stop offset="0" stopColor="#ffffff" stopOpacity=".9" />
        <stop offset=".25" stopColor={look.eyes} />
        <stop offset="1" stopColor="#120c2a" />
      </radialGradient>
      <radialGradient id={id('gemFill')} cx="40%" cy="35%" r="70%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".4" stopColor={look.gem} />
        <stop offset="1" stopColor="#10162e" />
      </radialGradient>
      <GlowDef id={id('glow')} color={look.gem} />
    </defs>
  );
}

const FACE = 'M66 104 Q66 48 120 44 Q174 48 174 104 Q172 146 142 162 Q120 172 98 162 Q68 146 66 104Z';

function BackHair({ look, ids }: { look: HeroLook; ids: Ids }) {
  const f = ids.url('hair');
  const p = { fill: f, ...STROKE };
  switch (look.hairStyle) {
    case 'long':
      return <path {...p} d="M64 88 Q44 150 54 220 Q70 234 92 220 L98 150 L142 150 L148 220 Q170 234 186 220 Q196 150 176 88 Z" />;
    case 'ponytail':
      return (
        <>
          <path {...p} d="M64 100 Q60 140 78 160 L162 160 Q180 140 176 100 Z" />
          <path {...p} d="M156 66 Q214 82 206 152 Q200 196 176 226 Q186 180 174 140 Q168 108 150 84 Z" />
          <path d="M172 92 Q196 120 190 170" stroke={look.hair[0]} strokeWidth="4" fill="none" opacity=".7" strokeLinecap="round" />
        </>
      );
    case 'bob':
      return <path {...p} d="M60 96 Q50 150 70 172 Q88 178 98 162 L142 162 Q152 178 170 172 Q190 150 180 96 Z" />;
    case 'spiky':
      return (
        <>
          <path {...p} d="M66 98 Q56 128 66 150 L82 122 Z" />
          <path {...p} d="M174 98 Q184 128 174 150 L158 122 Z" />
        </>
      );
    default:
      return <path {...p} d="M64 100 Q60 140 78 160 L162 160 Q180 140 176 100 Z" />;
  }
}

function Bangs({ look, ids }: { look: HeroLook; ids: Ids }) {
  const p = { fill: ids.url('hair'), ...STROKE };
  const hl = look.hair[0];
  let d: string;
  switch (look.hairStyle) {
    case 'spiky':
      d = 'M58 108 Q50 44 104 30 Q96 18 128 16 Q124 6 150 18 Q190 24 182 108 L172 86 L166 112 L152 82 L142 106 L130 78 L120 104 L108 80 L98 108 L86 84 L76 110 L68 90 Z';
      break;
    case 'messy':
      d = 'M60 108 Q52 50 100 34 Q120 20 150 30 Q188 44 180 108 L170 92 L168 114 L156 88 L148 108 L136 84 L124 106 L114 86 L102 110 L92 86 L80 108 L72 94 Z';
      break;
    case 'bob':
      d = 'M60 112 Q54 40 120 34 Q186 40 180 112 L172 108 L168 96 L160 106 L150 92 L140 104 L128 90 L116 104 L104 90 L94 104 L82 94 L76 108 L68 98 Z';
      break;
    default:
      // 柔らかい前髪（long / ponytail / short）
      d = 'M60 112 Q52 40 120 32 Q188 40 180 112 Q172 92 160 100 Q150 76 132 98 Q122 72 104 98 Q90 78 80 104 Q72 94 66 112 Z';
  }
  const sideLocks = look.hairStyle === 'long' || look.hairStyle === 'bob' || look.hairStyle === 'ponytail';
  return (
    <g className="hero-bangs">
      {sideLocks && (
        <>
          <path {...p} d="M70 94 Q56 132 64 176 Q76 160 82 112 Z" />
          <path {...p} d="M170 94 Q184 132 176 176 Q164 160 158 112 Z" />
        </>
      )}
      <path {...p} d={d} />
      <path d="M82 60 Q104 42 134 42" stroke={hl} strokeWidth="6" fill="none" strokeLinecap="round" opacity=".85" />
      <path d="M146 50 Q164 60 170 76" stroke={hl} strokeWidth="4" fill="none" strokeLinecap="round" opacity=".6" />
    </g>
  );
}

function Eyes({ look, ids }: { look: HeroLook; ids: Ids }) {
  const female = look.gender === 'female';
  const ry = female ? 15 : 13;
  const one = (
    <g>
      <path d={female ? 'M84 108 Q96 98 114 105 L113 133 Q99 137 87 128 Z' : 'M85 110 Q96 101 114 106 L113 132 Q99 136 88 128 Z'} fill="#fff" />
      <ellipse cx="100" cy="119" rx="10.5" ry={ry} fill={ids.url('iris')} />
      <ellipse cx="100" cy="122" rx="4.5" ry="7" fill="#0b0820" />
      <circle cx="95.5" cy="112" r="4" fill="#fff" />
      <circle cx="104.5" cy="127" r="2" fill="#fff" />
      <path d={female ? 'M81 108 Q97 94 118 105' : 'M82 111 Q97 98 118 107'} stroke={INK} strokeWidth={female ? 5.5 : 6.5} fill="none" strokeLinecap="round" />
      {female && (
        <>
          <path d="M83 108 L75 101 M86 104 L80 96" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M89 131 Q99 135 110 131" stroke={INK} strokeWidth="1.6" fill="none" opacity=".6" />
        </>
      )}
      {female ? (
        <path d="M86 90 Q98 84 112 90" stroke={look.hair[2]} strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M84 91 L113 98" stroke={look.hair[2]} strokeWidth="5" fill="none" strokeLinecap="round" />
      )}
    </g>
  );
  return (
    <g className="hero-eyes">
      {one}
      <g transform="matrix(-1 0 0 1 240 0)">{one}</g>
    </g>
  );
}

function Face({ look, ids }: { look: HeroLook; ids: Ids }) {
  const female = look.gender === 'female';
  return (
    <g>
      <path d={FACE} fill={ids.url('skin')} {...STROKE} />
      <path d="M150 80 Q176 112 160 148 Q150 158 142 162 Q158 132 150 80Z" fill={look.skin[2]} opacity=".35" />
      <Eyes look={look} ids={ids} />
      <ellipse cx="86" cy="140" rx="10" ry="5.5" fill="#ff7d92" opacity=".35" />
      <ellipse cx="154" cy="140" rx="10" ry="5.5" fill="#ff7d92" opacity=".35" />
      <path d="M121 133 L119 137" stroke={look.skin[2]} strokeWidth="2" strokeLinecap="round" />
      {female ? (
        <path d="M111 148 Q120 155 129 148" stroke="#8a2f3a" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M109 149 Q120 155 132 146 M129 147 L134 143" stroke="#6a2a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}
      <path d="M168 98 Q174 128 158 152" stroke={look.rim} strokeWidth="3" fill="none" opacity=".75" strokeLinecap="round" />
    </g>
  );
}

function HeadgearBack({ look, ids }: { look: HeroLook; ids: Ids }) {
  if (look.headgear !== 'hood') return null;
  return (
    <path
      d="M48 122 Q42 28 120 20 Q198 28 192 122 Q190 172 162 194 L78 194 Q50 172 48 122Z"
      fill={ids.url('cape')}
      {...STROKE}
    />
  );
}

function Headgear({ look, ids }: { look: HeroLook; ids: Ids }) {
  const { url } = ids;
  switch (look.headgear) {
    case 'circlet':
      return (
        <g>
          <path d="M66 94 Q120 70 174 94" stroke={url('trim')} strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M66 94 Q120 70 174 94" stroke={INK} strokeWidth="1.4" fill="none" />
          <circle cx="120" cy="78" r="16" fill={url('glow')} />
          <path d="M120 68 L129 79 L120 90 L111 79 Z" fill={url('gemFill')} {...THIN} />
        </g>
      );
    case 'wizardHat':
      return (
        <g className="hero-hat">
          <path d="M76 70 Q94 22 116 -2 Q146 -26 186 -20 Q156 -6 150 22 Q160 48 166 68 Z" fill={url('cloth')} {...STROKE} />
          <path d="M150 22 Q156 0 182 -18" stroke={look.cloth[0]} strokeWidth="3" fill="none" opacity=".6" />
          <path d="M30 80 Q120 44 210 80 Q194 96 120 88 Q46 96 30 80 Z" fill={url('cloth')} {...STROKE} />
          <path d="M44 82 Q120 58 196 82" stroke={look.cloth[0]} strokeWidth="2.5" fill="none" opacity=".5" />
          <path d="M76 64 Q120 50 166 62 L168 74 Q120 62 74 76 Z" fill={url('trim')} {...THIN} />
          <circle cx="120" cy="62" r="18" fill={url('glow')} />
          <path d="M120 52 L124 60 L133 61 L126 67 L128 76 L120 71 L112 76 L114 67 L107 61 L116 60 Z" fill={url('gemFill')} {...THIN} />
          {look.gender === 'female' && (
            <g>
              <path d="M158 66 Q176 48 184 62 Q176 72 160 70 Z" fill={look.gem} {...THIN} />
              <path d="M158 70 Q170 88 160 96 Q152 86 154 72 Z" fill={look.gem} {...THIN} />
              <circle cx="158" cy="68" r="5" fill={url('trim')} {...THIN} />
            </g>
          )}
        </g>
      );
    case 'helmet':
      return (
        <g>
          <path d="M120 30 Q150 -4 204 2 Q176 12 166 38 Q146 26 120 36 Z" fill={url('cape')} {...STROKE} />
          <path d="M132 22 Q160 4 192 4" stroke={look.cape[0]} strokeWidth="3" fill="none" opacity=".7" />
          <path d="M60 104 Q56 30 120 24 Q184 30 180 104 L168 102 Q166 58 120 52 Q74 58 72 102 Z" fill={url('metal')} {...STROKE} />
          <path d="M120 24 L120 54" stroke={look.metal[2]} strokeWidth="5" />
          <path d="M60 104 L72 102 L80 138 Q64 132 60 104Z" fill={url('metal')} {...STROKE} />
          <path d="M180 104 L168 102 L160 138 Q176 132 180 104Z" fill={url('metal')} {...STROKE} />
          <path d="M72 50 Q92 34 116 30" stroke="#fff" strokeWidth="4" fill="none" opacity=".75" strokeLinecap="round" />
          <circle cx="120" cy="40" r="5" fill={url('gemFill')} {...THIN} />
        </g>
      );
    case 'hood':
      return (
        <path
          d="M58 112 Q56 36 120 30 Q184 36 182 112 Q176 66 120 58 Q64 66 58 112Z"
          fill={url('cape')}
          {...STROKE}
        />
      );
    case 'featherBand':
      return (
        <g>
          <path d="M66 92 Q120 74 174 92" stroke={url('cloth2')} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M166 88 Q192 40 214 26 Q206 58 178 94 Z" fill="#f4f1e6" {...THIN} />
          <path d="M200 40 Q206 34 214 26 Q210 40 204 48 Z" fill={look.gem} />
          <path d="M170 90 Q190 58 208 36" stroke="#9a8f78" strokeWidth="1.6" fill="none" />
        </g>
      );
    default:
      return null;
  }
}

// ---------- 胴体・服 ----------

function Legs({ look, ids }: { look: HeroLook; ids: Ids }) {
  if (look.outfit === 'robe') {
    return (
      <>
        <path d="M92 278 Q94 270 106 270 Q118 270 118 278 L118 290 Q104 293 90 290 Z" fill={ids.url('leather')} {...STROKE} />
        <path d="M122 278 Q122 270 134 270 Q146 270 148 278 L150 290 Q136 293 122 290 Z" fill={ids.url('leather')} {...STROKE} />
      </>
    );
  }
  const bootFill = look.outfit === 'leather' ? ids.url('leather') : ids.url('metal');
  return (
    <>
      <path d="M102 238 L98 274 L116 276 L118 240 Z" fill={ids.url('cloth2')} {...STROKE} />
      <path d="M122 240 L124 276 L142 274 L138 238 Z" fill={ids.url('cloth2')} {...STROKE} />
      <path d="M88 272 Q90 260 104 260 Q118 260 118 272 L119 290 Q102 294 86 290 Z" fill={bootFill} {...STROKE} />
      <path d="M122 272 Q122 260 136 260 Q150 260 152 272 L154 290 Q138 294 121 290 Z" fill={bootFill} {...STROKE} />
      {look.outfit !== 'leather' && <path d="M88 276 L118 276 M122 276 L152 276" stroke={ids.url('trim')} strokeWidth="4" />}
    </>
  );
}

function Torso({ look, ids }: { look: HeroLook; ids: Ids }) {
  const { url } = ids;
  const female = look.gender === 'female';
  switch (look.outfit) {
    case 'plate':
      return (
        <g>
          {female ? (
            <path d="M90 234 Q120 246 150 234 L160 268 Q120 280 80 268 Z" fill={url('cloth')} {...STROKE} />
          ) : (
            <>
              <path d="M96 236 L91 264 L114 260 L118 242 Z" fill={url('cloth')} {...STROKE} />
              <path d="M144 236 L149 264 L126 260 L122 242 Z" fill={url('cloth')} {...STROKE} />
            </>
          )}
          {female && <path d="M84 264 Q120 274 156 264" stroke={url('trim')} strokeWidth="4" fill="none" />}
          <path d="M90 178 Q120 166 150 178 L148 222 Q146 244 120 248 Q94 244 92 222 Z" fill={url('metal')} {...STROKE} />
          <path d="M120 176 Q140 178 147 196 L146 222 Q143 242 120 246 Z" fill={look.metal[2]} opacity=".35" />
          <path d="M98 186 Q120 176 142 186" stroke="#fff" strokeWidth="3" fill="none" opacity=".8" />
          <path d="M120 194 L130 204 L120 220 L110 204 Z" fill={url('trim')} {...THIN} />
          <path d="M120 200 L124 205 L120 213 L116 205 Z" fill={look.gem} />
          <path d="M93 226 Q120 236 147 226 L147 236 Q120 246 93 236 Z" fill={url('leather')} {...THIN} />
          <rect x="113" y="228" width="14" height="12" rx="2.5" fill={url('trim')} {...THIN} />
        </g>
      );
    case 'robe':
      return (
        <g>
          <path d="M90 176 Q120 164 150 176 L172 282 Q120 296 68 282 Z" fill={url('cloth')} {...STROKE} />
          <path d="M120 180 Q140 200 150 284 Q130 290 120 290 Z" fill={look.cloth[2]} opacity=".35" />
          <path d="M120 186 L120 290" stroke={url('trim')} strokeWidth="6" />
          <path d="M120 186 L120 290" stroke={INK} strokeWidth="1.2" />
          <path d="M70 280 Q120 294 170 280" stroke={url('trim')} strokeWidth="5" fill="none" />
          {[86, 104, 136, 154].map((x) => (
            <circle key={x} cx={x} cy={270 + Math.abs(x - 120) * 0.08} r="2.4" fill={look.trim[0]} />
          ))}
          <path d="M98 174 Q120 192 142 174 L138 162 Q120 176 102 162 Z" fill={url('cloth2')} {...STROKE} />
          <path d="M96 214 Q120 222 144 214 L145 224 Q120 232 95 224 Z" fill={url('cloth2')} {...THIN} />
          <circle cx="120" cy="220" r="12" fill={url('glow')} />
          <circle cx="120" cy="220" r="5.5" fill={url('gemFill')} {...THIN} />
        </g>
      );
    case 'heavy':
      return (
        <g>
          <path d="M88 236 L82 266 L158 266 L152 236 Z" fill={look.metal[2]} {...STROKE} />
          <path d="M90 246 L150 246 M88 256 L152 256" stroke={look.metal[1]} strokeWidth="2" strokeDasharray="4 3" />
          <path d="M82 176 Q120 158 158 176 L156 230 Q150 254 120 256 Q90 254 84 230 Z" fill={url('metal')} {...STROKE} />
          <path d="M104 184 L136 184 L134 262 L106 262 Z" fill={url('cloth')} {...STROKE} />
          <path d="M120 196 L128 210 L120 230 L112 210 Z" fill={url('trim')} {...THIN} />
          <path d="M104 184 L136 184" stroke={url('trim')} strokeWidth="4" />
          <path d="M92 182 Q104 172 118 170" stroke="#fff" strokeWidth="3" fill="none" opacity=".7" />
        </g>
      );
    case 'leather':
      return (
        <g>
          {female ? (
            <path d="M92 230 Q120 240 148 230 L154 256 Q120 266 86 256 Z" fill={url('cloth')} {...STROKE} />
          ) : null}
          <path d="M92 178 Q120 166 148 178 L150 238 Q120 248 90 238 Z" fill={url('cloth')} {...STROKE} />
          <path d="M120 180 Q138 186 146 200 L148 236 Q130 244 120 244 Z" fill={look.cloth[2]} opacity=".35" />
          <path d="M96 182 L112 182 L116 234 L94 232 Z" fill={url('leather')} {...STROKE} />
          <path d="M144 182 L128 182 L124 234 L146 232 Z" fill={url('leather')} {...STROKE} />
          <path d="M92 226 Q120 234 148 226 L148 236 Q120 244 92 236 Z" fill={url('cloth2')} {...THIN} />
          <rect x="132" y="232" width="14" height="14" rx="3" fill={url('leather')} {...THIN} />
          <path d="M96 168 Q120 184 144 168 L148 180 Q120 196 92 180 Z" fill={url('cape')} {...STROKE} />
        </g>
      );
  }
}

function Shoulders({ look, ids }: { look: HeroLook; ids: Ids }) {
  const { url } = ids;
  if (look.outfit === 'plate') {
    const one = (
      <g>
        <path d="M72 192 Q74 164 100 164 Q116 168 116 184 Q104 200 84 202 Q72 200 72 192 Z" fill={url('metal')} {...STROKE} />
        <path d="M78 190 Q82 174 100 172" stroke="#fff" strokeWidth="3" fill="none" />
        <path d="M74 196 Q96 202 114 188" stroke={url('trim')} strokeWidth="4.5" fill="none" />
      </g>
    );
    return (
      <>
        {one}
        <g transform="matrix(-1 0 0 1 240 0)">{one}</g>
      </>
    );
  }
  if (look.outfit === 'heavy') {
    const one = (
      <g>
        <path d="M60 194 Q62 156 100 158 Q120 164 120 184 Q104 206 76 208 Q60 206 60 194 Z" fill={url('metal')} {...STROKE} />
        <path d="M66 190 Q70 168 98 166" stroke="#fff" strokeWidth="3.5" fill="none" opacity=".8" />
        <path d="M62 198 Q92 206 118 188" stroke={url('trim')} strokeWidth="5" fill="none" />
        <circle cx="82" cy="186" r="3" fill={look.metal[0]} {...THIN} />
        <circle cx="100" cy="178" r="3" fill={look.metal[0]} {...THIN} />
      </g>
    );
    return (
      <>
        {one}
        <g transform="matrix(-1 0 0 1 240 0)">{one}</g>
      </>
    );
  }
  return null;
}

/** 腕の色（服の種類による） */
function sleeve(look: HeroLook, ids: Ids) {
  if (look.outfit === 'heavy') return ids.url('metal');
  if (look.outfit === 'robe') return ids.url('cloth');
  if (look.outfit === 'plate') return ids.url('cloth2');
  return ids.url('cloth');
}

function Hand({ x, y, look, ids }: { x: number; y: number; look: HeroLook; ids: Ids }) {
  const gloved = look.outfit === 'plate' || look.outfit === 'heavy';
  return <circle cx={x} cy={y} r="9.5" fill={gloved ? ids.url('metal') : ids.url('skin')} {...STROKE} />;
}

// ---------- 武器 ----------

function WeaponBack({ look, ids }: { look: HeroLook; ids: Ids }) {
  const { url } = ids;
  switch (look.weapon) {
    case 'greatsword':
      return (
        <g className="hero-weapon">
          <ellipse cx="190" cy="92" rx="30" ry="98" transform="rotate(21 190 92)" fill={url('glow')} opacity=".55" />
          <path d="M150 180 L206 26 L224 12 L222 34 L166 188 Z" fill={url('blade')} {...STROKE} />
          <path d="M158 182 L214 28" stroke="#ffffff" strokeWidth="2.5" />
          <path d="M178 132 L188 106 M192 96 L200 74" stroke={look.gem} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'bow':
      return (
        <g>
          <path d="M150 150 L172 140 L196 232 L176 242 Z" fill={url('leather')} {...STROKE} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path d={`M${156 + i * 6} ${148 - i * 3} L${150 + i * 6} ${120 - i * 3}`} stroke="#ccb48a" strokeWidth="2.5" />
              <path
                d={`M${150 + i * 6} ${120 - i * 3} l-5 -10 l8 2 z`}
                fill={i === 1 ? look.gem : '#f2ece0'}
                {...THIN}
              />
            </g>
          ))}
        </g>
      );
    default:
      return null;
  }
}

function WeaponFront({ look, ids }: { look: HeroLook; ids: Ids }) {
  const { url } = ids;
  switch (look.weapon) {
    case 'greatsword':
      return (
        <g>
          <path d="M134 178 L178 194 L174 205 L130 189 Z" fill={url('trim')} {...STROKE} />
          <circle cx="155" cy="191" r="6" fill={url('gemFill')} {...THIN} />
          <path d="M150 198 L142 222" stroke="#5b3416" strokeWidth="10" strokeLinecap="round" />
          <circle cx="141" cy="227" r="6.5" fill={url('trim')} {...THIN} />
        </g>
      );
    case 'staff':
      return (
        <g className="hero-weapon">
          <path d="M166 292 L180 22" stroke={INK} strokeWidth="11" strokeLinecap="round" />
          <path d="M166 292 L180 22" stroke="#7a4a24" strokeWidth="6" strokeLinecap="round" />
          <circle cx="182" cy="4" r="44" fill={url('glow')} />
          <path d="M162 18 Q160 -14 186 -22 Q172 -8 176 14 Z" fill={url('trim')} {...THIN} />
          <path d="M202 18 Q206 -14 182 -24 Q194 -8 190 14 Z" fill={url('trim')} {...THIN} />
          <circle cx="182" cy="2" r="12" fill={url('gemFill')} {...STROKE} />
          <circle cx="178" cy="-2" r="3.5" fill="#fff" />
          <path d="M150 -12 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 l6 -1 z" fill="#fff" opacity=".8" />
          <circle cx="212" cy="30" r="2.5" fill="#fff" opacity=".8" />
        </g>
      );
    case 'hammer':
      return (
        <g className="hero-weapon">
          <path d="M184 112 L160 286" stroke={INK} strokeWidth="12" strokeLinecap="round" />
          <path d="M184 112 L160 286" stroke="#6b4423" strokeWidth="7" strokeLinecap="round" />
          <path d="M158 92 L208 100 L202 140 L152 132 Z" fill={url('metal')} {...STROKE} />
          <path d="M162 98 L204 104" stroke="#fff" strokeWidth="3" opacity=".7" />
          <path d="M176 104 L188 106 L184 128 L172 126 Z" fill={url('trim')} {...THIN} />
        </g>
      );
    case 'bow':
      return (
        <g className="hero-weapon">
          <path d="M84 118 L84 290" stroke="#efe7d6" strokeWidth="1.6" />
          <path d="M84 118 Q38 204 84 290" stroke={INK} strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M84 118 Q38 204 84 290" stroke="#8a5428" strokeWidth="5.5" fill="none" strokeLinecap="round" />
          <path d="M70 160 Q62 180 62 200" stroke={look.gem} strokeWidth="2.5" fill="none" opacity=".9" />
        </g>
      );
  }
}

function Shield({ look, ids }: { look: HeroLook; ids: Ids }) {
  if (look.weapon !== 'hammer') return null;
  const { url } = ids;
  return (
    <g className="hero-shield">
      <path d="M36 170 Q64 152 96 164 L98 262 Q68 290 38 262 Z" fill={url('cloth')} stroke={look.metal[1]} strokeWidth="7" strokeLinejoin="round" />
      <path d="M36 170 Q64 152 96 164 L98 262 Q68 290 38 262 Z" fill="none" {...STROKE} />
      <path d="M44 176 Q64 164 88 172" stroke="#fff" strokeWidth="3" fill="none" opacity=".5" />
      <circle cx="67" cy="216" r="26" fill={url('glow')} opacity=".6" />
      <path
        d="M67 194 L72 210 L88 212 L75 222 L80 238 L67 228 L54 238 L59 222 L46 212 L62 210 Z"
        fill={url('trim')}
        {...THIN}
      />
    </g>
  );
}

function Cape({ look, ids }: { look: HeroLook; ids: Ids }) {
  if (look.outfit !== 'plate' && look.outfit !== 'heavy') return null;
  return (
    <g className="hero-cape">
      <path d="M88 182 C70 220 56 252 40 288 C66 282 84 294 104 286 C122 296 142 286 154 292 L154 182 Z" fill={ids.url('cape')} {...STROKE} />
      <path d="M88 200 C76 232 64 256 54 278" stroke={look.cape[0]} strokeWidth="3" fill="none" opacity=".55" />
    </g>
  );
}

function Arms({ look, ids }: { look: HeroLook; ids: Ids }) {
  const s = sleeve(look, ids);
  const w = look.outfit === 'robe' ? 22 : look.outfit === 'heavy' ? 20 : 16;
  let right: { d: string; hx: number; hy: number };
  switch (look.weapon) {
    case 'greatsword':
      right = { d: 'M146 190 Q172 204 160 192', hx: 158, hy: 190 };
      break;
    case 'staff':
      right = { d: 'M148 190 Q166 206 172 222', hx: 172, hy: 224 };
      break;
    case 'hammer':
      right = { d: 'M150 190 Q170 206 168 228', hx: 168, hy: 232 };
      break;
    default:
      right = { d: 'M148 190 Q160 212 156 234', hx: 156, hy: 238 };
  }
  const left =
    look.weapon === 'bow'
      ? { d: 'M92 190 Q78 200 80 222', hx: 82, hy: 222 }
      : look.weapon === 'hammer'
        ? { d: 'M92 190 Q74 204 70 220', hx: 70, hy: 220 }
        : { d: 'M92 190 Q80 214 84 236', hx: 84, hy: 240 };
  return { left: { ...left, s, w }, right: { ...right, s, w } };
}

// ---------- 本体 ----------

function HeroBody({ look }: { look: HeroLook }) {
  const ids = useArtIds();
  const arms = Arms({ look, ids });
  return (
    <>
      <Defs look={look} ids={ids} />
      <ellipse cx="120" cy="290" rx="72" ry="10" fill="#000" opacity=".45" />
      <g className="hero-root">
        <Cape look={look} ids={ids} />
        <WeaponBack look={look} ids={ids} />
        <g className="hero-head">
          <HeadgearBack look={look} ids={ids} />
          <BackHair look={look} ids={ids} />
        </g>
        <g className="hero-body">
          <Legs look={look} ids={ids} />
          <Torso look={look} ids={ids} />
          <Limb d={arms.left.d} fill={arms.left.s} width={arms.left.w} />
          <Hand x={arms.left.hx} y={arms.left.hy} look={look} ids={ids} />
          <Shoulders look={look} ids={ids} />
          {look.weapon === 'greatsword' && <WeaponFront look={look} ids={ids} />}
          <Limb d={arms.right.d} fill={arms.right.s} width={arms.right.w} />
          {look.weapon !== 'greatsword' && <WeaponFront look={look} ids={ids} />}
          <Hand x={arms.right.hx} y={arms.right.hy} look={look} ids={ids} />
          <Shield look={look} ids={ids} />
          <path d="M150 196 L148 236" stroke={look.rim} strokeWidth="3" opacity=".55" strokeLinecap="round" />
        </g>
        <g className="hero-head">
          <path d="M110 156 L130 156 L129 176 L111 176 Z" fill={look.skin[2]} {...THIN} />
          <Face look={look} ids={ids} />
          <Bangs look={look} ids={ids} />
          <Headgear look={look} ids={ids} />
        </g>
      </g>
    </>
  );
}

/** 味方キャラの絵。memo 化して、同じ見た目の再描画を避ける */
export const Hero = memo(function Hero({ look, className }: { look: HeroLook; className?: string }) {
  return (
    <svg viewBox={HERO_VIEWBOX} className={className} aria-hidden>
      <HeroBody look={look} />
    </svg>
  );
});
