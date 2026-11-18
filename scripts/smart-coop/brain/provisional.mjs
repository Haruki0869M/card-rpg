// 賢いマルチプレイ検証 bot: 仮の頭（区切り 1-J だけ。「まっすぐ進む＋先頭の使えるカード」）
// 区切り 2-Sa で brain/battle.mjs・brain/dungeon.mjs・brain/reward.mjs（予告を読む・扉を選び分ける・成長を選ぶ）に置き換える。
// ここは「最初の戦闘の報酬まで、画面のボタンだけで着く」ための最小の決まりだけ。勝ち負け・上手さは見ない。
// 決まり: 見るのは View だけ。乱数を使わない（同じ点なら先頭）。
import { G, findMark, hasLayer, decide } from './common.mjs';

/** 遭遇: いつも「戦う」 */
function encounterBrain(v) {
  const a = findMark(v, 'data-encounter-choice', 'fight');
  if (a?.enabled) return decide(G.encounterFight, '遭遇「戦う」', { turn: true });
  return null;
}

/** ダンジョン: 先頭の扉（まだ自分の票が無ければ）。票を入れたら、仲間がそろうのを待つ */
function dungeonBrain(v) {
  const doors = v.facts.doors ?? [];
  if (!doors.length) return null;
  if (doors.some((d) => d['data-my-vote'] !== null)) return null;
  const d = doors.find((x) => x.disabled === null);
  if (!d) return null;
  return decide(G.door(d['data-door-choice']), `扉 ${d['data-door-choice']}（${d['data-door-omen'] || '予兆なし'}）`, { turn: true });
}

/** 戦闘: 先頭の使えるカード → 敵が要れば先頭の生きている敵 →「発動」。使えるカードが無ければ「ターン終了」か「準備完了」 */
function battleBrain(v) {
  if (v.facts.focusPanel) {
    const text = v.facts.focusText ?? '';
    // 的が要るかは「発動」のボタンの下の小さい字で読む（「敵をタップ」「味方をタップ」。窓の案内の文にも同じ字があるので、窓全体の字では読まない）
    const goBtn = v.actions.find((a) => a.text.startsWith('発動'));
    const need = goBtn?.text ?? '';
    if (need.includes('敵をタップ')) {
      const e = (v.facts.enemies ?? []).find((x) => x['data-dead'] === null);
      if (e) return decide(G.enemy(e['data-enemy']), `敵 ${e['data-enemy']} を的にする`, { turn: true });
      return null;
    }
    if (need.includes('味方をタップ')) {
      // 味方の的（区切り 2 で選び分ける）。今は先頭の生きている味方
      const a = (v.facts.allies ?? []).find((x) => x['data-dead'] === null);
      if (a) return decide({ css: `[data-ally="${a['data-ally']}"]` }, `味方 ${a['data-ally']} を的にする`, { turn: true });
      return null;
    }
    const go = goBtn;
    if (go?.enabled) return decide(G.cardGo, `「発動」（${text.slice(0, 20)}）`, { turn: true });
    return null;
  }
  const card = (v.facts.hand ?? []).find((c) => c['data-usable'] !== null);
  if (card) return decide(G.card(card['data-card-index']), `カード ${card['data-card-index']}（${card['data-card-id']}）`, { turn: true });
  for (const k of ['end', 'ready']) {
    const b = findMark(v, 'data-end-turn', k);
    if (b?.enabled) return decide(G.endTurn(k), `「${b.text}」`, { turn: true });
  }
  return null;
}

/** 報酬: カードは先頭の1枚（めくる → 説明の窓 →「このカードを選ぶ」）。成長は先頭。最後に「報酬を受け取り終える」 */
function rewardBrain(v) {
  if (hasLayer(v, 'card-pick')) {
    const a = findMark(v, 'data-card-pick-action');
    if (a?.enabled) return decide(G.cardPickAction, `「${a.text}」`);
    return null;
  }
  const pick = (v.facts.pickCards ?? [])[0];
  if (pick) return decide(G.pickCard(pick['data-pick-card']), `報酬のカード ${pick['data-pick-card']}`);
  // 戦利品の取り合い（真ん中の窓）: 仮の頭は「欲しい」（印なし・字だけ。区切り 2-G の B10 で印に替える）
  const want = v.actions.find((a) => a.enabled && a.text.startsWith('欲しい'));
  if (want) return decide({ css: '[data-claim] button', text: '欲しい', exact: false }, '取り合い「欲しい」');
  const fin = findMark(v, 'data-reward-finish');
  if (fin?.enabled) {
    // 「先へ進む」は全員の票。自分の票が入っていれば待つ（もう1度押すと取り消しになる形を避ける）
    const seats = (v.facts.rewardVoteSeats ?? []).flatMap((x) => String(x['data-vote-seats'] ?? '').split(','));
    if (seats.includes(v.seat)) return null;
    return decide(G.rewardFinish, `「${fin.text}」`);
  }
  return null;
}

/**
 * イベント（地図のマス・ダンジョン）: まっすぐ進む = 一番下の選べる選択肢（多くは「立ち去る」形）→ 挑む段なら「挑戦する」→「先へ進む」「戦闘を始める」。
 * 票の形（みんなで決める）なので、自分の票が入っていれば待つ
 */
function eventBrain(v) {
  const go = findMark(v, 'data-challenge-go');
  if (go?.enabled) return decide({ css: '[data-challenge-go]' }, `「${go.text}」`, { turn: true });
  const fin = v.actions.find((a) => a.enabled && (a.text.startsWith('先へ進む') || a.text.startsWith('戦闘を始める')));
  if (fin) {
    const seats = (v.facts.eventVoteSeats ?? []).flatMap((x) => String(x['data-vote-seats'] ?? '').split(','));
    if (seats.includes(v.seat)) return null;
    const word = fin.text.startsWith('先へ進む') ? '先へ進む' : '戦闘を始める';
    return decide({ css: '[data-event-panel] button', text: word, exact: false }, `「${word}」`, { turn: true });
  }
  const opts = v.actions.filter((a) => a.marks.some((m) => m.startsWith('data-event-option=')));
  if (opts.some((a) => a.marks.includes('data-my-vote=1'))) return null;
  const o = [...opts].reverse().find((a) => a.enabled);
  if (o) {
    const i = o.marks.find((m) => m.startsWith('data-event-option=')).slice('data-event-option='.length);
    return decide({ css: `[data-event-option="${i}"]` }, `イベントの選択肢 ${i}「${o.text.slice(0, 20)}」`, { turn: true });
  }
  return null;
}

/** 仮の頭（場面ごと）。返す物: 決め か null */
export function provisionalBrain(v) {
  if (v.screen !== 'game') return null;
  // 待ちの帯（data-turn-lock = 手番の席）が出ていて、自分の席でなければ、その場面の操作は手番の人の物（計画 §3-2: 頭が選ばない）。
  // 帯より上の選択肢は押せる形で見えているが、押すと「〜の手番です（担当の人が操作します）」のお知らせだけで何も起きない（区切り 1-J の通しで見た）
  const lock = (v.facts.turnLock ?? [])[0];
  if (lock && lock['data-turn-lock'] !== v.seat) return null;
  switch (v.mode) {
    case 'encounter':
      return encounterBrain(v);
    case 'dungeon':
      return dungeonBrain(v);
    case 'battle':
      return battleBrain(v);
    case 'reward':
      return rewardBrain(v);
    case 'event':
      return eventBrain(v);
    default:
      return null;
  }
}
