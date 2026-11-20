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

const held = new Map<string, HTMLImageElement>();
/**
 * 絵を読み込んで描ける形（decode）にし、手放さずに持っておく（通路の絵: 1歩ごとに描き直しても、絵が欠けて下地が見えないように）。
 * 何度呼んでもよい。戻り値は useEffect の後片付け用（何もしない。持ったままにする）
 */
export function holdImages(keys: string[]): () => void {
  for (const k of keys) {
    const url = IMAGES[k];
    if (!url || held.has(url)) continue;
    const img = new Image();
    img.src = url;
    img.decode?.().catch(() => {});
    held.set(url, img);
    loaded.add(url);
  }
  return () => {};
}

/** 起動時: 小さな絵（顔・お供・道具・宝箱・地図の場所・地形・画面の枠）はすぐ、大きな絵（全身・背景・通路）は手が空いた時に少しずつ。敵の絵は表示する時に読む */
export function preloadAllImages() {
  // 職業の絵（全身・顔・世界マップの駒）は職の数×男女ぶんあるので、最初から持っている4職（基本ジョブ）だけ先に読む。
  // 転職先の絵は、表示する時に読む（通信量を抑える）
  const BASE_JOBS = /^(hero|piece)\/(hunter|guardian|mage|warrior)-/;
  const isHero = (k: string) => k.startsWith('hero/') || k.startsWith('piece/');
  const now = Object.keys(IMAGES).filter((k) => /^(item|chest|place|terrain|ui|pet)\//.test(k) || (k.endsWith('-face') && (!isHero(k) || BASE_JOBS.test(k))) || k === 'bg/title');
  preloadImages(now);
  // 敵の絵は全シナリオで150枚以上・約11MBあるので、手が空いた時にも読まない（戦闘などで表示する時に読む。1枚 50〜100KB）。
  // 通路の絵（1つのダンジョンで約250KB）も、最初のダンジョン（翠の神殿）の分だけ先に読み、ほかは入った時に読む
  const lazy = (k: string) => k.startsWith('enemy/') || (k.startsWith('dungeon/') && !k.startsWith('dungeon/temple-'));
  const later = Object.keys(IMAGES).filter((k) => !now.includes(k) && !lazy(k) && (!isHero(k) || BASE_JOBS.test(k)));
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
