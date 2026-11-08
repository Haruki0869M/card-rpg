// お供の鳴き声を合成で作る（K6）。かわいくデフォルメした短い声（docs/audio-list.md §5）。
// 使い方: node scripts/audio/synth-pets.mjs <出力フォルダ> [a|b|all]
//   pet_okame_a.wav / pet_okame_b.wav … を書き出す（a・b は同じお供の別案）。
// ゲームの乱数とは無関係（このスクリプトの中だけの、固定の種の乱数を使う）。
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SR = 44100;
const out = process.argv[2] ?? 'pet-cries';
const which = process.argv[3] ?? 'all';
mkdirSync(out, { recursive: true });

// ---------- 小さな音の部品 ----------
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const lerp = (a, b, t) => a + (b - a) * t;
/** 区切りの点を通る線（[時刻0〜1, 値] の並び） */
const curve = (pts) => (t) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (t - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
  return pts[pts.length - 1][1];
};
/** 立ち上がり a 秒・余韻 r 秒の音量の山 */
const env = (t, dur, a, r) => (t < a ? t / a : t > dur - r ? Math.max(0, (dur - t) / r) : 1);

/**
 * 1つの声（口笛のような音）。freq(t) と amp(t) は 0〜1 の時刻で決める。
 * harm = 倍音の強さ、vib = 震え（Hz, 深さ）、noise = 息の混ざり、rasp = ざらつき
 */
function voice(dur, { freq, amp = () => 1, harm = [1], vib = [0, 0], noise = 0, rasp = 0, a = 0.01, r = 0.04 }) {
  const n = Math.round(dur * SR), buf = new Float32Array(n);
  let ph = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, u = t / dur;
    const f = freq(u) * (1 + vib[1] * Math.sin(2 * Math.PI * vib[0] * t));
    ph += (2 * Math.PI * f) / SR;
    let s = 0;
    harm.forEach((h, k) => { s += h * Math.sin(ph * (k + 1)); });
    s /= harm.reduce((x, y) => x + y, 0);
    if (rasp) s *= 1 - rasp + rasp * Math.abs(Math.sin(2 * Math.PI * 70 * t));
    if (noise) { lp += 0.25 * ((rnd() * 2 - 1) - lp); s = s * (1 - noise) + lp * noise * 2.5; }
    buf[i] = s * amp(u) * env(t, dur, a, r);
  }
  return buf;
}
/** いくつかの声を、時刻をずらして重ねる */
function mix(total, parts) {
  const buf = new Float32Array(Math.round(total * SR));
  for (const [at, part, gain = 1] of parts) {
    const o = Math.round(at * SR);
    for (let i = 0; i < part.length && o + i < buf.length; i++) buf[o + i] += part[i] * gain;
  }
  return buf;
}
/** ピークを −3dB にそろえて 16bit の WAV にする */
function wav(buf) {
  let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const g = peak ? 0.708 / peak : 1;
  const b = Buffer.alloc(44 + buf.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + buf.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(buf.length * 2, 40);
  buf.forEach((v, i) => b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * g * 32767))), 44 + i * 2));
  return b;
}

