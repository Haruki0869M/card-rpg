// ===== SVGの絵を画像（data URL）にして使い回す =====
// 生のSVG（数百の図形）をそのまま並べると、演出のたびにブラウザの再計算・再描画が重くなる。
// 絵ごとに1回だけ文字列にして <img> で表示すると、ブラウザが画像としてキャッシュするので軽い。
// （画像の中のグラデーションIDは画像ごとに独立するので、IDの衝突も起きない）

import { type ReactElement, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

const cache = new Map<string, string>();

/** React の描画処理の外でだけ呼ぶこと（起動時の準備や setTimeout の中） */
export function generateArt(key: string, render: () => ReactElement): string {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let url = '';
  try {
    const div = document.createElement('div');
    const root = createRoot(div);
    flushSync(() => root.render(render()));
    const svg = div.innerHTML;
    root.unmount();
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } catch {
    url = '';
  }
  cache.set(key, url);
  return url;
}

/** 絵の画像URL。準備済みならすぐ返し、未準備なら描画の外で作ってから表示する */
export function useArtUrl(key: string, render: () => ReactElement): string {
  const [url, setUrl] = useState(() => cache.get(key) ?? '');
  useEffect(() => {
    const hit = cache.get(key);
    if (hit !== undefined) {
      setUrl(hit);
      return;
    }
    const t = setTimeout(() => setUrl(generateArt(key, render)), 0);
    return () => clearTimeout(t);
  }, [key]);
  return url;
}

/** 画像として表示する（指での操作は親要素が受け取る） */
export function ArtImage({ src, className, cover }: { src: string; className?: string; cover?: boolean }) {
  if (!src) return <span className={className} />;
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      decoding="async"
      className={className}
      style={{ pointerEvents: 'none', WebkitUserSelect: 'none', userSelect: 'none', objectFit: cover ? 'cover' : 'contain' }}
    />
  );
}
