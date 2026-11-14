// ===== 状態の一覧（「＋N」の札を押すと開く。狭い画面の直し 回3） =====
// その敵・味方に付いている全部の印と、短い説明。この端末だけで開く窓（ゲームの操作は送らない = 2人で遊んでも相手を止めない）。
// 同じ一覧を、敵・味方の長押しの説明（DetailPopup）にも出す（StatusListBody）。
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { create } from 'zustand';
import { enemyName, findAlly } from '../../engine';
import { useBattle } from '../../store/battleStore';
import type { BattleState } from '../../types';
import { MARK_STATUSES, statusStyle } from '../ui/icons';
import { LAYER } from '../ui/layers';
import { allyMarks, enemyMarks, type Mark } from './statusMarks';

type Target = { side: 'ally' | 'enemy'; id: string };

export const useStatusList = create<{ open: Target | null; show: (t: Target) => void; hide: () => void }>((set) => ({
  open: null,
  show: (open) => set({ open }),
  hide: () => set({ open: null }),
}));

/** 一覧を出す相手（名前と印）。もういない・倒れた時は null */
function targetView(battle: BattleState, t: Target): { name: string; marks: Mark[] } | null {
  if (t.side === 'enemy') {
    const e = battle.enemies.find((x) => x.uid === t.id);
    return e && !e.dead ? { name: enemyName(e), marks: enemyMarks(e) } : null;
  }
  const a = findAlly(battle, t.id);
  return a ? { name: a.name, marks: allyMarks(a) } : null;
}

/** 印の一覧（1行に1つ: 印・名前・数・説明） */
export function StatusListBody({ marks, battle }: { marks: Mark[]; battle: BattleState }) {
  return (
    <ul className="flex flex-col gap-1" data-status-list-body>
      {marks.map((m) => {
        const st = statusStyle(m.status);
        const by = m.by ? findAlly(battle, m.by) : undefined;
        return (
          <li key={m.status} className="rounded-lg px-1.5 py-1 text-[13px] leading-5" style={{ background: `${st.bg}cc` }} data-status-list-row={m.status}>
            <span className="inline-flex items-center gap-1 font-bold" style={{ color: st.color }}>
              <st.Icon size={14} strokeWidth={2.6} />
              {st.name}
              {!MARK_STATUSES.has(m.status) && <span className="tabular-nums">{m.amount}</span>}
            </span>
            <span className="text-zinc-200">：{st.text}</span>
            {by && <span className="text-amber-200">（挑発した味方：{by.name}）</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function StatusListPopup() {
  const open = useStatusList((s) => s.open);
  const hide = useStatusList((s) => s.hide);
  const battle = useBattle((s) => s.battle);
  const view = open ? targetView(battle, open) : null;
  // 相手が倒れた・戦闘が終わった時は閉じる
  useEffect(() => {
    if (open && !view) hide();
  }, [open, view, hide]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hide]);
  return (
    <AnimatePresence>
      {open && view && (
        <motion.div
          key="status-list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="absolute inset-0 bg-black/55"
          style={{ zIndex: LAYER.statusList }}
          data-status-list-backdrop
          role="presentation"
          // 外の暗い所を押したら閉じる。下の戦場（狙う・選び直す）へは届かせない
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            hide();
          }}
        >
          <div
            role="dialog"
            aria-label={`${view.name}の状態の一覧`}
            data-status-list={open.id}
            className="panel panel-gold-edge absolute inset-x-2 top-12 max-h-[75%] overflow-y-auto overscroll-contain rounded-xl p-3 shadow-[0_8px_24px_rgba(0,0,0,.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="font-display min-w-0 flex-1 truncate text-[16px] leading-6 text-amber-100">
                {view.name}の状態（{view.marks.length}つ）
              </div>
              <button className="btn btn-dark min-h-11 shrink-0 rounded px-4 text-[13px]" onClick={hide} data-status-list-close>
                閉じる
              </button>
            </div>
            {view.marks.length ? <StatusListBody marks={view.marks} battle={battle} /> : <div className="text-[13px] text-zinc-400">今は何も付いていない</div>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
