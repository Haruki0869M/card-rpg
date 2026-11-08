// 音の素材（.ogg など）を調べる・ゲーム用の WAV に変える（K6）。ffmpeg が無くても動くよう、Playwright の Chromium で解読する。
// 使い方:
//   node scripts/audio/convert-ogg.mjs analyze <素材フォルダ> <結果.json>
//     → 各ファイルの長さ・ピーク・平均の大きさ・音の高さの上がり下がりを JSON に書く（耳で聞けないので、選ぶ手がかりにする）
//   node scripts/audio/convert-ogg.mjs convert <素材フォルダ> <対応表.json> <出力フォルダ>
//     → 対応表 { "sfx_ui_tap": "ui-audio/click1.ogg", ... } のとおりに、モノラル 22.05kHz 16bit の WAV にして書き出す
//       （頭と尻の無音を切り、ピークを −3dB にそろえる。gain を付けた表 { id: { file, gain } } なら、その倍率も掛ける）
// 環境変数: NODE_PATH・PLAYWRIGHT_BROWSERS_PATH（docs/STATUS.md の手順と同じ）
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const require = createRequire(execSync('npm root -g').toString().trim() + '/');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire(import.meta.url)('playwright')); }

const [mode, src, arg3, arg4] = process.argv.slice(2);
const SR = 22050;

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ogg|mp3|wav|m4a)$/i.test(f) ? [p] : [];
  });
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');

/** ページの中で解読して、モノラル 22.05kHz の数値の並びと特徴を返す */
async function decode(file) {
  const b64 = readFileSync(file).toString('base64');
  return page.evaluate(async ({ b64, SR }) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const tmp = new OfflineAudioContext(1, 1, 44100);
    const buf = await tmp.decodeAudioData(bytes.buffer);
    const off = new OfflineAudioContext(1, Math.ceil(buf.duration * SR) + 1, SR);
    const s = off.createBufferSource(); s.buffer = buf; s.connect(off.destination); s.start();
    const r = await off.startRendering();
    let d = r.getChannelData(0);
    // 無音（−50dB 未満）を頭と尻から切る
    const th = 0.00316;
    let a = 0, e = d.length - 1;
    while (a < d.length && Math.abs(d[a]) < th) a++;
    while (e > a && Math.abs(d[e]) < th) e--;
    d = d.slice(Math.max(0, a - 40), Math.min(d.length, e + 200));
    let peak = 0, sum = 0;
    for (const v of d) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
    // 前と後ろの2割の、ゼロ交差の多さ（音の高さのおおまかな目安）
    const zcr = (x) => { let z = 0; for (let i = 1; i < x.length; i++) if ((x[i - 1] < 0) !== (x[i] < 0)) z++; return (z * SR) / (2 * Math.max(1, x.length)); };
    const k = Math.max(1, Math.floor(d.length * 0.2));
    return { samples: Array.from(d), duration: d.length / SR, peak, rms: Math.sqrt(sum / Math.max(1, d.length)), pitchStart: zcr(d.slice(0, k)), pitchEnd: zcr(d.slice(-k)) };
  }, { b64, SR });
}

function wav(samples, gain = 1) {
  let peak = 0; for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const g = (peak ? 0.708 / peak : 1) * gain;
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * g * 32767))), 44 + i * 2));
  return b;
}

if (mode === 'analyze') {
  const out = {};
  for (const f of walk(src)) {
    const { samples, ...info } = await decode(f);
    out[relative(src, f).replaceAll('\\', '/')] = { duration: +info.duration.toFixed(3), peakDb: +(20 * Math.log10(info.peak || 1e-9)).toFixed(1), rmsDb: +(20 * Math.log10(info.rms || 1e-9)).toFixed(1), pitchStart: Math.round(info.pitchStart), pitchEnd: Math.round(info.pitchEnd) };
  }
  writeFileSync(arg3, JSON.stringify(out, null, 1));
  console.log(`analyzed ${Object.keys(out).length}`);
} else if (mode === 'convert') {
  const map = JSON.parse(readFileSync(arg3, 'utf8'));
  mkdirSync(arg4, { recursive: true });
  for (const [id, v] of Object.entries(map)) {
    const { file, gain = 1 } = typeof v === 'string' ? { file: v } : v;
    const { samples } = await decode(join(src, file));
    const dir = join(arg4, id.startsWith('pet_') ? 'pet' : id.startsWith('bgm_') ? 'bgm' : 'sfx');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${id}.wav`), wav(samples, gain));
    console.log(`${id} <- ${file}`);
  }
} else {
  console.log('使い方: analyze <素材フォルダ> <結果.json> / convert <素材フォルダ> <対応表.json> <出力フォルダ>');
}
await browser.close();
