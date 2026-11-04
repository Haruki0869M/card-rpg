import type { CardDef } from '../../types';
import { createRegistry } from '../registry';
import { BASIC_CARDS } from './basic';

/** カードの登録表。カードを増やすときはファイルを追加してここに並べる */
export const CARDS = createRegistry<CardDef>('card', [...Object.values(BASIC_CARDS)]);

export const getCard = (id: string) => CARDS.get(id);
