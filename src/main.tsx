import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import App from './App';
import { prepareArt } from './art';

// 確認用: URL の末尾が #art ならアートの一覧、#data ならデータの一覧を表示する
const ArtGallery = lazy(() => import('./art/ArtGallery'));
const DataCatalog = lazy(() => import('./components/DataCatalog'));
const showArt = location.hash === '#art';
const showData = location.hash === '#data';
import '@fontsource/zen-antique/400.css';
import './index.css';

// オンライン協力の確認用（エミュレーターにつないだ時だけ）
if (new URLSearchParams(location.search).has('emu')) void import('./dev/onlineDebug');

// 絵を先に画像化しておく（表示中の再計算・再描画を軽くするため）
prepareArt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showArt || showData ? (
      <Suspense fallback={null}>{showArt ? <ArtGallery /> : <DataCatalog />}</Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
