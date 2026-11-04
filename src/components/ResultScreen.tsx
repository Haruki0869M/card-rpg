// ===== 勝利・敗北の画面 =====
import { motion } from 'framer-motion';
import { CharacterArt } from '../art';
import { useBattle } from '../store/battleStore';

export function ResultScreen() {
  const battle = useBattle((s) => s.battle);
  const newBattle = useBattle((s) => s.newBattle);
  if (battle.phase !== 'victory' && battle.phase !== 'defeat') return null;
  const win = battle.phase === 'victory';
  const st = battle.stats;
  const rows: [string, string | number][] = [
    ['ターン数', battle.turn],
    ['与えた総ダメージ', st.totalDamage],
    ['最大ダメージ', st.maxDamage],
    ['完全成功', `${st.perfects}回`],
    ['特殊能力の発動', `${st.abilityTriggers}回`],
    ['使ったフォーカス', st.focusUsed],
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-[55] flex items-center justify-center bg-black/80 px-5"
      onClick={(e) => e.stopPropagation()}
    >
      {win && (
        <motion.div
          className="pointer-events-none absolute top-1/2 left-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background: 'repeating-conic-gradient(from 0deg, rgba(255,210,120,.16) 0deg 8deg, transparent 8deg 24deg)',
            maskImage: 'radial-gradient(circle, black 20%, transparent 65%)',
            WebkitMaskImage: 'radial-gradient(circle, black 20%, transparent 65%)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
        />
      )}
      <motion.div
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="panel panel-gold-edge relative w-full max-w-xs rounded-2xl p-4"
        style={win ? undefined : { borderColor: 'rgba(255,90,90,.6)' }}
      >
        <div
          className="font-display text-center text-[40px] leading-[48px]"
          style={{
            background: win ? 'linear-gradient(180deg,#fff6d0,#f2c24a 55%,#a86a12)' : 'linear-gradient(180deg,#ffb0b0,#c0303a)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.8))',
          }}
        >
          {win ? '勝利！' : '敗北…'}
        </div>
        <div className="mt-1 flex justify-center -space-x-2">
          {battle.allies.map((a) => (
            <span key={a.id} className={`h-11 w-11 overflow-hidden rounded-full border-2 border-amber-300/70 bg-[#1d2440] ${a.dead ? 'grayscale' : ''}`}>
              <CharacterArt classId={a.classId} gender={a.gender} face className="h-full w-full" />
            </span>
          ))}
        </div>
        <div className="mt-2 flex flex-col text-[14px]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-white/10 py-1">
              <span className="text-zinc-300">{k}</span>
              <span className="font-bold tabular-nums">{v}</span>
            </div>
          ))}
          <div className="pt-1 text-center text-[12px] text-zinc-500">
            シード {battle.seed} / {battle.allies.length}人パーティ
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button onClick={() => newBattle()} className="btn btn-gold font-display h-12 rounded-xl text-[17px]">
            もう一度（新しいシード）
          </button>
          <button onClick={() => newBattle({ sameSeed: true })} className="btn btn-dark h-12 rounded-xl text-[15px] font-bold">
            同じシードで再戦
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
