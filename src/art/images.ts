// ===== 描いた絵（画像ファイル）の登録表 =====
// src/assets/art/<種類>/<ID>.webp を置くだけで使われる（例: enemy/forestWolf.webp、hero/warrior-male.webp）。
// 画像が無いものは、今までどおり SVG の絵（src/art/ の部品）で描く。
// 元画像からの加工は scripts/art/build_art.py（背景の切り抜き・顔の切り出し・WebP 化）。

const files = import.meta.glob('../assets/art/**/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const IMAGES: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) IMAGES[path.replace(/^.*\/assets\/art\//, '').replace(/\.webp$/, '')] = url;

/** 画像のURL（無ければ undefined）。key は「種類/ID」（例: 'enemy/forestWolf'） */
export const artImage = (key: string): string | undefined => IMAGES[key];

/** 種類ごとのID一覧（画像がある物） */
export const artImageIds = (kind: string) =>
  Object.keys(IMAGES)
    .filter((k) => k.startsWith(`${kind}/`))
    .map((k) => k.slice(kind.length + 1));

const loaded = new Set<string>();
/** 先に読み込んでおく（表示の瞬間に絵が欠けないように） */
export function preloadImages(keys: string[]) {
  for (const k of keys) {
    const url = IMAGES[k];
    if (!url || loaded.has(url)) continue;
    loaded.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
}

/** 起動時: 小さな絵（顔・お供・道具・宝箱・地図の場所・地形・画面の枠）はすぐ、大きな絵（全身・敵・背景）は手が空いた時に少しずつ */
export function preloadAllImages() {
  const now = Object.keys(IMAGES).filter((k) => /^(item|chest|place|terrain|ui|pet)\//.test(k) || k.endsWith('-face') || k === 'bg/title');
  preloadImages(now);
  const later = Object.keys(IMAGES).filter((k) => !now.includes(k));
  const idle: (cb: () => void) => void =
    typeof window !== 'undefined' && 'requestIdleCallback' in window ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 }) : (cb) => setTimeout(cb, 300);
  const step = () => {
    const batch = later.splice(0, 4);
    if (!batch.length) return;
    preloadImages(batch);
    idle(step);
  };
  idle(step);
}
