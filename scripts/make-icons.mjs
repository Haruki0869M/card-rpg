// PWAアイコン（PNG）を、タイトル画面の絵（月とお城と仲間）から切り出して作る: node scripts/make-icons.mjs
// 2026-11-09 オーナーが案Aを選んだ（月・お城の塔・4人の仲間の上半身が入る 600×600 の切り出し。絵の上から280px）。
// ffmpeg を使う（パソコンに入っている物）。
import { execFileSync } from 'node:child_process';

const SRC = 'src/assets/art/bg/title.webp';
const CROP = 'crop=600:600:0:280';
const make = (size, out) =>
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', SRC, '-vf', `${CROP},scale=${size}:${size}:flags=lanczos`, '-frames:v', '1', out]);

make(192, 'public/icon-192.png');
make(512, 'public/icon-512.png');
// Android が丸などに切り抜く用。絵が四角いっぱいまであるので、同じ切り出しを使う（大事な塔と仲間は真ん中寄り）
make(512, 'public/icon-maskable-512.png');
console.log('アイコンを作った: public/icon-192.png・icon-512.png・icon-maskable-512.png');
