// 翠の森の敵: 森の狼・毒キノコ・樹木の番人・樹魔トレントキング（2形態）
import { memo } from 'react';
import { GlowDef, Grad3, INK, Limb, STROKE, THIN, useArtIds } from '../kit';
import { ENEMY_VIEWBOX } from './common';
import { Aura, EnemyEye } from './parts';

const Svg = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox={ENEMY_VIEWBOX} className={className} aria-hidden>
    {children}
  </svg>
);

// ---------- 森の狼 ----------
export const ForestWolf = memo(function ForestWolf({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  const fur = url('fur');
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('fur')} c={['#6a7088', '#383c50', '#14151e']} x2={0.4} />
        <Grad3 id={id('chest')} c={['#c8ccd8', '#8a8ea0', '#4a4c5a']} />
        <GlowDef id={id('eye')} color="#d4ff3a" />
        <GlowDef id={id('aura')} color="#4a2c8a" opacity={0.5} />
      </defs>
      <Aura url={url('aura')} cy={190} />
      <ellipse cx="130" cy="288" rx="100" ry="11" fill="#000" opacity=".6" />
      <g className="enemy-body">
        {/* 胴（後ろ） */}
        <path d="M52 206 Q60 146 128 134 Q204 136 226 196 Q236 246 204 268 L66 268 Q42 246 52 206 Z" fill={fur} {...STROKE} />
        <path
          d="M64 172 L74 150 L84 166 L96 140 L106 158 L120 132 L130 152 L142 130 L152 150 L166 134 L174 154 L190 144 L196 166 L212 162"
          stroke={INK}
          strokeWidth="3"
          fill="none"
          strokeLinejoin="round"
        />
        {/* 前脚 */}
        <path d="M86 214 L76 280 L104 284 L112 222 Z" fill={fur} {...STROKE} />
        <path d="M174 214 L184 280 L156 284 L148 222 Z" fill={fur} {...STROKE} />
        <path d="M76 280 l-4 8 M86 284 l-2 8 M96 284 l0 8 M184 280 l4 8 M174 284 l2 8 M164 284 l0 8" stroke="#eee6d8" strokeWidth="3.4" strokeLinecap="round" />
        {/* 胸の毛 */}
        <path d="M98 196 Q130 252 162 196 Q154 240 130 252 Q106 240 98 196 Z" fill={url('chest')} {...THIN} />
        <path d="M112 214 L118 232 M130 220 L130 240 M148 214 L142 232" stroke="#5a5e70" strokeWidth="2" />
      </g>
      <g className="enemy-head">
        {/* 耳 */}
        <path d="M92 114 L76 52 L122 100 Z" fill={fur} {...STROKE} />
        <path d="M168 114 L184 52 L138 100 Z" fill={fur} {...STROKE} />
        <path d="M94 104 L84 68 L112 98 Z M166 104 L176 68 L148 98 Z" fill="#5a1a26" />
        {/* 頭 */}
        <path d="M80 140 Q84 92 130 88 Q176 92 180 140 Q178 172 154 190 L130 206 L106 190 Q82 172 80 140 Z" fill={fur} {...STROKE} />
        <path d="M86 150 L72 160 L90 162 M174 150 L188 160 L170 162" stroke={INK} strokeWidth="3" fill="none" strokeLinejoin="round" />
        {/* 鼻づら */}
        <path d="M106 158 Q130 148 154 158 L150 194 Q130 208 110 194 Z" fill={url('chest')} {...THIN} />
        <ellipse cx="130" cy="164" rx="10" ry="7" fill="#0a0a10" />
        <ellipse cx="127" cy="162" rx="3" ry="2" fill="#fff" opacity=".6" />
        {/* 牙をむいた口 */}
        <path d="M110 182 Q130 198 150 182 Q146 208 130 212 Q114 208 110 182 Z" fill="#3a0608" {...THIN} />
        <path d="M114 186 L118 200 L122 188 Z M138 188 L142 200 L146 186 Z M124 208 L128 196 L132 208 Z" fill="#fff6e0" {...THIN} />
        {/* 目（発光） */}
        <EnemyEye cx={112} cy={134} glow={url('eye')} d="M98 126 L124 136 L100 142 Z" color="#eaff7a" />
        <EnemyEye cx={148} cy={134} glow={url('eye')} d="M162 126 L136 136 L160 142 Z" color="#eaff7a" />
        <path d="M94 120 L126 132 M166 120 L134 132" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        {/* 傷・リムライト */}
        <path d="M156 102 L146 128" stroke="#2a0a10" strokeWidth="3" />
        <path d="M176 136 Q174 168 150 188" stroke="#b07aff" strokeWidth="2.6" fill="none" opacity=".7" />
      </g>
    </Svg>
  );
});

