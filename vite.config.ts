/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages では https://<user>.github.io/card-rpg/ で配信されるため base をリポジトリ名に合わせる
export default defineConfig({
  base: '/card-rpg/',
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // ライブラリを分けて、アプリ更新時にブラウザのキャッシュが効きやすいようにする
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/ },
            // オンラインの部品は、オンラインを始める時だけ読む（onlineStore.ts の import()）。vendor に混ぜると最初から読まれる
            { name: 'firebase', test: /node_modules[\\/](firebase|@firebase)[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
