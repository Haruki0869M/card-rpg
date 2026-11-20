// ===== 敵の行動順のバー（段階C）: 敵の番の間、手札の空いた所に「①森の狼：噛みつき → ②…」を出し、行動中の敵を強調する =====
// 見た目だけ。敵の番の始めの予告（技の名前・狙い）を覚えておき、エンジンの enemyCursor（次に動く敵）で進み具合を出す。
import { Check } from 'lucide-react';
import { useRef } from 'react';
import { getEnemyAction } from '../../data/enemies';
import { enemyName } from '../../engine';
import { useBattle } from '../../store/battleStore';
import { shortName } from './Battlefield';

const NUM = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

interface Row { uid: string; name: string; action: string; target?: string }

export function EnemyOrderBar() {
  const battle = useBattle((s) => s.battle);
  const snap = useRef<{ key: string; rows: Row[] } | null>(null);
  if (battle.phase !== 'enemy') return null;
  // 敵の番の始めの予告を覚える（行動した敵は予告が消えるので）
  const key = `${battle.seed}:${battle.encounterId}:${battle.turn}`;
  if (snap.current?.key !== key) {
    snap.current = {
      key,
      rows: battle.enemies.filter((e) => !e.dead).map((e) => {
        const target = e.intent?.targetId ? battle.allies.find((a) => a.id === e.intent!.targetId) : undefined;
        return {
          uid: e.uid,
          name: enemyName(e),
          action: e.skipNextAction ? '時間停止で休み' : e.intent ? getEnemyAction(e.defId, e.intent.actionId).name : '…',
          target: target ? shortName(target.name) : undefined,
        };
      }),
    };
  }
  const rows = snap.current.rows;
  // enemyCursor = 次に動く敵の並びの位置。今演出しているのは、その1つ前の敵
  const cursor = battle.enemyCursor ?? 0;
  const actingUid = cursor > 0 ? battle.enemies[cursor - 1]?.uid : undefined;
  const indexOf = (uid: string) => battle.enemies.findIndex((e) => e.uid === uid);
  const many = rows.length > 4;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-2" data-enemy-order>
      <div className="font-display text-[13px] leading-4 tracking-[0.2em] text-red-200">敵の行動順</div>
      <div className={`grid w-full max-w-[420px] gap-1 ${many ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {rows.map((r, i) => {
          const idx = indexOf(r.uid);
          const dead = !!battle.enemies[idx]?.dead;
          const now = r.uid === actingUid;
          const done = !now && idx >= 0 && idx < cursor;
          return (
            <div
              key={r.uid}
              className={`flex min-w-0 items-center gap-1 rounded-lg border px-1.5 text-[13px] leading-[22px] font-bold transition-[opacity,background-color] duration-150 ${
                now ? 'enemy-order-now border-red-300 bg-red-900/70 text-red-50' : done ? 'border-zinc-700 bg-black/40 text-zinc-500' : 'border-red-900/70 bg-black/50 text-zinc-200'
              }`}
              data-enemy-order-row={r.uid}
              data-order-state={now ? 'now' : done ? 'done' : dead ? 'dead' : 'wait'}
            >
              <span className={now ? 'text-red-200' : 'text-red-300/80'}>{NUM[i] ?? `${i + 1}.`}</span>
              <span className={`min-w-0 flex-1 truncate ${dead && !done && !now ? 'line-through opacity-60' : ''}`}>
                {r.name}：{r.action}
                {r.target && <span className="text-[12px] font-normal text-zinc-400"> →{r.target}</span>}
              </span>
              {done && <Check size={14} strokeWidth={3} className="shrink-0 text-zinc-500" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
