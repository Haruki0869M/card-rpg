import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import App from './App';

// 確認用: URL の末尾が #art ならアートの一覧を表示する
const ArtGallery = lazy(() => import('./art/ArtGallery'));
const showArt = location.hash === '#art';
import './index.css';

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
