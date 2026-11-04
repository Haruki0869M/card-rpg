import { motion } from 'framer-motion';
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
    ['使ったフォーカス', st.focusUsed],
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-[55] flex items-center justify-center bg-black/75 px-6"
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className={`w-full max-w-xs rounded-2xl border-2 p-4 ${win ? 'border-amber-300 bg-stone-900' : 'border-red-500 bg-stone-950'}`}
      >
        <div className={`text-center text-[28px] font-black ${win ? 'text-amber-300' : 'text-red-400'}`}>{win ? '勝利！' : '敗北…'}</div>
        <div className="mt-3 flex flex-col gap-1 text-[14px]">
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
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => newBattle()}
            className="h-12 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-[16px] font-black text-stone-950"
          >
            もう一度（新しいシード）
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => newBattle({ sameSeed: true })} className="h-12 rounded-xl bg-zinc-700 text-[15px] font-bold">
            同じシードで再戦
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
