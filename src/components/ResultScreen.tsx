// ===== 戦闘の勝敗の画面（勝利 → 報酬へ / 全滅 → 結果へ / 逃走 → ダンジョンへ） =====
import { motion } from 'framer-motion';
import { CharacterArt } from '../art';
import { LOCAL_PLAYER } from '../store/battleConfig';
import { useBattle } from '../store/battleStore';

export function ResultScreen() {
  const battle = useBattle((s) => s.battle);
  const mode = useBattle((s) => s.game?.mode);
  const dispatchGame = useBattle((s) => s.dispatchGame);
  if (mode !== 'battle' || (battle.phase !== 'victory' && battle.phase !== 'defeat' && battle.phase !== 'escaped')) return null;
  const win = battle.phase === 'victory';
  const escaped = battle.phase === 'escaped';
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
        style={win || escaped ? undefined : { borderColor: 'rgba(255,90,90,.6)' }}
      >
        <div
          className="font-display text-center text-[40px] leading-[48px]"
          style={{
            background: win ? 'linear-gradient(180deg,#fff6d0,#f2c24a 55%,#a86a12)' : escaped ? 'linear-gradient(180deg,#e0f0ff,#7ab0ff)' : 'linear-gradient(180deg,#ffb0b0,#c0303a)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.8))',
          }}
        >
          {win ? '勝利！' : escaped ? '逃走成功' : '全滅…'}
        </div>
        <div className="mt-1 flex justify-center -space-x-2">
          {battle.allies.map((a) => (
            <span key={a.id} className={`h-11 w-11 overflow-hidden rounded-full border-2 border-amber-300/70 bg-[#1d2440] ${a.dead ? 'grayscale' : ''}`}>
              <CharacterArt classId={a.classId} gender={a.gender} face className="h-full w-full" />
            </span>
          ))}
        </div>
        {!escaped && (
          <div className="mt-2 flex flex-col text-[14px]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-white/10 py-1">
                <span className="text-zinc-300">{k}</span>
                <span className="font-bold tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        )}
        {escaped && <div className="mt-2 text-center text-[13px] text-zinc-300">報酬は得られないが、部屋は通過できる。</div>}
        <button
          onClick={() => dispatchGame({ type: 'FINISH_BATTLE', playerId: LOCAL_PLAYER })}
          className="btn btn-gold font-display mt-4 h-12 w-full rounded-xl text-[18px]"
        >
          {win ? '報酬を受け取る' : escaped ? 'ダンジョンへ戻る' : '冒険の結果へ'}
        </button>
      </motion.div>
    </motion.div>
  );
}
