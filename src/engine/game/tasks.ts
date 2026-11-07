// ===== イベントの後の作業（カードを1枚選んで強化・削除・変異 / 行商人の買い物）。設計 v2 §5 =====
import { BALANCE } from '../../data/balance';
import { CARDS } from '../../data/cards';
import { CLASSES, getClass } from '../../data/classes';
import { STAT_LABEL } from '../../data/terms';
import type { GameState, Hero } from '../../types';
import type { Rng } from '../rng';
import { addItem, addLog } from './common';
import { rarityIndex } from './dungeon';
import { STAT_IDS } from './hero';

/** 山札のカード1枚に作業をする（cardUid が無ければやめる） */
export function doCardTask(game: GameState, h: Hero, cardUid: string | undefined, rng: Rng): string | undefined {
  const task = h.cardTask;
  if (!task) return 'カードを選ぶ作業はありません';
  if (!cardUid) {
    delete h.cardTask;
    return undefined;
  }
  const idx = h.deck.findIndex((c) => c.uid === cardUid);
  if (idx < 0) return '山札にないカードです';
  const inst = h.deck[idx];
  const name = CARDS.get(inst.cardId).name;
  if (task === 'upgrade') {
    if (inst.upgraded) return 'もう強化してあります';
    inst.upgraded = true;
    addLog(game, `${h.name}の「${name}」を強化した`);
  } else if (task === 'remove') {
    if (h.deck.length <= BALANCE.minDeckSize) return `山札は${BALANCE.minDeckSize}枚より少なくできません`;
    h.deck.splice(idx, 1);
    addLog(game, `${h.name}の山札から「${name}」を外した`);
  } else {
    // 変異: 別の系統のジョブのレア以上のカードに変わり、ランダムな能力値+1
    const lin = getClass(h.classId).lineage;
    const pool = [...new Set(CLASSES.all.filter((c) => c.lineage && c.lineage !== lin).flatMap((c) => c.cardPool))].filter(
      (id) => CARDS.has(id) && rarityIndex(CARDS.get(id).rarity ?? 'common') >= 1,
    );
    if (!pool.length) return '変異できるカードがありません';
    const to = pool[rng.int(pool.length)];
    h.deck[idx] = { uid: inst.uid, cardId: to };
    const s = STAT_IDS[rng.int(STAT_IDS.length)];
    h.bonusStats[s] = (h.bonusStats[s] ?? 0) + 1;
    addLog(game, `「${name}」が「${CARDS.get(to).name}」に変異した！（${STAT_LABEL[s]}+1）`);
  }
  delete h.cardTask;
  return undefined;
}

/** 行商人の品物を買う（index が無ければ店を閉じる） */
export function peddlerBuy(game: GameState, h: Hero, kind: 'item' | 'card' | undefined, index: number | undefined): string | undefined {
  const shop = h.peddler;
  if (!shop) return '行商人はいません';
  if (index === undefined || !kind) {
    delete h.peddler;
    return undefined;
  }
  const entry = kind === 'item' ? shop.items[index] : shop.cards[index];
  if (!entry || entry.sold) return 'その品物はありません';
  if (h.gold < entry.price) return 'ゴールドが足りません';
  h.gold -= entry.price;
  entry.sold = true;
  if ('item' in entry) addLog(game, `${h.name}は行商人から${addItem(game, h, entry.item, false)}を買った（${entry.price}G）`);
  else {
    h.deck.push({ uid: `c${game.nextUid++}`, cardId: entry.cardId });
    addLog(game, `${h.name}の山札に「${CARDS.get(entry.cardId).name}」を加えた（${entry.price}G）`);
  }
  return undefined;
}
