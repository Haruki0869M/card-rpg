// ===== カードを押してから決める「説明の窓」（報酬・店で共通。フェーズ3 項目2） =====
// カードを押すと、カードの下にこの窓が開く。決めるのは窓の中のボタンだけ（押し間違いを防ぐ）。
// 窓の外（カード以外）を押すと閉じる。別のカードを押すと、そちらに切り替わる。
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { describeAbility } from '../../engine';
import type { CardDef } from '../../types';
import { CATEGORY_LABEL, cardSummary, longEffect, tierTitle } from '../format';
import { RARITY_STYLE } from './game';

export function CardPickPanel({ card, chance, who, action, disabled, note, onAction, onClose }: {
  card: CardDef;
  /** このキャラの成功率（%） */
  chance: number;
  /** 誰のカードか（例: 「レオンの成功率」） */
  who: string;
  /** 決めるボタンの文字（「このカードを選ぶ」「60Gで買う」） */
  action: React.ReactNode;
  disabled?: boolean;
  /** ボタンの下の小さな注意（お金が足りないなど） */
  note?: string;
  onAction: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // 開いたら窓が見える所まで送る。窓の外（カード以外）を押したら閉じる
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [card.id]);
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t || ref.current?.contains(t) || t.closest('[data-pick-card]')) return;
      onClose();
    };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, [onClose]);
  const rarity = card.rarity ?? 'common';
  return (
    <motion.div
      ref={ref}
      key={card.id}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
      className="panel panel-gold-edge relative mt-2 rounded-xl p-2.5 text-left"
      data-card-pick-panel={card.id}
    >
      <button onClick={onClose} aria-label="説明を閉じる" className="btn btn-dark absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-full">
        <X size={16} />
      </button>
      <div className="pr-12">
        <div className="font-display text-[17px] leading-6 text-amber-50">
          {card.name}
          <span className="ml-1.5 align-middle text-[12px]" style={{ color: RARITY_STYLE[rarity].color }}>
            {RARITY_STYLE[rarity].name}
          </span>
        </div>
        <div className="text-[14px] leading-5 font-bold text-amber-200" data-card-summary>
          {cardSummary(card)}
        </div>
        <div className="text-[12px] leading-4 text-zinc-400">
          {CATEGORY_LABEL[card.category]}・コスト{card.cost}・{card.slots}枠・{who} <b className="text-emerald-300">{chance}%</b>
        </div>
      </div>
      <div className="mt-1.5 flex flex-col gap-0.5 rounded-lg bg-black/35 px-2 py-1.5 text-[12px] leading-[17px] text-zinc-200">
        {card.tiers.map((t, i) => (
          <div key={i}>
            <span className="text-amber-200/90">{tierTitle(card, i)}：</span>
            {t.effects.length ? t.effects.map((e) => longEffect(e, card)).join('、') : '効果なし'}
          </div>
        ))}
        {card.trait && (
          <div className="text-violet-200">
            《{card.trait.name}》{describeAbility(card.trait)}
          </div>
        )}
        {card.exhaust && <div className="text-zinc-400">使うと、この戦闘の間は山札から除く</div>}
      </div>
      <button disabled={disabled} onClick={onAction} className="btn btn-gold font-display mt-2 flex h-12 w-full items-center justify-center gap-1 rounded-xl text-[17px] disabled:opacity-40" data-card-pick-action>
        {action}
      </button>
      {note && <div className="mt-1 text-center text-[12px] text-zinc-400">{note}</div>}
    </motion.div>
  );
}
