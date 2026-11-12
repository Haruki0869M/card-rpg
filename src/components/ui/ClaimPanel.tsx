// ===== 戦利品の取り合い（欲しい／余れば／いらない）: 戦闘で落とした装備と、2人以上で開けた宝箱の中身（ステップ2）で使う =====
import { getItem } from '../../data/items';
import { findHero } from '../../engine';
import { isLocalPlayer, LOCAL_PLAYER } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import type { LootClaim } from '../../types';
import { ItemInfoArea } from '../ItemDetail';
import { HeroFace, ItemIcon, itemSummary, RARITY_STYLE } from './game';

const CLAIM_LABEL = { need: '欲しい', greed: '余れば', pass: 'いらない' } as const;

/** 落とした装備の取り合い（M3-C5）: 全員が選んだら、欲しい人の中で運の判定が一番高い人へ */
export function ClaimPanel({ claim: c, index, title = '戦利品を取り合う' }: { claim: LootClaim; /** 宝箱の取り合いの何番目か */ index?: number; title?: string }) {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const def = getItem(c.item.itemId);
  const roll = (id: string) => c.rolls?.find((x) => x.heroId === id)?.roll;
  return (
    <div className="panel panel-gold-edge mt-3 w-full rounded-xl p-2" data-claim={index ?? 0}>
      <div className="font-display text-center text-[16px] text-amber-100">{title}</div>
      {/* 押すと詳細（この端末のキャラの今の装備と比べる）。「欲しい」等のボタンとは別 */}
      <ItemInfoArea itemId={def.id} heroId={c.heroes.find((id) => isLocalPlayer(findHero(game, id)!.playerId))} className="mt-1 flex w-full items-center gap-2">
        <ItemIcon item={def} size={52} />
        <span className="block min-w-0">
          <span className="block font-bold" style={{ color: RARITY_STYLE[def.rarity].color }}>
            {def.source && <span className="mr-1 rounded bg-amber-500/80 px-1 text-[12px] text-black" data-exclusive-tag>✨専用</span>}
            {def.name}
          </span>
          <span className="block text-[12px] leading-4 text-zinc-300">{itemSummary(def)}</span>
        </span>
      </ItemInfoArea>
      <div className="mt-1 text-[12px] text-zinc-400">「欲しい」人がいればその中で、いなければ「余れば」の人の中で、運の判定（1〜100＋運の半分）が一番高い人がもらう</div>
      <div className="mt-1.5 flex flex-col gap-1">
        {c.heroes.map((id) => {
          const h = findHero(game, id)!;
          const mine = isLocalPlayer(h.playerId);
          const ch = c.choices[id];
          const win = c.winner === id;
          return (
            <div key={id} className={`flex items-center gap-1.5 rounded-lg p-1 ${win ? 'bg-amber-500/25 ring-1 ring-amber-300' : 'bg-black/30'}`}>
              <HeroFace hero={h} size={30} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{h.name}</span>
              {c.rolls ? (
                <span className="text-[13px] tabular-nums text-zinc-200">
                  {CLAIM_LABEL[ch]}
                  {roll(id) !== undefined && <b className="ml-1 text-amber-200">運 {roll(id)}</b>}
                  {win && <b className="ml-1 text-amber-300">獲得！</b>}
                </span>
              ) : mine ? (
                (['need', 'greed', 'pass'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => dispatchGame({ type: 'CLAIM_LOOT', playerId: LOCAL_PLAYER, heroId: id, choice: k, index })}
                    className={`btn h-11 rounded-lg px-2 text-[13px] font-bold ${ch === k ? 'btn-gold' : 'btn-dark'}`}
                  >
                    {CLAIM_LABEL[k]}
                  </button>
                ))
              ) : (
                <span className="text-[12px] text-zinc-400">{ch ? '選んだ' : '選んでいます…'}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
