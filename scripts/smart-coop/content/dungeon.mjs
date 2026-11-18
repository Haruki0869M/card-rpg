// 賢いマルチプレイ検証 bot: ダンジョンの部屋で使う「説明書き」（区切り 2-Sa。直し12: 場面ごとのファイル）
// 扉の予兆の種類・イベントの選択肢の種類・休憩の選び方の数字。数字は bot の作戦の【提案】（計画 §4 の扉・休憩・イベント・宝箱の行）。
// シナリオ2・3の部屋（凍え・漂流物の山 など）は、DOOR_KINDS に行を足せば頭が選び分ける。

/** 扉の予兆（data-door-omen の値）→ 名前と、作戦の点の元 */
export const DOOR_KINDS = {
  danger: { name: '魔物の群れ', base: 5 },
  elite: { name: '強敵の棲処', base: 3 },
  treasure: { name: '宝物庫', base: 8 },
  sealed: { name: '封魔の宝箱', base: 4 }, // data-door-sealed（金の扉の中の封魔）
  rest: { name: '焚き火の休憩所', base: 2 },
  mystery: { name: '未知の祭壇・行商人', base: 6 },
  midboss: { name: '中ボスの扉', base: 0 },
  boss: { name: 'ボスの門', base: 0 },
  '': { name: '予兆の分からない扉', base: 1 },
};

/** 扉の種類（封魔は宝物庫の扉の中の印で分ける） */
export const doorKindOf = (d) => (d['data-door-sealed'] !== null && d['data-door-sealed'] !== undefined ? 'sealed' : d['data-door-omen'] ?? '');

/** パーティの HP（下の帯の aria-label「名前 HP12/30」）→ [{ name, hp, max, r }] */
export function partyHp(rows = []) {
  return rows
    .map((r) => {
      const m = /^(.*?)\s*HP\s*(\d+)\s*\/\s*(\d+)/.exec(r['aria-label'] ?? '');
      return m ? { name: m[1], hp: Number(m[2]), max: Number(m[3]), r: Number(m[2]) / Math.max(1, Number(m[3])) } : null;
    })
    .filter(Boolean);
}

/** 休憩の画面のキャラの行「名前 HP 12/30 → 21 2/3」→ [{ hp, max, r, focus, focusMax }] */
export function restHp(texts = []) {
  return texts
    .map((t) => {
      const m = /HP\s*(\d+)\s*\/\s*(\d+)/.exec(t);
      const f = /(\d+)\s*\/\s*(\d+)\s*$/.exec(t.replace(/\+1$/, '').trim());
      return m ? { hp: Number(m[1]), max: Number(m[2]), r: Number(m[1]) / Math.max(1, Number(m[2])), focus: f ? Number(f[1]) : null, focusMax: f ? Number(f[2]) : null } : null;
    })
    .filter(Boolean);
}

/** イベントの選択肢の種類。区切り 2-Sb: 判定・払うは B6 の印 data-option-kind（o.kindMark）を先に使う。戦う・立ち去るは字（結果は選ぶまで見えないので印に無い） */
export function optionKind(o) {
  const t = o.text ?? '';
  const km = String(o.kindMark ?? '');
  if (km.includes('check') || (o.chance !== null && o.chance !== undefined)) return 'check';
  if (km.includes('pay') || /を払う/.test(t)) return 'pay';
  if (/戦う|挑む|襲いかかる/.test(t)) return 'fight';
  if (/立ち去る|去る|やめる|無視|通り過ぎる|引き返す/.test(t)) return 'leave';
  return 'other';
}

/**
 * 判定の窓: 区切り 2-Sb は B6 の印（data-challenge-focus = 今の指定・data-challenge-chance = その時の成功率）を先に使う。
 * 字「成功率 70%（フォーカス 2 → 1）」も読み、違えば mismatch に書く（直し8）。返す物: { pct, spent, mismatch }
 */
export function checkFrom(v) {
  const t = checkOf(v.facts.checkTexts);
  const m = (v.facts.checkMarks ?? [])[0];
  if (!m) return t;
  const pct = Number(m['data-challenge-chance']);
  const spent = Number(m['data-challenge-focus']);
  const mismatch = t && (t.pct !== pct || t.spent !== spent) ? `判定の窓: 字 ${t.pct}%・フォーカス ${t.spent}／印 ${pct}%・フォーカス ${spent}` : null;
  return { pct, spent, focus: t?.focus ?? null, after: t?.after ?? null, mismatch };
}

/** 判定の窓の字「成功率 70%（フォーカス 2 → 1）」「完全成功の確率 12%（…）」→ { pct, focus, after, spent } */
export function checkOf(texts = []) {
  const t = texts[texts.length - 1] ?? '';
  const m = /(\d+)%\s*（フォーカス\s*(\d+)\s*→\s*(\d+)）/.exec(t);
  if (!m) return null;
  return { pct: Number(m[1]), focus: Number(m[2]), after: Number(m[3]), spent: Number(m[2]) - Number(m[3]) };
}

/** 開け役の候補の字「おすすめ」「鍵が開く 45%（フォーカス2で70%）」→ { p0, pMax, best } */
export function openerOf(row) {
  const t = row.text ?? '';
  const p = /(?:鍵が開く|完全成功|罠を避ける)\s*(\d+)%/.exec(t);
  const q = /フォーカス\d+で(\d+)%/.exec(t);
  const p0T = p ? Number(p[1]) : 0;
  // 区切り 2-Sb: B9 の印（data-opener-chance = フォーカス0の成功率・data-opener-best = おすすめ）を先に使い、字と違えば mismatch
  const p0M = row['data-opener-chance'] !== null && row['data-opener-chance'] !== undefined ? Number(row['data-opener-chance']) : null;
  const p0 = p0M ?? p0T;
  const bestM = row['data-opener-best'] !== null && row['data-opener-best'] !== undefined;
  const bestT = /おすすめ/.test(t);
  const mismatch = p0M !== null && (p ? p0M !== p0T : false) ? `開け役 ${row['data-opener']}: 字 ${p0T}%・印 ${p0M}%` : bestM !== bestT && 'data-opener-best' in row ? `開け役 ${row['data-opener']}: 「おすすめ」の字 ${bestT}・印 ${bestM}` : null;
  return { id: row['data-opener'], p0, pMax: q ? Number(q[1]) : p0, best: 'data-opener-best' in row ? bestM : bestT, votes: String(row.votes ?? '').split(',').filter(Boolean), mismatch };
}
