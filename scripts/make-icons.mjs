// PWAアイコン（PNG）を生成する: node scripts/make-icons.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
// 開発環境にインストール済みの Playwright を使う（プロジェクトの依存には入れない）
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const { chromium } = require('playwright');
import { writeFileSync } from 'node:fs';

const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="80%">
      <stop offset="0" stop-color="#3a2742"/><stop offset="1" stop-color="#0d0b10"/>
    </radialGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7f1d1d"/><stop offset="1" stop-color="#1c1917"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 270) scale(${pad})">
    <rect x="-150" y="-190" width="190" height="270" rx="20" fill="#1e1b4b" stroke="#818cf8" stroke-width="8" transform="rotate(-14)"/>
    <rect x="-95" y="-185" width="190" height="270" rx="20" fill="url(#card)" stroke="#f5c542" stroke-width="10"/>
    <g fill="#f5c542">
      <rect x="-62" y="-60" width="34" height="34" transform="rotate(45 -45 -43)"/>
      <rect x="-17" y="-60" width="34" height="34" transform="rotate(45 0 -43)"/>
      <rect x="28" y="-60" width="34" height="34" transform="rotate(45 45 -43)" opacity=".35"/>
    </g>
    <text x="0" y="60" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="74" fill="#fde68a">75%</text>
  </g>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, pad] of [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.78],
]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>body{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg(pad)}`);
  writeFileSync(`public/${name}`, await page.screenshot({ omitBackground: false }));
}
await browser.close();
console.log('icons written');
