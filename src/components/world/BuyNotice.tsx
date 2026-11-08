// ===== 町で買った時の手応え（フェーズ2-A）。見た目だけで、買う・装備するのは今の操作（TOWN_BUY・EQUIP）のまま =====
// 装備品: 「〇〇を買った！（持ち物へ）」＋今の装備との能力の差＋「すぐ装備する／あとで」。押し忘れないよう自動では閉じない。
// 道具・カード: 短いお知らせ（少しして消える）。
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Shirt } from 'lucide-react';
import { useEffect } from 'react';
import { getItem } from '../../data/items';
import { canEquip } from '../../engine';
import { useBattle } from '../../store/battleStore';
import type { EquipSlot, GameState } from '../../types';
import { diffText } from '../equipDiff';
import { ItemIcon, RARITY_STYLE } from '../ui/game';

export type Bought =
  | { id: number; kind: 'equip'; heroId: string; itemUid: string; itemId: string }
  | { id: number; kind: 'text'; text: string };

const SLOT_NAME: Record<EquipSlot, string> = { weapon: '武器', armor: '防具', accessory: '装飾品' };

/** 買った物を、窓に出す形にする（装備品なら「すぐ装備」の窓、それ以外は短い文） */
export function boughtNotice(id: number, heroName: string, heroId: string, bought: { kind: 'item'; itemUid: string; itemId: string } | { kind: 'card'; cardName: string }): Bought {
  if (bought.kind === 'card') return { id, kind: 'text', text: `「${bought.cardName}」を${heroName}の山札に加えた！` };
  const it = getItem(bought.itemId);
  if (it.slot === 'consumable') return { id, kind: 'text', text: `${it.name}を買った！（道具袋へ）` };
  return { id, kind: 'equip', heroId, itemUid: bought.itemUid, itemId: bought.itemId };
}

export function BuyNotice({ game, bought, onClose }: { game: GameState; bought: Bought | null; onClose: () => void }) {
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const showToast = useBattle((s) => s.showToast);
  // 道具・カードは短く出して消す
  useEffect(() => {
    if (bought?.kind !== 'text') return;
    const t = setTimeout(onClose, 1800);
    return () => clearTimeout(t);
  }, [bought, onClose]);

  let body: React.ReactNode = null;
  if (bought?.kind === 'text') {
    body = (
      <div className="pointer-events-none mx-auto flex max-w-xs items-center justify-center gap-1.5 rounded-xl border border-amber-300/60 bg-black/90 px-3 py-2 text-[14px] font-bold text-amber-50" role="status" data-buy-notice="text">
        <Check size={17} className="shrink-0 text-emerald-300" />
        {bought.text}
      </div>
    );
  } else if (bought?.kind === 'equip') {
    const hero = game.heroes.find((h) => h.id === bought.heroId);
    const it = getItem(bought.itemId);
    const slot = it.slot as EquipSlot;
    const owned = hero?.stash.some((x) => x.uid === bought.itemUid);
    const cur = hero?.equipment[slot] ? getItem(hero.equipment[slot]!.itemId) : null;
    const why = hero ? canEquip(hero, it) : '装備できません';
    const diff = hero ? diffText(hero, slot, it) : [];
    body = (
      <div className="panel panel-gold-edge pointer-events-auto mx-auto w-full max-w-sm rounded-2xl p-2.5" role="dialog" aria-label="買った装備" data-buy-notice="equip" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <ItemIcon item={it} size={42} />
          <div className="min-w-0 flex-1 leading-5">
            <div className="text-[15px] font-bold text-amber-50">
              <span style={{ color: RARITY_STYLE[it.rarity].color }}>{it.name}</span>を買った！
              <span className="ml-1 text-[12px] font-normal text-zinc-300">（持ち物へ）</span>
            </div>
            <div className="truncate text-[12px] text-zinc-300">
              今の{SLOT_NAME[slot]}：{cur?.name ?? 'なし'}
            </div>
          </div>
        </div>
        {!why && (
          <div className="mt-1 flex min-h-5 flex-wrap gap-x-2 text-[13px] font-bold" data-buy-diff>
            {diff.length ? (
              diff.map((d) => (
                <span key={d.label} className={d.delta > 0 ? 'text-emerald-300' : 'text-red-300'}>
                  {d.label}
                  {d.delta > 0 ? '+' : ''}
                  {d.delta}
                </span>
              ))
            ) : (
              <span className="font-normal text-zinc-400">能力の数値は変わらない（特殊な効果を確かめよう）</span>
            )}
          </div>
        )}
        {why ? (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="min-w-0 flex-1 text-[13px] text-red-200">{why}（持ち物に入れました）</span>
            <button onClick={onClose} className="btn btn-dark h-11 shrink-0 rounded-lg px-4 text-[14px] font-bold">
              閉じる
            </button>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-[1fr_2fr] gap-1.5">
            <button onClick={onClose} className="btn btn-dark h-11 rounded-lg text-[14px] font-bold">
              あとで
            </button>
            <button
              disabled={!owned || !hero}
              onClick={() => {
                if (!hero) return;
                const err = dispatchGame({ type: 'EQUIP', playerId: hero.playerId, heroId: hero.id, itemUid: bought.itemUid });
                if (!err) showToast(`${hero.name}が${it.name}を装備した！`);
                onClose();
              }}
              className="btn btn-gold flex h-11 items-center justify-center gap-1 rounded-lg text-[15px] font-bold"
              data-equip-now
            >
              <Shirt size={17} /> すぐ装備する
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {bought && (
        <motion.div
          key={bought.id}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          className={`absolute inset-x-3 bottom-[92px] z-[55] ${bought.kind === 'equip' ? '' : 'pointer-events-none'}`}
        >
          {body}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
