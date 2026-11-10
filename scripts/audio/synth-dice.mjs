// 移動のサイコロの音「コロコロ…コトン」を合成で作る。素材なし・ライセンスの心配なし。
// 使い方: node scripts/audio/synth-dice.mjs [出力フォルダ=src/assets/audio/sfx]
//   sfx_world_dice.wav を書き出す（前の素材の音と入れ替え）。最後に、足音（sfx_step_stone）と大きさを比べて表示する。
// オーナーの方針: 耳にやさしく、静かに。木のサイコロが机の上を転がって、最後に「コトン」と止まる。高い音は 3kHz まで削る。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SR = 22050;
const out = process.argv[2] ?? 'src/assets/audio/sfx';
mkdirSync(out, { recursive: true });

// 同じ音が毎回できるように、決まった種の乱数（ゲームの乱数とは関係ない）
let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

/** 木を軽くたたく1音（短い雑音＋こもった響き2つ） */
function knock(freq, dur, { noise = 0.5, decay = 70 } = {}) {
  const n = Math.round(dur * SR), buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const body = Math.sin(2 * Math.PI * freq * t) + 0.45 * Math.sin(2 * Math.PI * freq * 1.62 * t) * Math.exp(-40 * t);
    buf[i] = (body + noise * rand() * Math.exp(-260 * t)) * Math.exp(-decay * t);
  }
  return buf;
}
function mix(total, parts) {
  const buf = new Float32Array(Math.round(total * SR));
  for (const [at, part, gain = 1] of parts) {
    const o = Math.round(at * SR);
    for (let i = 0; i < part.length && o + i < buf.length; i++) buf[o + i] += part[i] * gain;
  }
  return buf;
}
/** 高い所をなだらかに削り、頭と尻にフェード。ピークを peak（0〜1）にそろえる */
function finish(buf, peak) {
  const k = 1 - Math.exp((-2 * Math.PI * 3000) / SR);
  let a = 0, b = 0;
  const o = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) { a += k * (buf[i] - a); b += k * (a - b); o[i] = b; }
  const fade = Math.round(0.006 * SR);
  for (let i = 0; i < fade && i < o.length; i++) { o[i] *= i / fade; o[o.length - 1 - i] *= i / fade; }
  let p = 0; for (const v of o) p = Math.max(p, Math.abs(v));
  const g = p ? peak / p : 1;
  for (let i = 0; i < o.length; i++) o[i] *= g;
  return o;
}
function wav(buf) {
  const b = Buffer.alloc(44 + buf.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + buf.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(buf.length * 2, 40);
  buf.forEach((v, i) => b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2));
  return b;
}
function rms(buf) {
  let s = 0; for (const v of buf) s += v * v;
  return Math.sqrt(s / Math.max(1, buf.length));
}
function readWav(path) {
  const b = readFileSync(path);
  const n = (b.length - 44) / 2, o = new Float32Array(n);
  for (let i = 0; i < n; i++) o[i] = b.readInt16LE(44 + i * 2) / 32767;
  return o;
}

// コロコロ: 転がる音は、だんだん間が詰まって小さくなる（9回）。少しずつ高さを変える
const parts = [];
let at = 0.02, gap = 0.11, gain = 0.75;
for (let i = 0; i < 9; i++) {
  parts.push([at, knock(760 + (i % 3) * 70, 0.07, { noise: 0.35 }), gain]);
  at += gap;
  gap *= 0.86;
  gain *= 0.9;
}
// …コトン: 少し間をあけて、低めの音で止まる
parts.push([at + 0.12, knock(330, 0.22, { noise: 0.25, decay: 22 }), 0.95]);
const dice = finish(mix(at + 0.42, parts), 0.22);
writeFileSync(join(out, 'sfx_world_dice.wav'), wav(dice));

let stepRms = 0;
try { stepRms = rms(readWav(join(out, 'sfx_step_stone.wav'))); } catch { /* 足音が wav でない時は比べない */ }
console.log(`sfx_world_dice.wav ${dice.length / SR}s ピーク0.22 RMS ${rms(dice).toFixed(4)}${stepRms ? `（足音 ${stepRms.toFixed(4)}）` : ''}`);
