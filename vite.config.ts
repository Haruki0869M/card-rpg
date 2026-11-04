/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages では https://<user>.github.io/card-rpg/ で配信されるため base をリポジトリ名に合わせる
export default defineConfig({
  base: '/card-rpg/',
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
