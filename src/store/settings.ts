export interface Settings {
  fastMode: boolean;
  vibration: boolean;
  cutinMode: 'standard' | 'simple';
}

/** 古い設定の有効な値を保ち、追加項目だけ既定値で補う。 */
export function normalizeSettings(raw: unknown): Settings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>;
  return {
    fastMode: typeof s.fastMode === 'boolean' ? s.fastMode : false,
    vibration: typeof s.vibration === 'boolean' ? s.vibration : true,
    cutinMode: s.cutinMode === 'simple' ? 'simple' : 'standard',
  };
}
