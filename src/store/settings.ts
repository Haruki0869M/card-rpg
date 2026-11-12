import { clampZoom, ZOOM_FLOOR } from '../components/world/mapZoom';

export interface Settings {
  fastMode: boolean;
  vibration: boolean;
  cutinMode: 'standard' | 'simple';
  /** 効果音（鳴き声・ジングルを含む）の音量 0〜10。0 = オフ（K6） */
  sfxVolume: number;
  /** BGM の音量 0〜10。0 = オフ（K6） */
  bgmVolume: number;
  /** お供の鳴き声の音量 0〜10。0 = オフ（K6。高い声なので効果音と分けて小さめ） */
  petVolume: number;
  /** はじめての戦闘の案内（Step A ④）。未設定 = この端末で初めて（戦闘に勝ったことが無ければ出す）。最後まで見るか×で false */
  firstGuide?: boolean;
  /** 世界マップの拡大（1〜2.5倍。この端末だけ。冒険の保存データには入れない） */
  worldZoom: number;
}

export const DEFAULT_SFX_VOLUME = 5;
export const DEFAULT_BGM_VOLUME = 4;
export const DEFAULT_PET_VOLUME = 3;

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
    petVolume: volume(s.petVolume, DEFAULT_PET_VOLUME),
    // 広い地図（段階6a）では1倍より小さくできるので、設定には ZOOM_FLOOR まで残す（地図ごとの下限は地図の画面で掛ける）
    worldZoom: clampZoom(s.worldZoom, ZOOM_FLOOR),
    ...(typeof s.firstGuide === 'boolean' ? { firstGuide: s.firstGuide } : {}),
  };
}