// ---------- 12種の声（a・b の2案） ----------
const whistle = [1, 0.12, 0.04];
const PETS = {
  // オカメインコ: 上がって下がる2音の口笛「ピーヨ」
  okame: {
    a: () => mix(0.8, [[0, voice(0.28, { freq: curve([[0, 2300], [0.7, 3100], [1, 3200]]), harm: whistle, vib: [9, 0.01] })], [0.32, voice(0.42, { freq: curve([[0, 3000], [0.4, 2700], [1, 2050]]), harm: whistle, vib: [7, 0.012] })]]),
    b: () => mix(0.75, [[0, voice(0.22, { freq: curve([[0, 2600], [1, 3400]]), harm: whistle, vib: [11, 0.008] })], [0.25, voice(0.15, { freq: curve([[0, 3300], [1, 3500]]), harm: whistle })], [0.43, voice(0.3, { freq: curve([[0, 3200], [1, 2300]]), harm: whistle, vib: [8, 0.01] })]]),
  },
  // 子狼: 小さく高い「アウー」
  wolf: {
    a: () => voice(0.8, { freq: curve([[0, 520], [0.35, 900], [0.75, 820], [1, 600]]), harm: [1, 0.5, 0.25, 0.12], vib: [5.5, 0.02], noise: 0.08, a: 0.06, r: 0.2 }),
    b: () => mix(0.8, [[0, voice(0.18, { freq: curve([[0, 700], [1, 950]]), harm: [1, 0.45, 0.2], noise: 0.1 })], [0.22, voice(0.55, { freq: curve([[0, 820], [0.3, 1000], [1, 640]]), harm: [1, 0.45, 0.2, 0.1], vib: [6, 0.025], noise: 0.06, r: 0.18 })]]),
  },
  // 黒猫: やわらかい「にゃ」（声の形が「い→あ」に開く）
  cat: {
    a: () => voice(0.55, { freq: curve([[0, 620], [0.3, 760], [1, 520]]), harm: [0.6, 1, 0.8, 0.5, 0.3, 0.15], amp: curve([[0, 0.6], [0.3, 1], [1, 0.8]]), vib: [6, 0.015], a: 0.03, r: 0.16 }),
    b: () => voice(0.45, { freq: curve([[0, 820], [0.25, 900], [1, 640]]), harm: [0.7, 1, 0.6, 0.35, 0.15], vib: [7, 0.012], a: 0.02, r: 0.14 }),
  },
  // 子亀: 実際は鳴かないので、ゴムのような小さな「ぷぃ」
  turtle: {
    a: () => voice(0.32, { freq: curve([[0, 1250], [0.5, 900], [1, 700]]), harm: [1, 0.3, 0.1], a: 0.005, r: 0.12 }),
    b: () => mix(0.5, [[0, voice(0.14, { freq: curve([[0, 1000], [1, 820]]), harm: [1, 0.3] })], [0.18, voice(0.2, { freq: curve([[0, 1100], [1, 760]]), harm: [1, 0.3] })]]),
  },
  // 小竜: キュッと鳴く小さな声に、少しだけざらつき
  dragon: {
    a: () => voice(0.7, { freq: curve([[0, 1100], [0.3, 1700], [0.6, 1550], [1, 1250]]), harm: [1, 0.5, 0.3, 0.15], rasp: 0.35, vib: [8, 0.02], a: 0.02, r: 0.2 }),
    b: () => mix(0.75, [[0, voice(0.25, { freq: curve([[0, 1300], [1, 1900]]), harm: [1, 0.4, 0.2], rasp: 0.3 })], [0.3, voice(0.4, { freq: curve([[0, 1800], [0.4, 2000], [1, 1400]]), harm: [1, 0.4, 0.2], rasp: 0.25, vib: [9, 0.02] })]]),
  },
  // うさぎ: 小さな「ぷぅ」と鼻をすんすん
  rabbit: {
    a: () => mix(0.55, [[0, voice(0.06, { freq: () => 4000, noise: 0.9 }), 0.35], [0.09, voice(0.06, { freq: () => 4000, noise: 0.9 }), 0.35], [0.2, voice(0.3, { freq: curve([[0, 900], [1, 760]]), harm: [1, 0.3, 0.1], r: 0.12 })]]),
    b: () => voice(0.4, { freq: curve([[0, 1150], [0.4, 1250], [1, 950]]), harm: [1, 0.25], noise: 0.12, a: 0.01, r: 0.15 }),
  },
  // フクロウ: やさしい「ホーホー」
  owl: {
    a: () => mix(0.9, [[0, voice(0.3, { freq: curve([[0, 430], [0.3, 470], [1, 440]]), harm: [1, 0.15], noise: 0.12, a: 0.05, r: 0.12 })], [0.42, voice(0.42, { freq: curve([[0, 470], [0.3, 500], [1, 420]]), harm: [1, 0.15], noise: 0.12, a: 0.05, r: 0.2 })]]),
    b: () => mix(0.9, [[0, voice(0.2, { freq: () => 520, harm: [1, 0.12], noise: 0.1, a: 0.04 })], [0.26, voice(0.16, { freq: () => 560, harm: [1, 0.12], noise: 0.1, a: 0.03 })], [0.5, voice(0.38, { freq: curve([[0, 540], [1, 460]]), harm: [1, 0.12], noise: 0.1, a: 0.05, r: 0.2 })]]),
  },
  // 子狐: 高く短い「コンッ」
  fox: {
    a: () => voice(0.32, { freq: curve([[0, 900], [0.25, 1500], [1, 800]]), harm: [1, 0.6, 0.3, 0.15], noise: 0.06, a: 0.004, r: 0.12 }),
    b: () => mix(0.7, [[0, voice(0.2, { freq: curve([[0, 1000], [0.3, 1600], [1, 900]]), harm: [1, 0.6, 0.3], a: 0.004, r: 0.08 })], [0.28, voice(0.25, { freq: curve([[0, 1100], [0.3, 1700], [1, 850]]), harm: [1, 0.6, 0.3], a: 0.004, r: 0.1 })]]),
  },
  // 文鳥: 鈴のような短いさえずり（オカメインコとはっきり違う、高く澄んだ音）
  bunting: {
    a: () => mix(0.7, [[0, voice(0.09, { freq: curve([[0, 4200], [1, 3900]]), harm: [1, 0.05], a: 0.002, r: 0.06 })], [0.13, voice(0.09, { freq: curve([[0, 4400], [1, 4100]]), harm: [1, 0.05], a: 0.002, r: 0.06 })], [0.28, voice(0.3, { freq: curve([[0, 4600], [1, 3800]]), harm: [1, 0.05], vib: [22, 0.015], a: 0.002, r: 0.2 })]]),
    b: () => mix(0.6, [[0, voice(0.07, { freq: () => 3900, harm: [1, 0.05], a: 0.002, r: 0.05 })], [0.1, voice(0.07, { freq: () => 4300, harm: [1, 0.05], a: 0.002, r: 0.05 })], [0.2, voice(0.07, { freq: () => 4700, harm: [1, 0.05], a: 0.002, r: 0.05 })], [0.32, voice(0.22, { freq: curve([[0, 4500], [1, 4000]]), harm: [1, 0.05], a: 0.002, r: 0.15 })]]),
  },
  // セキセイインコ: ぺちゃくちゃと速いおしゃべり（言葉には聞こえない）
  budgie: {
    a: () => { seed = 777; const parts = []; let t = 0; for (let k = 0; k < 9; k++) { const f0 = 2200 + rnd() * 1600, f1 = 2200 + rnd() * 1600, d = 0.05 + rnd() * 0.05; parts.push([t, voice(d, { freq: curve([[0, f0], [1, f1]]), harm: [1, 0.3, 0.1], a: 0.003, r: 0.02 })]); t += d + 0.015; } return mix(t + 0.05, parts); },
    b: () => { seed = 4242; const parts = []; let t = 0; for (let k = 0; k < 7; k++) { const f0 = 2600 + rnd() * 1400, f1 = 2400 + rnd() * 1800, d = 0.06 + rnd() * 0.06; parts.push([t, voice(d, { freq: curve([[0, f0], [1, f1]]), harm: [1, 0.25], vib: [30, 0.02], a: 0.003, r: 0.02 })]); t += d + 0.02; } return mix(t + 0.05, parts); },
  },
  // シマエナガ: とても高く小さな「チチッ」
  nagae: {
    a: () => mix(0.45, [[0, voice(0.05, { freq: curve([[0, 6800], [1, 6200]]), harm: [1], a: 0.002, r: 0.03 })], [0.08, voice(0.05, { freq: curve([[0, 7000], [1, 6300]]), harm: [1], a: 0.002, r: 0.03 })], [0.2, voice(0.12, { freq: curve([[0, 6500], [1, 7200]]), harm: [1], a: 0.002, r: 0.06 })]]),
    b: () => mix(0.5, [[0, voice(0.18, { freq: curve([[0, 6000], [1, 6900]]), harm: [1], vib: [40, 0.02], a: 0.003, r: 0.08 })], [0.24, voice(0.06, { freq: () => 7100, harm: [1], a: 0.002, r: 0.04 })], [0.33, voice(0.06, { freq: () => 7300, harm: [1], a: 0.002, r: 0.04 })]]),
  },
  // レッサーパンダ: きゅっきゅっと笛のような声
  redpanda: {
    a: () => mix(0.7, [[0, voice(0.15, { freq: curve([[0, 1800], [1, 2300]]), harm: [1, 0.3, 0.1], noise: 0.08, a: 0.005, r: 0.05 })], [0.2, voice(0.15, { freq: curve([[0, 1900], [1, 2400]]), harm: [1, 0.3, 0.1], noise: 0.08, a: 0.005, r: 0.05 })], [0.4, voice(0.25, { freq: curve([[0, 2300], [1, 1700]]), harm: [1, 0.3, 0.1], noise: 0.08, vib: [14, 0.02], a: 0.005, r: 0.1 })]]),
    b: () => voice(0.55, { freq: curve([[0, 1600], [0.3, 2200], [0.6, 2000], [1, 1500]]), harm: [1, 0.35, 0.15], noise: 0.1, vib: [16, 0.03], a: 0.01, r: 0.15 }),
  },
};

for (const [name, variants] of Object.entries(PETS)) {
  for (const [v, make] of Object.entries(variants)) {
    if (which !== 'all' && which !== v) continue;
    const file = join(out, `pet_${name}_${v}.wav`);
    writeFileSync(file, wav(make()));
    console.log(file);
  }
}
