// BGM をゲーム用に変換する（K6）。ffmpeg が無くても動くよう、Playwright の Chromium（WebCodecs）で AAC にする。
// 使い方: node scripts/audio/convert-bgm.mjs <元のファイル(mp3など)> <ID(bgm_town など)> <出力フォルダ> [kbps=96] [gain=1]
//   → <出力フォルダ>/<ID>.aac（ADTS の AAC、ステレオ 44.1kHz）と、<出力フォルダ>/loops.json の <ID> の行
//      loops.json = { "<ID>": { "start": 秒, "end": 秒 } }（AAC の頭の無音の長さの記録。今の player は audio 要素の loop を使うので参考用。
//      ゲームのフォルダには置かない＝出力フォルダを src の外にして、.aac だけを src/assets/audio/bgm/ に写す）
// 変換するのは OpenTracks の規約（変換せずに置かない）に合わせるためと、ファイルを小さくするため。
// 元のファイル（ダウンロードした原本）はリポジトリに入れない。
// 環境変数: NODE_PATH・PLAYWRIGHT_BROWSERS_PATH（docs/STATUS.md の手順と同じ）
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { join } from 'node:path';

const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const { chromium } = require('playwright');
const [input, id, outDir, kbps = '96', gainArg = '1'] = process.argv.slice(2);
if (!input || !id || !outDir) { console.log('使い方: <元のファイル> <ID> <出力フォルダ> [kbps] [gain]'); process.exit(1); }

// WebCodecs は安全なページ（localhost）でしか使えないので、空のページを出す
const srv = http.createServer((_, r) => { r.setHeader('content-type', 'text/html'); r.end('<!doctype html><title>bgm</title>'); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${srv.address().port}/`);

const result = await page.evaluate(async ({ b64, bitrate, gain }) => {
  const SR = 44100;
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const tmp = new OfflineAudioContext(2, 1, SR);
  const src = await tmp.decodeAudioData(bytes.buffer);
  const off = new OfflineAudioContext(2, Math.ceil(src.duration * SR), SR);
  const s = off.createBufferSource(); s.buffer = src; s.connect(off.destination); s.start();
  const pcm = await off.startRendering();
  const L = pcm.getChannelData(0), R = pcm.getChannelData(1), n = L.length;
  // 音量: ピークを −1dB に（gain を掛ける）
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = (peak ? 0.891 / peak : 1) * gain;
  const chunks = [];
  const enc = new AudioEncoder({ output: (c) => { const b = new Uint8Array(c.byteLength); c.copyTo(b); chunks.push(b); }, error: (e) => { throw e; } });
  enc.configure({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 2, bitrate, aac: { format: 'adts' } });
  const FR = 4096;
  for (let o = 0; o < n; o += FR) {
    const len = Math.min(FR, n - o), data = new Float32Array(len * 2);
    for (let i = 0; i < len; i++) { data[i] = L[o + i] * g; data[len + i] = R[o + i] * g; }
    enc.encode(new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round((o / SR) * 1e6), data }));
  }
  await enc.flush();
  const total = chunks.reduce((a, c) => a + c.length, 0), all = new Uint8Array(total);
  let p = 0; for (const c of chunks) { all.set(c, p); p += c.length; }
  // できた AAC をもう一度解読して、頭の無音（エンコーダーの遅れ）の長さを測る → ループの継ぎ目
  const dec = await new OfflineAudioContext(2, 1, SR).decodeAudioData(all.buffer.slice(0));
  const D = dec.getChannelData(0);
  const firstAbove = (x, th) => { for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > th) return i; return 0; };
  const th = 0.01;
  const offset = Math.max(0, firstAbove(D, th * g) - firstAbove(L, th));
  let bin = ''; for (let i = 0; i < all.length; i += 0x8000) bin += String.fromCharCode(...all.subarray(i, i + 0x8000));
  return { aac: btoa(bin), seconds: n / SR, start: offset / SR, end: (offset + n) / SR, decoded: dec.duration };
}, { b64: readFileSync(input).toString('base64'), bitrate: Number(kbps) * 1000, gain: Number(gainArg) });

await browser.close();
srv.close();
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `${id}.aac`), Buffer.from(result.aac, 'base64'));
const loopsFile = join(outDir, 'loops.json');
const loops = existsSync(loopsFile) ? JSON.parse(readFileSync(loopsFile, 'utf8')) : {};
loops[id] = { start: +result.start.toFixed(5), end: +Math.min(result.end, result.decoded).toFixed(5) };
writeFileSync(loopsFile, JSON.stringify(loops, null, 1) + '\n');
console.log(`${id}: ${result.seconds.toFixed(1)}秒 → ${(Buffer.from(result.aac, 'base64').length / 1e6).toFixed(2)}MB（ループ ${loops[id].start}〜${loops[id].end}秒）`);
