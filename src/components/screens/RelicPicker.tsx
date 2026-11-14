// ===== 黄金箱の秘宝の3択（2026-11-14 寄り道の値打ち 柱3）=====
// 候補の3つを並べ、押すとその下に説明の窓（ItemPickPanel）を開く。窓の「これを選ぶ」で決める。
// 2人以上はみんなで決める（多数決・同じ数なら開けた人）。選んだ人の席の印をボタンに出し、待っている人は VoteStatus（宝箱の画面の上）に出る
import { useState } from 'react';
import { getItem } from '../../data/items';
import { chestShared, sceneHeroes } from '../../engine';
import { isLocalPlayer, LOCAL_PLAYER } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import type { ChestState, GameState } from '../../types';
import { ItemPickPanel } from '../ui/ItemPickPanel';
import { VoteChips } from '../ui/Votes';
import { RARITY_STYLE } from '../ui/game';

export function RelicPicker({ game, chest }: { game: GameState; chest: ChestState }) {
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const [open, setOpen] = useState<number | undefined>();
  const relics = chest.relics ?? [];
  const heroes = sceneHeroes(game).filter((h) => !h.retired);
  // 説明の窓で比べる相手: この端末の、その場のキャラ（いなければ先頭）
  const viewer = heroes.find((h) => isLocalPlayer(h.playerId)) ?? heroes[0];
  const shared = chestShared(game);
  const pick = (i: number) => dispatchGame({ type: 'PICK_RELIC', playerId: LOCAL_PLAYER, optionIndex: i });
  return (
    <div className="-mt-1 max-h-[50vh] overflow-y-auto overscroll-contain" data-relic-picker>
      <div className="font-display text-center text-[16px] text-amber-100">秘宝を1つ選ぶ</div>
      <div className="mb-1 text-center text-[12px] leading-4 text-zinc-400">{shared ? 'みんなで決めます（同じ数なら開けた人の選んだ物）。選んだ秘宝は、その後みんなで取り合います' : '押すと説明が出ます。選ばなかった2つは消えます'}</div>
      <div className="flex flex-col gap-1">
        {relics.map((r, i) => {
          const def = getItem(r.itemId);
          const st = RARITY_STYLE[def.rarity];
          return (
            <div key={r.uid}>
              <button
                onClick={() => setOpen(open === i ? undefined : i)}
                className="btn btn-dark flex min-h-12 w-full flex-col items-start rounded-xl border px-2 py-1 text-left"
                style={{ borderColor: st.color }}
                data-pick-item={r.uid}
                data-relic-option={i}
              >
                <span className="flex w-full items-center gap-1 text-[14px] font-bold" style={{ color: st.color }}>
                  <span className="min-w-0 flex-1 truncate">{def.name}</span>
                  <VoteChips cmd={{ type: 'PICK_RELIC', playerId: LOCAL_PLAYER, optionIndex: i }} />
                </span>
                <span className="line-clamp-2 text-[12px] leading-4 text-zinc-300">{def.ability?.description ?? def.description}</span>
              </button>
              {open === i && viewer && (
                <ItemPickPanel itemId={r.itemId} itemUid={r.uid} hero={viewer} action="これを選ぶ" onAction={() => pick(i)} onClose={() => setOpen(undefined)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