// ---------- 毒キノコ ----------
export const ToxicShroom = memo(function ToxicShroom({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('cap')} c={['#e86ad8', '#8a1e8a', '#3a0a3a']} x2={0.3} />
        <Grad3 id={id('stem')} c={['#f2e6c8', '#bfa880', '#6a5638']} x2={1} />
        <GlowDef id={id('spot')} color="#9aff4a" opacity={0.9} />
        <GlowDef id={id('aura')} color="#5aff3a" opacity={0.35} />
        <GlowDef id={id('eye')} color="#b6ff3a" />
      </defs>
      <Aura url={url('aura')} cy={200} />
      <ellipse cx="130" cy="288" rx="82" ry="11" fill="#000" opacity=".6" />
      {/* 胞子 */}
      <g fill="#b6ff6a" opacity=".85">
        {[
          [44, 120, 4],
          [214, 96, 3],
          [36, 206, 3],
          [226, 186, 4],
          [70, 70, 2.5],
          [200, 56, 3],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} />
        ))}
      </g>
      <g className="enemy-body">
        {/* 柄（胴体） */}
        <path d="M88 156 Q78 226 94 282 L166 282 Q182 226 172 156 Z" fill={url('stem')} {...STROKE} />
        <path d="M150 166 Q164 220 156 278" stroke="#8a7450" strokeWidth="6" fill="none" opacity=".45" />
        {/* 短い腕 */}
        <Limb d="M92 206 Q66 214 60 236" fill={url('stem')} width={14} />
        <Limb d="M168 206 Q194 214 200 236" fill={url('stem')} width={14} />
        <circle cx="58" cy="240" r="10" fill={url('stem')} {...STROKE} />
        <circle cx="202" cy="240" r="10" fill={url('stem')} {...STROKE} />
        {/* 顔 */}
        <EnemyEye cx={112} cy={196} glow={url('eye')} d="M98 190 L124 198 L100 204 Z" color="#e2ff7a" />
        <EnemyEye cx={148} cy={196} glow={url('eye')} d="M162 190 L136 198 L160 204 Z" color="#e2ff7a" />
        <path d="M96 182 L126 194 M164 182 L134 194" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M104 220 Q130 244 156 220 Q150 242 130 246 Q110 242 104 220 Z" fill="#1e0a1e" {...THIN} />
        <path d="M108 222 L112 230 L116 224 L120 232 L124 225 L128 233 L132 225 L136 233 L140 225 L144 232 L148 224 L152 230" stroke="#f2ead0" strokeWidth="2" fill="none" />
        <path d="M118 244 Q116 258 120 264 Q124 258 122 246 Z" fill="#9aff4a" opacity=".9" />
      </g>
      {/* 傘 */}
      <g className="enemy-head">
        <ellipse cx="130" cy="156" rx="84" ry="14" fill="#2a0a2a" {...STROKE} />
        <path d="M92 156 L96 166 M112 156 L112 168 M130 156 L130 170 M148 156 L148 168 M168 156 L164 166" stroke="#6a3a5a" strokeWidth="2" />
        <path d="M36 150 Q44 46 130 38 Q216 46 224 150 Q200 166 130 162 Q60 166 36 150 Z" fill={url('cap')} {...STROKE} />
        <path d="M66 96 Q96 56 140 52" stroke="#ffb0f0" strokeWidth="6" fill="none" strokeLinecap="round" opacity=".7" />
        {[
          [84, 104, 14],
          [126, 78, 11],
          [170, 98, 15],
          [104, 136, 9],
          [196, 132, 8],
          [62, 136, 7],
          [150, 128, 7],
        ].map(([x, y, r], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={r * 1.8} fill={url('spot')} />
            <circle cx={x} cy={y} r={r} fill="#b6ff6a" {...THIN} />
          </g>
        ))}
        <path d="M212 120 Q214 140 196 154" stroke="#ff9aff" strokeWidth="2.6" fill="none" opacity=".7" />
      </g>
    </Svg>
  );
});

