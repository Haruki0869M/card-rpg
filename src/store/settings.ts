export interface Settings {
  fastMode: boolean;
  vibration: boolean;
  cutinMode: 'standard' | 'simple';
  /** 効果音（鳴き声・ジングルを含む）の音量 0〜10。0 = オフ（K6） */
  sfxVolume: number;
  /** BGM の音量 0〜10。0 = オフ（K6） */
  bgmVolume: number;
}

export const DEFAULT_SFX_VOLUME = 7;
export const DEFAULT_BGM_VOLUME = 5;

const volume = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(10, Math.round(v))) : fallback;

/** 古い設定の有効な値を保ち、追加項目だけ既定値で補う。 */
export function normalizeSettings(raw: unknown): Settings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>;
  return {
    fastMode: typeof s.fastMode === 'boolean' ? s.fastMode : false,
    vibration: typeof s.vibration === 'boolean' ? s.vibration : true,
    cutinMode: s.cutinMode === 'simple' ? 'simple' : 'standard',
    sfxVolume: volume(s.sfxVolume, DEFAULT_SFX_VOLUME),
    bgmVolume: volume(s.bgmVolume, DEFAULT_BGM_VOLUME),
  };
}
