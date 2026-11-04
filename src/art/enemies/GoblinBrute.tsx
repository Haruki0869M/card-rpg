// ゴブリン重装兵: 猫背の巨体・骨のトゲ・赤く光るルーンの大鉈
import { memo } from 'react';
import { GlowDef, Grad3, INK, Limb, STROKE, THIN, useArtIds } from '../kit';
import { ENEMY_VIEWBOX } from './common';
import { Aura, EnemyEye } from './parts';

export const GoblinBrute = memo(function GoblinBrute({ className }: { className?: string }) {
  const { id, url } = useArtIds();
  const skin = url('skin');
  const iron = url('iron');
  const bone = url('bone');
  return (
    <svg viewBox={ENEMY_VIEWBOX} className={className} aria-hidden>
      <defs>
        <Grad3 id={id('skin')} c={['#9cbc4e', '#56722a', '#1f2c0c']} x2={0.4} />
        <Grad3 id={id('iron')} c={['#7a7090', '#2e2838', '#0c0a10']} x2={1} />
        <Grad3 id={id('rust')} c={['#b05a26', '#6a2a10', '#2a0c04']} />
        <Grad3 id={id('bone')} c={['#fff8e2', '#e2d2a8', '#9a865c']} />
        <Grad3 id={id('cleaver')} c={['#a8a2b6', '#4a4456', '#16121c']} x2={1} />
        <GlowDef id={id('red')} color="#ff2a1a" />
        <GlowDef id={id('aura')} color="#9b2cff" opacity={0.5} />
      </defs>
      <Aura url={url('aura')} />
      <ellipse cx="130" cy="290" rx="98" ry="12" fill="#000" opacity=".6" />
      <g className="enemy-body">
        {/* 大鉈（背中側） */}
        <g className="enemy-weapon">
          <path d="M214 60 L232 280" stroke={INK} strokeWidth="13" strokeLinecap="round" />
          <path d="M214 60 L232 280" stroke="#4a2a12" strokeWidth="7" strokeLinecap="round" />
          <path d="M196 -2 L250 14 Q258 70 238 118 L204 120 Q190 60 196 -2 Z" fill={url('cleaver')} {...STROKE} />
          <path d="M196 -2 L202 12 L196 22 L203 36 L197 48 L204 62 L198 76" stroke="#c8c0d6" strokeWidth="2.4" fill="none" />
          <ellipse cx="226" cy="54" rx="22" ry="40" fill={url('red')} />
          <path d="M222 30 L232 44 L220 56 L232 70 M216 88 L232 90" stroke="#ff4a3a" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M236 96 Q240 106 236 118" stroke="#8a0a0a" strokeWidth="5" strokeLinecap="round" />
        </g>
        {/* 脚 */}
        <path d="M86 216 L74 266 L112 268 L116 220 Z" fill={url('rust')} {...STROKE} />
        <path d="M146 220 L150 268 L188 266 L176 216 Z" fill={url('rust')} {...STROKE} />
        <path d="M72 262 L68 280 L116 280 L114 262 Z M148 262 L146 280 L194 280 L190 262 Z" fill={iron} {...THIN} />
        <path d="M68 280 L62 285 M116 280 L121 285 M194 280 L200 285" stroke="#d6cee2" strokeWidth="3" strokeLinecap="round" />
        {/* 胴（猫背） */}
        <path d="M58 132 Q130 92 202 132 L196 206 Q130 238 64 206 Z" fill={iron} {...STROKE} />
        <path d="M74 148 Q130 122 186 148" stroke="#8a8098" strokeWidth="2.4" fill="none" opacity=".7" />
        <path d="M70 174 Q130 156 190 174" stroke="#4a4258" strokeWidth="4" fill="none" />
        {[80, 106, 154, 180].map((x) => (
          <circle key={x} cx={x} cy={x < 130 ? 172 - (x - 80) * 0.2 : 167 + (x - 154) * 0.2} r="3.4" fill="#b8b0c6" {...THIN} />
        ))}
        {/* 腰の髑髏 */}
        <path d="M130 180 q-15 0 -15 14 q0 9 6 11 l0 7 l18 0 l0 -7 q6 -2 6 -11 q0 -14 -15 -14z" fill={bone} {...THIN} />
        <ellipse cx="124" cy="194" rx="4" ry="4.5" fill="#0a0404" />
        <ellipse cx="136" cy="194" rx="4" ry="4.5" fill="#0a0404" />
        <circle cx="124" cy="195" r="4" fill={url('red')} />
        <circle cx="136" cy="195" r="4" fill={url('red')} />
        {/* 鎖 */}
        <g stroke="#5c5468" strokeWidth="3.4" fill="none">
          <ellipse cx="78" cy="214" rx="6" ry="4" />
          <ellipse cx="86" cy="222" rx="4" ry="6" />
          <ellipse cx="92" cy="232" rx="6" ry="4" />
        </g>
        {/* 左腕（垂れた太い腕） */}
        <Limb d="M62 148 Q34 182 46 220" fill={skin} width={24} />
        <path d="M56 160 Q42 186 48 208" stroke="#c4e07a" strokeWidth="2.6" fill="none" opacity=".5" />
        <path d="M34 206 Q46 196 60 206 L62 226 Q48 234 34 226 Z" fill={iron} {...STROKE} />
        <path d="M34 226 L29 238 M44 230 L42 244 M54 230 L56 242" stroke="#e2d8ea" strokeWidth="3.4" strokeLinecap="round" />
        {/* 右腕（大鉈を握る） */}
        <Limb d="M196 146 Q222 156 220 128" fill={skin} width={22} />
        <circle cx="219" cy="124" r="12" fill={skin} {...STROKE} />
        {/* 肩当て（骨のトゲ） */}
        <path d="M28 144 Q32 100 80 110 L86 138 Q60 160 28 144 Z" fill={iron} {...STROKE} />
        <path d="M36 122 L12 92 L52 112 Z M54 110 L44 72 L70 108 Z M72 108 L76 78 L84 110 Z" fill={bone} {...THIN} />
        <path d="M232 144 Q228 100 180 110 L174 138 Q200 160 232 144 Z" fill={iron} {...STROKE} />
        <path d="M224 122 L248 92 L208 112 Z M206 110 L216 72 L190 108 Z M188 108 L184 78 L176 110 Z" fill={bone} {...THIN} />
        <path d="M36 136 Q56 146 80 132" stroke="#b04ad0" strokeWidth="2.4" fill="none" opacity=".7" />
      </g>
      {/* 頭（前に突き出す） */}
      <g className="enemy-head">
        <path d="M94 120 Q88 76 130 68 Q172 76 166 120 Q160 146 130 152 Q100 146 94 120 Z" fill={skin} {...STROKE} />
        <path d="M96 102 L48 84 L62 96 L46 104 L96 122 Z" fill={skin} {...STROKE} />
        <path d="M164 102 L212 84 L198 96 L214 104 L164 122 Z" fill={skin} {...STROKE} />
        <circle cx="200" cy="96" r="4" fill="none" stroke={bone} strokeWidth="2.4" />
        {/* 兜 */}
        <path d="M90 104 Q88 58 130 52 Q172 58 170 104 Q152 92 130 94 Q108 92 90 104 Z" fill={iron} {...STROKE} />
        <path d="M130 52 L130 92" stroke="#8a8098" strokeWidth="4" />
        <path d="M100 78 Q88 44 70 24 Q98 40 114 68 Z" fill={bone} {...STROKE} />
        <path d="M160 78 Q172 44 190 24 Q162 40 146 68 Z" fill={bone} {...STROKE} />
        {/* 目（発光） */}
        <EnemyEye cx={113} cy={113} glow={url('red')} d="M102 108 L124 115 L104 120 Z" color="#ffe066" />
        <EnemyEye cx={147} cy={113} glow={url('red')} d="M158 108 L136 115 L156 120 Z" color="#ffe066" />
        <path d="M98 102 L126 112 M162 102 L134 112" stroke="#141a08" strokeWidth="5" strokeLinecap="round" />
        {/* 口・牙 */}
        <path d="M106 132 Q130 148 154 132 Q150 146 130 148 Q110 146 106 132 Z" fill="#2a0404" {...THIN} />
        <path d="M112 136 L116 120 L121 139 Z M139 139 L144 120 L148 136 Z" fill={bone} {...THIN} />
        {/* 傷 */}
        <path d="M152 92 L138 138" stroke="#3a0808" strokeWidth="2.6" />
        <path d="M150 102 L156 105 M146 114 L152 117 M142 126 L148 129" stroke="#3a0808" strokeWidth="2" />
        <path d="M164 118 Q160 140 132 150" stroke="#d07aff" strokeWidth="2.6" fill="none" opacity=".75" />
      </g>
    </svg>
  );
});