// ---------- 樹木の番人 ----------
export const TreeWarden = memo(function TreeWarden({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  const bark = url('bark');
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('bark')} c={['#9a7448', '#5a3c1e', '#24160a']} x2={0.6} />
        <Grad3 id={id('moss')} c={['#8ad06a', '#3a7a2a', '#123a10']} />
        <Grad3 id={id('leaf')} c={['#4a8a3a', '#1e4a1a', '#0a1e08']} />
        <GlowDef id={id('core')} color="#5aff8a" opacity={0.95} />
        <GlowDef id={id('aura')} color="#2a8a4a" opacity={0.45} />
      </defs>
      <Aura url={url('aura')} cy={170} />
      <ellipse cx="130" cy="290" rx="110" ry="12" fill="#000" opacity=".6" />
      {/* 背中の葉 */}
      <path d="M40 120 Q20 60 76 40 Q100 0 150 14 Q210 4 230 60 Q258 100 226 140 Q180 120 130 122 Q80 120 40 120 Z" fill={url('leaf')} {...STROKE} />
      <g className="enemy-body">
        {/* 根の脚 */}
        <path d="M84 230 Q70 262 46 286 L90 286 Q100 262 112 240 Z" fill={bark} {...STROKE} />
        <path d="M176 230 Q190 262 214 286 L170 286 Q160 262 148 240 Z" fill={bark} {...STROKE} />
        <path d="M60 286 Q50 278 36 284 M200 286 Q210 278 224 284" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
        {/* 幹の胴 */}
        <path d="M74 120 Q130 92 186 120 L180 236 Q130 258 80 236 Z" fill={bark} {...STROKE} />
        <path d="M98 130 Q94 180 102 236 M130 116 L130 248 M162 130 Q166 180 158 236" stroke="#2a1a0a" strokeWidth="3" fill="none" opacity=".7" />
        <path d="M82 150 Q104 140 112 162 Q98 176 84 168 Z M150 196 Q170 186 178 206 Q164 218 152 210 Z" fill={url('moss')} {...THIN} />
        {/* 胸の核 */}
        <circle cx="130" cy="180" r="30" fill={url('core')} />
        <path d="M130 162 L144 180 L130 198 L116 180 Z" fill="#c8ffd8" {...THIN} />
        {/* 枝の腕 */}
        <Limb d="M78 134 Q38 150 30 196" fill={bark} width={22} />
        <path d="M30 196 L14 226 M30 196 L28 232 M30 196 L46 226" stroke={INK} strokeWidth="9" strokeLinecap="round" />
        <path d="M30 196 L14 226 M30 196 L28 232 M30 196 L46 226" stroke="#5a3c1e" strokeWidth="5" strokeLinecap="round" />
        <Limb d="M182 134 Q222 124 236 88" fill={bark} width={22} />
        <path d="M236 88 L250 60 M236 88 L232 54 M236 88 L216 66" stroke={INK} strokeWidth="9" strokeLinecap="round" />
        <path d="M236 88 L250 60 M236 88 L232 54 M236 88 L216 66" stroke="#5a3c1e" strokeWidth="5" strokeLinecap="round" />
        <circle cx="246" cy="58" r="10" fill={url('moss')} {...THIN} />
      </g>
      {/* 頭（切り株） */}
      <g className="enemy-head">
        <path d="M96 118 Q92 70 130 62 Q168 70 164 118 Q130 132 96 118 Z" fill={bark} {...STROKE} />
        <path d="M96 84 L82 52 L104 72 M164 84 L180 50 L156 72 M126 64 L120 36 L134 60" stroke={INK} strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M96 84 L82 52 L104 72 M164 84 L180 50 L156 72 M126 64 L120 36 L134 60" stroke="#6a4a26" strokeWidth="3.6" strokeLinecap="round" fill="none" />
        <path d="M94 80 Q130 56 166 80 Q160 66 130 60 Q100 66 94 80 Z" fill={url('moss')} {...THIN} />
        <ellipse cx="114" cy="98" rx="10" ry="8" fill="#0a0604" />
        <ellipse cx="146" cy="98" rx="10" ry="8" fill="#0a0604" />
        <circle cx="114" cy="98" r="14" fill={url('core')} />
        <circle cx="146" cy="98" r="14" fill={url('core')} />
        <circle cx="114" cy="98" r="4" fill="#e2ffe8" />
        <circle cx="146" cy="98" r="4" fill="#e2ffe8" />
        <path d="M112 114 Q130 124 148 114" stroke="#0a0604" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    </Svg>
  );
});

