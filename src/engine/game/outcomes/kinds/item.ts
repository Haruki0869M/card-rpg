// アイテムを得る（格を指定。装備か消費アイテム）
import { RARITY_NAME } from '../../dungeon';
import { newItem, rollConsumable, rollEquipment } from '../../loot';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    item: { rarity: Rarity; slot?: 'equipment' | 'consumable' | 'accessory' };
  }
}

export const outcome: OutcomeHandler<'item'> = {
  kind: 'item',
  apply(ctx, o) {
    const def = o.slot === 'consumable' ? rollConsumable(o.rarity, ctx.rng) : rollEquipment(o.rarity, ctx.game.heroes, ctx.rng, { scenario: ctx.game.scenarioId, slot: o.slot === 'accessory' ? 'accessory' : undefined });
    ctx.loot.push({ kind: 'item', item: newItem(ctx.game, def) });
  },
  describe: (o) => `${RARITY_NAME[o.rarity]}の${o.slot === 'consumable' ? '消費アイテム' : o.slot === 'accessory' ? '装飾品' : '装備'}`,
};
