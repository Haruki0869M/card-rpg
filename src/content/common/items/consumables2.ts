// 消耗品のうち、区切りE（2026-11-12）で残した3個（魔力の薄荷茶・閃きの薄荷茶・石粉の守り薬）。外した物は docs/tasks/lineup-phase3-gear.md §3-1
import type { ItemDef } from '../../../types';

export const consumables2: ItemDef[] = [
  {"id": "manaFocusTea", "name": "魔力の薄荷茶", "slot": "consumable", "rarity": "common", "icon": "ether", "description": "戦闘中、味方1人のフォーカスを1回復（最大値まで）。マナ+1。", "use": [{"kind": "gainFocus", "to": "target", "amount": 1}, {"kind": "gainMana", "to": "target", "amount": 1}]},
  {"id": "inspiredFocusTea", "name": "閃きの薄荷茶", "slot": "consumable", "rarity": "rare", "icon": "ether", "description": "戦闘中、味方1人のフォーカスを2回復（最大値まで）。1枚引く。", "use": [{"kind": "gainFocus", "to": "target", "amount": 2}, {"kind": "draw", "to": "target", "amount": 1}]},
  {"id": "stoneShieldPaste", "name": "石粉の守り薬", "slot": "consumable", "rarity": "rare", "icon": "potion", "description": "戦闘中、味方1人にブロック10。", "use": [{"kind": "block", "to": "target", "amount": 10}]},
];
