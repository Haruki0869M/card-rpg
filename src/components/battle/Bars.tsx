import { corruptionName } from '../../data/scenarios';
// ===== 上部バー・下部バー =====
import { AnimatePresence, motion } from 'framer-motion';
import { Backpack, Flame, Layers, Menu, Skull, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { findAlly, isDone, waitingPlayers } from '../../engine';
import { isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';

export function TopBar() {
  const turn = useBattle((s) => s.battle.turn);
  const openSheet = useBattle((s) => s.openSheet);
  // 侵食度と命の灯火（冒険の状態から）
  const corruption = useBattle((s) => s.full?.world?.corruption ?? 0);
  const lives = useBattle((s) => s.full?.lives);
  const corruptionLabel = useBattle((s) => corruptionName(s.full?.scenarioId));
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 px-2">
      <div className="font-display flex items-baseline gap-1 whitespace-nowrap text-amber-200">
        <span className="text-[12px] text-amber-200/70">ターン</span>
        <span className="text-outline text-[22px] leading-none">{turn}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Skull size={16} className="shrink-0 text-fuchsia-300" />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between text-[12px] leading-[13px]">
            <span className="font-display text-fuchsia-200">{corruptionLabel}</span>
            <span className="font-bold text-fuchsia-200 tabular-nums">{corruption}%</span>
          </div>
          <div className="mt-0.5 h-[7px] overflow-hidden rounded-full border border-fuchsia-900 bg-black/70">
            <div
              className="h-full w-full origin-left bg-gradient-to-r from-fuchsia-800 via-fuchsia-500 to-pink-400"
              style={{ transform: `scaleX(${corruption / 100})` }}
            />
          </div>
        </div>
      </div>
      {lives !== undefined && (
        <span className="flex shrink-0 items-center gap-0.5 rounded-full border border-orange-400/40 bg-black/50 px-1.5 text-[13px] font-bold text-orange-200 tabular-nums" aria-label="命の灯火" data-lives={lives}>
          <Flame size={14} className="fill-orange-500/60 text-orange-300" />×{lives}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          openSheet('menu');
        }}
        aria-label="メニュー"
        className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg"
      >
        <Menu size={22} />
      </button>
    </div>
  );
}

export function BottomBar() {
  const battle = useBattle((s) => s.battle);
  const activeId = useBattle((s) => s.activeId);
  const hint = useBattle((s) => s.hint);
  const endTurn = useBattle((s) => s.endTurn);
  const openSheet = useBattle((s) => s.openSheet);
  const ally = findAlly(battle, activeId);
  const allDone = battle.phase === 'ally' && battle.allies.every((a) => !isLocalPlayer(a.playerId) || isDone(battle, a));
  // オンライン協力: 自分の分は準備完了して、他の人を待っている
  const waiting = waitingPlayers(battle);
  const iAmReady = !!battle.readyCheck && battle.phase === 'ally' && !waiting.some((p) => isLocalPlayer(p));
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!hint) return;
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 1800);
    return () => clearTimeout(t);
  }, [hint]);

  // 操作中のキャラの道具袋
  const pouch = useBattle((s) => s.game?.heroes.find((h) => h.id === s.activeId)?.pouch.length ?? 0);
  const pileBtn = 'btn btn-dark flex h-11 min-w-[50px] items-center justify-center gap-1 rounded-lg px-1.5 text-[14px] font-bold tabular-nums';

  return (
    <div className="relative flex h-[58px] shrink-0 items-center gap-2 px-2 pb-1" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => openSheet('draw')} className={pileBtn} aria-label="山札を見る">
        <Layers size={16} className="text-sky-300" />
        {ally?.drawPile.length ?? 0}
      </button>
      <button onClick={() => openSheet('discard')} className={pileBtn} aria-label="捨札を見る">
        <Trash2 size={16} className="text-zinc-400" />
        {ally?.discard.length ?? 0}
      </button>
      <button onClick={() => openSheet('pouch')} disabled={battle.phase !== 'ally'} className={pileBtn} aria-label="道具袋">
        <Backpack size={16} className="text-amber-300" />
        {pouch}
      </button>
      <div className="min-w-0 flex-1">
        <AnimatePresence>
          {showHint && hint && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-right text-[12px] leading-4 text-amber-200">
              {hint.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <button
        onClick={endTurn}
        disabled={battle.phase !== 'ally'}
        className={`btn ${allDone ? 'btn-gold' : 'btn-dark'} font-display relative h-12 w-[116px] shrink-0 rounded-xl text-[16px]`}
      >
        {allDone && <span className="glow-pulse pointer-events-none absolute -inset-1.5 rounded-2xl border-2 border-amber-300" />}
        {battle.phase === 'enemy' ? '敵の行動中' : iAmReady ? (
          <span className="flex flex-col text-[13px] leading-4">
            準備完了
            <span className="text-[12px] text-zinc-400">{waiting.join('・')}を待っています</span>
          </span>
        ) : battle.readyCheck ? (
          '準備完了'
        ) : (
          'ターン終了'
        )}
      </button>
    </div>
  );
}
