// ===== 装備・道具の詳細（どの画面からでも同じ窓を開く。Step A ①） =====
// 上から: 名前・レア度・部位 → その装備そのものの数値 → 特殊能力 → 専用のカード → 今の装備と比べて
import type { ReactNode } from 'react';
import { getCard } from '../data/cards';
import { getItem } from '../data/items';
import { WEAPON_TYPES } from '../data/rules';
import { canEquip, describeAbility, describeEffect } from '../engine';
import { type Detail, useDetail, useInfoPress } from '../hooks/usePress';
import type { EquipSlot, Hero, ItemDef } from '../types';
import { compareItems, diffLine, itemOwnStats } from './equipDiff';
import { RARITY_STYLE } from './ui/game';

export const SLOT_NAME: Record<ItemDef['slot'], string> = { weapon: '武器', armor: '防具', accessory: '装飾品', consumable: '道具' };

/** 装備・道具の文字の所（アイコン＋名前など）。タップ・長押しで詳細を開く。買う・装備するボタンとは別 */
export function ItemInfoArea({ itemId, heroId, itemUid, className, children }: { itemId: string; heroId?: string; itemUid?: string; className?: string; children: ReactNode }) {
  const detail: Detail = { type: 'item', itemId, heroId, itemUid };
  const press = useInfoPress(detail);
  return (
    <button type="button" {...press} aria-label={`${getItem(itemId).name}の詳細`} data-item-detail={itemId} className={`btn min-h-11 min-w-0 text-left ${className ?? ''}`}>
      {children}
    </button>
  );
}

/** 候補の一覧の2行目: 「《能力》（説明） ／ 今と比べて：器用-10」。差を、その装備の数値と読み違えないように */
export function CandidateLine({ hero, slot, item }: { hero: Hero; slot: EquipSlot; item: ItemDef }) {
  const cmp = compareItems(hero, slot, item);
  const head = item.ability ? `《${item.ability.name}》（${describeAbility(item.ability)}）` : itemOwnStats(item).join('・') || item.description;
  return (
    <span className="block text-[12px] leading-4">
      <span className="text-zinc-300">{head}</span>
      <span className="text-zinc-500"> ／ </span>
      <span className="text-zinc-400">今と比べて：</span>
      {cmp.same ? (
        <span className="text-zinc-400">変わらない</span>
      ) : (
        <>
          {cmp.stats.map((d, i) => (
            <span key={d.label} className={d.delta > 0 ? 'text-emerald-300' : 'text-red-300'}>
              {i > 0 && '・'}
              {d.label}
              {d.delta > 0 ? '+' : ''}
              {d.delta}
            </span>
          ))}
          {cmp.ability && <span className="text-amber-200">{cmp.stats.length ? '・' : ''}能力が変わる</span>}
          {(cmp.cardsGained.length > 0 || cmp.cardsLost.length > 0) && <span className="text-sky-300">{cmp.stats.length || cmp.ability ? '・' : ''}カードが変わる</span>}
        </>
      )}
    </span>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-1.5">
      <div className="text-[12px] text-zinc-400">{label}</div>
      <div className="text-[13px] leading-5">{children}</div>
    </div>
  );
}

function CardLink({ cardId, count, heroId, sign }: { cardId: string; count: number; heroId?: string; sign?: '+' | '−' }) {
  const card = getCard(cardId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        useDetail.getState().open({ type: 'card', cardId, allyId: heroId });
      }}
      className="btn mr-1 mb-1 inline-flex min-h-10 items-center rounded-lg border border-sky-300/50 bg-sky-950/50 px-2 text-[13px] font-bold text-sky-100"
      data-detail-card={cardId}
    >
      {sign}「{card.name}」×{count}
    </button>
  );
}

export function ItemDetailContent({ d, hero }: { d: Extract<Detail, { type: 'item' }>; hero?: Hero }) {
  const it = getItem(d.itemId);
  const r = RARITY_STYLE[it.rarity];
  const own = itemOwnStats(it);
  const wt = it.weaponType ? WEAPON_TYPES.tryGet(it.weaponType)?.name ?? it.weaponType : null;
  const slot = it.slot === 'consumable' ? null : (it.slot as EquipSlot);
  const equippedNow = !!(hero && slot && (d.itemUid ? hero.equipment[slot]?.uid === d.itemUid : false));
  const cmp = hero && slot && !equippedNow ? compareItems(hero, slot, it) : null;
  const why = hero && slot && !equippedNow ? canEquip(hero, it) : null;
  return (
    <div data-item-detail-body={it.id}>
      <div className="font-display text-[17px] leading-6" style={{ color: r.color }}>
        {it.name}
      </div>
      <div className="text-[12px] text-zinc-300">
        <span style={{ color: r.color }}>{r.name}</span>・{SLOT_NAME[it.slot]}
        {wt && `（${wt}）`}
        {equippedNow && <span className="ml-1 text-amber-200">装備中</span>}
      </div>
      {own.length > 0 && <Section label="この装備の能力">{own.join('・')}</Section>}
      {it.use?.length ? <Section label="使うと">{it.use.map((e) => describeEffect(e).replace('対象', '味方1人')).join('・')}</Section> : null}
      {it.ability && (
        <div className="mt-1.5 rounded bg-amber-500/10 px-1.5 py-1 text-[13px] leading-5">
          <span className="font-display" style={{ color: r.color }}>
            《{it.ability.name}》
          </span>{' '}
          {describeAbility(it.ability)}
        </div>
      )}
      {it.cards?.length ? (
        <Section label="装備している間、山札に加わるカード（押すとカードの詳細）">
          <div className="mt-0.5">
            {it.cards.map((c) => (
              <CardLink key={c.cardId} cardId={c.cardId} count={c.count} heroId={hero?.id} />
            ))}
          </div>
        </Section>
      ) : null}
      {it.description && <div className="mt-1 text-[12px] text-zinc-400">{it.description}</div>}
      {cmp && hero && (
        <div className="mt-2 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5" data-item-compare>
          <div className="text-[12px] text-zinc-400">
            {hero.name}の今の{SLOT_NAME[it.slot]}（{cmp.current?.name ?? 'なし'}）と比べて
          </div>
          {cmp.same ? (
            <div className="text-[13px] text-zinc-300">変わらない</div>
          ) : (
            <>
              {cmp.stats.length > 0 && (
                <div className="text-[13px] font-bold">
                  今と比べて：
                  {cmp.stats.map((x, i) => (
                    <span key={x.label} className={x.delta > 0 ? 'text-emerald-300' : 'text-red-300'}>
                      {i > 0 && '・'}
                      {diffLine([x])}
                    </span>
                  ))}
                </div>
              )}
              {cmp.ability && (
                <div className="text-[13px] text-amber-100">
                  特殊能力：《{cmp.ability.from ?? 'なし'}》→《{cmp.ability.to ?? 'なし'}》
                </div>
              )}
              {(cmp.cardsGained.length > 0 || cmp.cardsLost.length > 0) && (
                <div className="mt-0.5">
                  {cmp.cardsGained.map((c) => (
                    <CardLink key={`g${c.cardId}`} cardId={c.cardId} count={c.count} heroId={hero.id} sign="+" />
                  ))}
                  {cmp.cardsLost.map((c) => (
                    <CardLink key={`l${c.cardId}`} cardId={c.cardId} count={c.count} heroId={hero.id} sign="−" />
                  ))}
                </div>
              )}
            </>
          )}
          {why && <div className="text-[13px] text-red-300">{why}</div>}
        </div>
      )}
    </div>
  );
}
