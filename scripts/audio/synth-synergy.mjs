// 連携・ジョブの能力の音を合成で作る（Step C）。素材なし・ライセンスの心配なし。
// 使い方: node scripts/audio/synth-synergy.mjs [出力フォルダ=src/assets/audio/sfx]
//   sfx_battle_combo.wav（連携: やわらかい2音「ポロン」）・sfx_battle_ability.wav（ジョブの能力: 小さな鈴の余韻）を書き出す。
//   最後に、殴った音（sfx_hit_small・sfx_hit_mid）と大きさを比べて表示する（新しい音のほうが小さいこと）。
// オーナーの方針: 耳にやさしく、静かに。高すぎる音は使わない（1.3kHz まで）。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SR = 22050;
const out = process.argv[2] ?? 'src/assets/audio/sfx';
mkdirSync(out, { recursive: true });

/** やわらかい鐘のような1音（倍音は少しだけ。立ち上がりを丸く、余韻は指数で消える） */
function bell(dur, freq, { harm = [1, 0.18, 0.05], attack = 0.012, decay = 6 } = {}) {
  const n = Math.round(dur * SR), buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    harm.forEach((h, k) => { s += h * Math.sin(2 * Math.PI * freq * (k + 1) * t) * Math.exp(-decay * (k + 1) * 0.6 * t); });
    const a = t < attack ? Math.sin((Math.PI / 2) * (t / attack)) : 1;
    buf[i] = s * a * Math.exp(-decay * t);
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
  const k = 1 - Math.exp((-2 * Math.PI * 3500) / SR);
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

// 連携: 下から上へ、やさしい2音（ミ→ラ。880Hz と 1175Hz）
const combo = finish(mix(0.36, [[0, bell(0.2, 880, { decay: 9 }), 0.8], [0.09, bell(0.27, 1175, { decay: 8 }), 1]]), 0.2);
// ジョブの能力: 少し低めの、ふわっと広がる1音（660Hz に 5度上を薄く重ねる）
const ability = finish(mix(0.4, [[0, bell(0.4, 660, { attack: 0.03, decay: 7, harm: [1, 0.12] }), 1], [0.02, bell(0.36, 990, { attack: 0.03, decay: 8, harm: [1] }), 0.35]]), 0.18);
writeFileSync(join(out, 'sfx_battle_combo.wav'), wav(combo));
writeFileSync(join(out, 'sfx_battle_ability.wav'), wav(ability));

// ---------- 大きさの比べ方（16bit の WAV のピーク・平均の大きさ） ----------
function level(file) {
  const b = readFileSync(file);
  let off = 12, data = null, bits = 16;
  while (off < b.length - 8) {
    const id = b.toString('ascii', off, off + 4), size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') bits = b.readUInt16LE(off + 22);
    if (id === 'data') { data = b.subarray(off + 8, off + 8 + size); break; }
    off += 8 + size + (size % 2);
  }
  if (!data || bits !== 16) return null;
  let peak = 0, sum = 0; const n = data.length / 2;
  for (let i = 0; i < n; i++) { const v = data.readInt16LE(i * 2) / 32768; peak = Math.max(peak, Math.abs(v)); sum += v * v; }
  const db = (x) => (20 * Math.log10(Math.max(1e-9, x))).toFixed(1);
  return `ピーク ${db(peak)}dB・平均 ${db(Math.sqrt(sum / n))}dB`;
}
for (const id of ['sfx_battle_combo', 'sfx_battle_ability', 'sfx_hit_small', 'sfx_hit_mid', 'sfx_pet_cutin']) {
  try { console.log(id, level(join(out, `${id}.wav`))); } catch { console.log(id, '（ファイルなし）'); }
}