// ---------- 樹魔トレントキング（phase 1 = 怒れる古樹） ----------
export const TreantKing = memo(function TreantKing({ className, phase = 0 }: { className?: string; phase?: number }) {
  const { id, url } = useArtIds();
  const rage = phase >= 1;
  const bark = url('bark');
  return (
    <Svg className={className}>
      <defs>
        <Grad3 id={id('bark')} c={rage ? ['#8a5a4a', '#4a221a', '#1a0806'] : ['#a07a4a', '#5a3a1a', '#1e1208']} x2={0.6} />
        <Grad3 id={id('leaf')} c={rage ? ['#c8402a', '#6a1430', '#2a0618'] : ['#5aa04a', '#24602a', '#0a2410']} />
        <Grad3 id={id('gold')} c={['#fff2b0', '#f2c24a', '#8a5a0a']} />
        <GlowDef id={id('eye')} color={rage ? '#ff3a1a' : '#ffc23a'} />
        <GlowDef id={id('aura')} color={rage ? '#ff2a4a' : '#7a2cff'} opacity={0.55} />
        <GlowDef id={id('crack')} color={rage ? '#ff6a2a' : '#c07aff'} opacity={0.9} />
      </defs>
      <Aura url={url('aura')} cy={150} />
      <ellipse cx="130" cy="290" rx="124" ry="13" fill="#000" opacity=".65" />
      {/* 大きな樹冠 */}
      <path
        d="M10 128 Q-6 60 50 34 Q70 -4 120 4 Q160 -12 200 10 Q252 24 254 80 Q270 120 238 150 Q200 128 130 130 Q60 128 22 152 Q4 146 10 128 Z"
        fill={url('leaf')}
        {...STROKE}
      />
      {rage ? (
        <g fill="#ff8a3a" opacity=".85">
          <path d="M40 60 q6 -14 12 0 q-6 6 -12 0 z M200 40 q6 -14 12 0 q-6 6 -12 0 z M232 100 q6 -14 12 0 q-6 6 -12 0 z M70 30 q6 -14 12 0 q-6 6 -12 0 z" />
        </g>
      ) : (
        <path d="M40 70 Q70 40 110 36 M170 30 Q210 40 230 72" stroke="#8ad06a" strokeWidth="5" fill="none" opacity=".5" strokeLinecap="round" />
      )}
      <g className="enemy-body">
        {/* 根 */}
        <path d="M60 250 Q30 268 6 286 L70 288 Q84 272 96 258 Z M200 250 Q230 268 254 286 L190 288 Q176 272 164 258 Z M110 262 L104 290 L156 290 L150 262 Z" fill={bark} {...STROKE} />
        {/* 幹（顔のある胴） */}
        <path d="M56 120 Q130 86 204 120 L196 262 Q130 284 64 262 Z" fill={bark} {...STROKE} />
        <path d="M80 130 Q74 200 84 262 M110 116 Q104 190 112 270 M150 116 Q156 190 148 270 M180 130 Q186 200 176 262" stroke="#1a0c04" strokeWidth="3" fill="none" opacity=".6" />
        {/* ひび（光る） */}
        <path d="M92 200 L104 214 L96 230 M172 190 L160 206 L170 222" stroke={url('crack')} strokeWidth="9" strokeLinecap="round" fill="none" />
        <path d="M92 200 L104 214 L96 230 M172 190 L160 206 L170 222" stroke={rage ? '#ffd0a0' : '#f0d0ff'} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        {/* 枝の腕 */}
        <Limb d="M62 136 Q20 150 6 204" fill={bark} width={24} />
        <path d="M6 204 L-4 240 M6 204 L16 242 M6 204 L28 230" stroke={INK} strokeWidth="9" strokeLinecap="round" />
        <path d="M6 204 L-4 240 M6 204 L16 242 M6 204 L28 230" stroke="#5a3a1a" strokeWidth="5" strokeLinecap="round" />
        <Limb d="M198 136 Q240 150 254 204" fill={bark} width={24} />
        <path d="M254 204 L264 240 M254 204 L244 242 M254 204 L232 230" stroke={INK} strokeWidth="9" strokeLinecap="round" />
        <path d="M254 204 L264 240 M254 204 L244 242 M254 204 L232 230" stroke="#5a3a1a" strokeWidth="5" strokeLinecap="round" />
        {rage && (
          <path d="M40 160 Q60 176 52 196 M220 160 Q200 176 208 196" stroke="#2a0a0a" strokeWidth="4" fill="none" strokeDasharray="2 6" strokeLinecap="round" />
        )}
      </g>
      {/* 顔と冠 */}
      <g className="enemy-head">
        {/* 枝の冠 */}
        <path
          d={rage ? 'M88 108 L80 66 L100 92 L112 54 L122 90 L138 50 L144 92 L162 60 L168 104' : 'M86 108 L78 60 L100 90 L110 46 L124 86 L130 38 L138 86 L152 46 L160 90 L182 60 L174 108'}
          fill={url('gold')}
          stroke={INK}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {!rage && (
          <g>
            <circle cx="130" cy="44" r="6" fill="#5af2ff" {...THIN} />
            <circle cx="110" cy="52" r="4" fill="#ff5a8a" {...THIN} />
            <circle cx="152" cy="52" r="4" fill="#ff5a8a" {...THIN} />
          </g>
        )}
        <path d="M78 116 Q130 92 182 116" stroke={url('gold')} strokeWidth="8" fill="none" />
        {/* 目のうろ */}
        <path d="M90 142 Q104 128 122 140 Q108 158 92 152 Z" fill="#0a0402" {...THIN} />
        <path d="M170 142 Q156 128 138 140 Q152 158 168 152 Z" fill="#0a0402" {...THIN} />
        <EnemyEye cx={106} cy={144} glow={url('eye')} d="M98 140 L116 144 L100 150 Z" color={rage ? '#ffd0a0' : '#fff2b0'} />
        <EnemyEye cx={154} cy={144} glow={url('eye')} d="M162 140 L144 144 L160 150 Z" color={rage ? '#ffd0a0' : '#fff2b0'} />
        <path d="M86 126 L124 142 M174 126 L136 142" stroke="#1a0c04" strokeWidth="6" strokeLinecap="round" />
        {/* 大きな口（木の牙） */}
        <path d="M96 182 Q130 214 164 182 Q160 226 130 232 Q100 226 96 182 Z" fill="#120402" {...STROKE} />
        <path d="M102 188 L108 206 L114 192 Z M124 196 L130 214 L136 196 Z M146 192 L152 206 L158 188 Z M112 228 L118 214 L124 228 Z M136 228 L142 214 L148 228 Z" fill="#c8a878" {...THIN} />
        {rage && <ellipse cx="130" cy="212" rx="18" ry="8" fill={url('crack')} />}
        <path d="M196 124 Q200 190 180 250" stroke={rage ? '#ff7a5a' : '#c07aff'} strokeWidth="3" fill="none" opacity=".7" />
      </g>
    </Svg>
  );
});

/** この絵を使う敵のID（ファイルを置くだけで自動で登録される） */
export const enemyArt = { forestWolf: ForestWolf, toxicShroom: ToxicShroom, treeWarden: TreeWarden, treantKing: TreantKing };
