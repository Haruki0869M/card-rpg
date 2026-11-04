import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import App from './App';
import { prepareArt } from './art';

// 確認用: URL の末尾が #art ならアートの一覧を表示する
const ArtGallery = lazy(() => import('./art/ArtGallery'));
const showArt = location.hash === '#art';
import '@fontsource/zen-antique/400.css';
import './index.css';

// 絵を先に画像化しておく（表示中の再計算・再描画を軽くするため）
prepareArt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showArt ? (
      <Suspense fallback={null}>
        <ArtGallery />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
