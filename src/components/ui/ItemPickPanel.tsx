// ===== 装備を押してから決める「説明の窓」（回2: 町の売却。カードの CardPickPanel と同じ形） =====
// 装備を押すと、その下にこの窓が開く。中身は装備の詳細の窓（ItemDetailContent）と同じ物。
// 今そのキャラが同じ部位に着けている装備との違いも、詳細の窓と同じ形で出す。決めるのは窓の中のボタンだけ。
// 窓の外（装備の行以外）を押すと閉じる。別の装備を押すと、そちらに切り替わる。
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Hero } from '../../types';
import { ItemDetailContent } from '../ItemDetail';

export function ItemPickPanel({ itemId, itemUid, hero, action, disabled, note, onAction, onClose }: {
  itemId: string;
  itemUid?: string;
  /** 持ち主（今の装備と比べる） */
  hero: Hero;
  /** 決めるボタンの文字（「〇Gで売る」） */
  action: React.ReactNode;
  disabled?: boolean;
  /** ボタンの下の小さな注意 */
  note?: string;
  onAction: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  // 開いたら、決めるボタン（窓の下の端）が見える所まで送る（窓が見える欄より高くても、ボタンを欄の外に出さない）。
  // 窓の外（装備の行以外）を押したら閉じる
  useEffect(() => {
    (actionRef.current ?? ref.current)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [itemUid, itemId]);
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t || ref.current?.contains(t) || t.closest('[data-pick-item]') || t.closest('[data-detail-popup]')) return;
      onClose();
    };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, [onClose]);
  return (
    <motion.div
      ref={ref}
      key={itemUid ?? itemId}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
      className="panel panel-gold-edge relative mt-1 rounded-xl p-2.5 text-left"
      data-item-pick-panel={itemUid ?? itemId}
    >
      <button onClick={onClose} aria-label="説明を閉じる" className="btn btn-dark absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-full">
        <X size={16} />
      </button>
      <div className="pr-12">
        <ItemDetailContent d={{ type: 'item', itemId, heroId: hero.id, itemUid }} hero={hero} />
      </div>
      <div ref={actionRef}>
        <button disabled={disabled} onClick={onAction} className="btn btn-gold font-display mt-2 flex h-12 w-full items-center justify-center gap-1 rounded-xl text-[17px] disabled:opacity-40" data-item-pick-action>
          {action}
        </button>
        {note && <div className="mt-1 text-center text-[12px] text-zinc-400">{note}</div>}
      </div>
    </motion.div>
  );
}
