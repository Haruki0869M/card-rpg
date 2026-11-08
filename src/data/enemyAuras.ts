// 亜種の敵の足元のオーラ（K3）。色で亜種と元の敵を見分ける。属性の色に合わせる
export const ENEMY_AURAS: Record<string, { name: string; color: string }> = {
  ember: { name: '炎', color: '#ff6a3a' },
  frost: { name: '氷', color: '#7fd8ff' },
  storm: { name: '雷', color: '#ffe14a' },
  venom: { name: '毒', color: '#9be04a' },
  shadow: { name: '闇', color: '#a45cff' },
  holy: { name: '聖', color: '#fff2b0' },
  blood: { name: '血', color: '#e0334a' },
  iron: { name: '鋼', color: '#b8c4d8' },
};
export const AURA_IDS = Object.keys(ENEMY_AURAS);
