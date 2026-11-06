// ===== 用語（画面とログに出る言葉）。名前を変えたい時はここだけ直す =====
// 例: 以前「カオスゲージ」を「侵食度」に変えたような変更は、ここを変えれば全画面に反映される
import type { CardCategory, PlayerId, Rarity, StatId } from '../types';

export const TERMS = {
  gameTitle: 'DESTINY OF CRYSTALIA',
  gameSubtitle: 'スロット × デッキの冒険譚',
  /** 世界の侵食の度合い（spec §8.7） */
  corruption: '侵食度',
  gold: 'ゴールド',
  focus: 'フォーカス',
  mana: 'マナ',
  block: 'ブロック',
  perfect: '完全成功',
} as const;

export const STAT_LABEL: Record<StatId, string> = { str: '力', vit: '体力', int: '知力', per: '感知', dex: '器用', agi: '素早さ', luk: '運' };
export const CATEGORY_LABEL: Record<CardCategory, string> = { physical: '物理', magic: '魔法', skill: 'スキル' };
export const RARITY_NAME: Record<Rarity, string> = { common: 'コモン', rare: 'レア', epic: 'エピック', legend: 'レジェンド' };
/** 宝箱の見た目の名前（中身の格の確率を決める。spec §10.2） */
export const CHEST_NAME: Record<Rarity, string> = { common: '木箱', rare: '鉄箱', epic: '装飾箱', legend: '黄金箱' };
export const PLAYER_LABEL: Record<PlayerId, string> = { P1: 'P1', P2: 'P2', P3: 'P3', P4: 'P4' };
