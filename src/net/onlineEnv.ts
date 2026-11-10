// ===== オンラインが使えるか・エミュレーターの場所（Firebase の部品を読まずに分かる小さな関数） =====
// Firebase の本体（firebaseBackend.ts）は大きいので、オンラインを始める時だけ読み込む（1人で遊ぶ時の最初の読み込みを軽くする）。
import { hasFirebaseConfig } from './firebaseConfig';

/** URL の ?emu=1（または ?emu=ホスト名）でエミュレーターを使う */
export function emulatorFromUrl(): string | undefined {
  if (typeof location === 'undefined') return undefined;
  const v = new URLSearchParams(location.search).get('emu');
  if (v === null) return undefined;
  return v === '' || v === '1' ? location.hostname || '127.0.0.1' : v;
}

export const onlineAvailable = () => hasFirebaseConfig() || !!emulatorFromUrl();
