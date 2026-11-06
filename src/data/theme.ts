// ===== 色（レア度・カードの種類・プレイヤー）。色を変えたい時はここだけ直す =====
import type { CardCategory, PlayerId, Rarity } from '../types';

export const RARITY_COLOR: Record<Rarity, { color: string; glow: string; bg: string }> = {
  common: { color: '#d8dce6', glow: 'rgba(220,225,235,.35)', bg: 'linear-gradient(160deg,#3a3d46,#1c1d22)' },
  rare: { color: '#5ab0ff', glow: 'rgba(80,170,255,.55)', bg: 'linear-gradient(160deg,#173a66,#0b1830)' },
  epic: { color: '#c58bff', glow: 'rgba(190,120,255,.6)', bg: 'linear-gradient(160deg,#3d1c66,#170a2c)' },
  legend: { color: '#ffcf4a', glow: 'rgba(255,200,70,.7)', bg: 'linear-gradient(160deg,#5a3a08,#22140a)' },
};

/** カードの種類ごとの枠の色 */
export const CATEGORY_COLOR: Record<CardCategory, { frame: string; glow: string; inner: string }> = {
  physical: { frame: '#c24a3a', glow: '#ff7a5a', inner: 'linear-gradient(180deg,#4a1a1a 0%,#2a0e10 55%,#170809 100%)' },
  magic: { frame: '#6a5cf0', glow: '#a99bff', inner: 'linear-gradient(180deg,#24205a 0%,#141038 55%,#0a0820 100%)' },
  skill: { frame: '#3aa070', glow: '#7affc0', inner: 'linear-gradient(180deg,#13402e 0%,#0b2a1e 55%,#061710 100%)' },
};

/** プレイヤーの色（spec §20.2: P1＝青、P2＝赤、P3＝緑、P4＝黄） */
export const PLAYER_COLOR: Record<PlayerId, string> = { P1: '#4a8cff', P2: '#ff5a5a', P3: '#46d27a', P4: '#ffd04a' };
