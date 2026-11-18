// 賢いマルチプレイ検証 bot: 揺さぶりの自己テスト（区切り 3-S。ゲームもブラウザも要らない。selftest.mjs から呼ぶ）
// 1. 順番は確率を使わない: 同じ種なら同じ機会の並びで同じ揺さぶりが起きる・周期どおり（3回に1回など）
// 2. 合意待ちの P2 の画面で S1・S3 が決まりどおりに始まる・同時押し S13 の組を返す
// 3. 確かめが本物の不具合に当たる（作り物の View で）: S5 で結果の枠の「使ったフォーカス」が足した数と違う・持ち主のフォーカスが減らない → NG
//    S2 で持ち主のフォーカスの指定が 0 に戻る → NG。正しい形は OK
import { Judge } from '../judge.mjs';
import { BUSY } from '../view/scenes/game.mjs';
import { shakeInit, opportunity, shakeBrain, shakeObserve, shakeAfterTick, shakeBeforePress, pickSimultaneous, HOLD, offsetOf } from '../shake.mjs';

const view = (seat, mode, facts = {}, o = {}) => ({ seat, screen: 'game', mode, layers: [], actions: [], waits: [], busy: [], facts, sig: `${seat}|${mode}|${JSON.stringify(facts).length}`, ...o });
const act = (css, text, marks = []) => ({ css, text, nth: 0, enabled: true, marks, rect: [0, 0, 50, 50] });

export async function shakeChecks(check) {
  // ---- 1. 種と周期 ----
  const seq = (seed) => {
    const b = {};
    const sh = shakeInit(b, seed);
    return Array.from({ length: 12 }, (_, i) => (opportunity(sh, 'S1', `k${i}`) ? 1 : 0)).join('');
  };
  check(seq(7) === seq(7) && seq(11) === seq(11), '揺さぶり: 同じ種なら同じ機会で起きる（確率を使わない）', `${seq(7)} ${seq(11)}`);
  check([0, 3, 6, 9].every((i) => seq(7).slice(i, i + 3).split('').filter((x) => x === '1').length === 1), '揺さぶり: 周期3の S1 は3回に1回', seq(7));
  {
    const b = {};
    const sh = shakeInit(b, 7);
    const a = opportunity(sh, 'S1', 'same');
    const again = opportunity(sh, 'S1', 'same');
    check(again === false && sh.k.S1.opp === 1, '揺さぶり: 同じ機会（同じ key）は1回だけ数える', JSON.stringify({ a, again, opp: sh.k.S1.opp }));
  }
  check(Number.isInteger(offsetOf(7, 'S1', 3)) && offsetOf(7, 'S1', 3) === offsetOf(7, 'S1', 3), '揺さぶり: 種から決めた余りは同じ種で同じ');

  // ---- 2. 合意待ちで始まる ----
  const doorsP2 = (votes) => ({
    dDoors: [
      { 'data-door-choice': 'r1', 'data-door-omen': 'danger', 'data-my-vote': null, disabled: null, votes: votes.r1 ?? '' },
      { 'data-door-choice': 'r2', 'data-door-omen': 'rest', 'data-my-vote': null, disabled: null, votes: votes.r2 ?? '' },
    ],
    dungeonId: [{ 'data-dungeon': 'emeraldTemple' }],
  });
  const startSeq = (seed) => {
    const b = {};
    shakeInit(b, seed);
    const out = [];
    for (let i = 0; i < 6; i++) {
      b.sh.m = null;
      const v = view('P2', 'dungeon', { ...doorsP2({ r1: 'P1' }), dEvent: `e${i}` }, { actions: [act('button[data-bar-button="装備"]', '装備', ['data-bar-button=装備'])] });
      v.facts.dungeonId = [{ 'data-dungeon': `d${i}` }];
      const d = shakeBrain(v, b);
      out.push(b.sh.m?.id ?? '-');
      void d;
    }
    return out.join(',');
  };
  check(startSeq(7) === startSeq(7), '揺さぶり: 同じ種なら、扉の合意待ちで起きる S1・S3 の並びが同じ', startSeq(7));
  check(startSeq(7).includes('S3') && startSeq(7).includes('S1'), '揺さぶり: 扉の合意待ち6回で S1 と S3 の両方が起きる（S3 が起きた機会では S1 は数えない）', startSeq(7));
  {
    const b = {};
    shakeInit(b, 7);
    // S3 を起こす機会を探す
    let d = null;
    for (let i = 0; i < 6 && !(b.sh.m?.id === 'S3'); i++) {
      b.sh.m = null;
      const v = view('P2', 'dungeon', { ...doorsP2({ r1: 'P1' }), dEvent: `x${i}` });
      v.facts.dungeonId = [{ 'data-dungeon': `x${i}` }];
      d = shakeBrain(v, b);
    }
    check(b.sh.m?.id === 'S3' && d?.target?.css === '[data-door-choice="r2"]' && d.prio, '揺さぶり S3: 仲間（P1）が r1 に入れた時、P2 はわざと別の扉 r2 に票を入れる', JSON.stringify(d?.target));
  }
  {
    const b = {};
    shakeInit(b, 7);
    const views = [view('P1', 'battle'), view('P2', 'battle')];
    const wants = [
      { i: 0, d: { target: { css: '[data-end-turn="ready"]' }, what: '準備完了', turn: true } },
      { i: 1, d: { target: { css: '[data-end-turn="ready"]' }, what: '準備完了', turn: true } },
    ];
    const got = [];
    for (let k = 0; k < 6; k++) {
      views[0].sig = `a${k}`;
      got.push(pickSimultaneous(wants, views, b) ? 1 : 0);
    }
    check(got.join('').split('').filter((x) => x === '1').length === 2, '揺さぶり S13: 2台が同じ種類の票（準備完了）を押す時、周期3で「同時に押す」組を返す', got.join(''));
    b.sh.m = { id: 'S1' };
    views[0].sig = 'busy';
    check(pickSimultaneous(wants, views, b) === null, '揺さぶり S13: ほかの揺さぶりの最中は同時押しにしない');
  }
  // 区切り 4: 4人の時、S13 は2台ずつ。組は起きた回数で順に回る（同じ種なら同じ）
  {
    const pairsOf = () => {
      const b = {};
      shakeInit(b, 7, 4);
      const views = ['P1', 'P2', 'P3', 'P4'].map((s) => view(s, 'battle'));
      const out = [];
      for (let k = 0; k < 12; k++) {
        views[0].sig = `a${k}`;
        const wants = views.map((_, i) => ({ i, d: { target: { css: '[data-end-turn="ready"]' }, what: '準備完了', turn: true } }));
        const p = pickSimultaneous(wants, views, b);
        if (p) out.push(p.wants.map((w) => views[w.i].seat).join('+'));
        b.sh.simCheck = null;
      }
      return out;
    };
    const ps = pairsOf();
    check(ps.length >= 3 && ps.every((p) => p.split('+').length === 2) && new Set(ps).size >= 3 && ps.join() === pairsOf().join(), '揺さぶり S13（4人）: 2台ずつ・組が順に回る・同じ種なら同じ組', ps.join(' '));
  }
  // 区切り 4 の誤検知の直し: S11 で開く物（状態の「＋N」・敵の予告）が無い時は NG にせず中断。予告を長押ししても説明が開かない時は NG のまま
  {
    const s11case = (intent, detailOpens) => {
      const b = {};
      const sh = shakeInit(b, 7);
      sh.m = { id: 'S11', step: 'intent', seat: 'P2', data: {}, stepTicks: 0, lastStep: 'intent' };
      const bv = (layers = []) => view('P2', 'battle', { bEnemies: [{ 'data-enemy': 'e0', 'data-dead': null, intent: intent ? '攻撃 8' : null }] }, { layers });
      for (let k = 0; k < 8 && sh.m; k++) {
        const v = bv(k > 0 && detailOpens && intent ? [{ id: 'detail' }] : []);
        const d = shakeBrain(v, b);
        if (d && typeof d.after === 'function') d.after(); // 押せた事にする（conductor と同じ）
        shakeObserve([view('P1', 'battle'), v], b);
      }
      return { ng: sh.k.S11.ng, ok: sh.k.S11.ok, abort: sh.k.S11.abort };
    };
    const none = s11case(false, false);
    const broken = s11case(true, false);
    check(none.ng === 0 && none.abort === 1, '揺さぶり S11: 開く物が画面に無い時は NG にしない（中断）', JSON.stringify(none));
    check(broken.ng >= 1, '揺さぶり S11: 予告を長押ししても説明の窓が開かない時は NG', JSON.stringify(broken));
  }
  // 区切り 4 の誤検知の直し: S3 の「割れている間は開かない」は、ダンジョンにいない人（4人の P3）がいても OK。扉が開いた（P1 が別の画面）なら NG
  {
    const s3case = (p1mode) => {
      const b = {};
      const sh = shakeInit(b, 7, 4);
      sh.m = { id: 'S3', step: 'checkSplit', seat: 'P2', data: { other: 'r1c1', split: 'r1c0' }, stepTicks: 0, lastStep: 'checkSplit' };
      const doors = (mine) => ({ dDoors: [{ 'data-door-choice': 'r1c0', 'data-my-vote': mine === 'r1c0' ? '1' : null, votes: 'P2' }, { 'data-door-choice': 'r1c1', 'data-my-vote': mine === 'r1c1' ? '1' : null, votes: 'P1,P4' }], pinBanner: ['P2 こっち！'] });
      const vs = [view('P1', p1mode, p1mode === 'dungeon' ? doors('r1c1') : {}), view('P2', 'dungeon', doors('r1c0')), view('P3', 'world'), view('P4', 'dungeon', doors('r1c1'))];
      for (let k = 0; k < 8 && sh.m?.step === 'checkSplit'; k++) shakeObserve(vs, b);
      return sh.k.S3.log.join('／');
    };
    check(/^OK: 票が割れた/.test(s3case('dungeon')), '揺さぶり S3（4人）: ダンジョンにいない人がいても、割れた票の間に扉が開かなければ OK', s3case('dungeon'));
    check(/NG: 票が割れた/.test(s3case('battle')), '揺さぶり S3: 割れているのに扉が開いた（P1 が別の画面）なら NG', s3case('battle'));
  }
  // 区切り 4 の誤検知の直し: S2 で持ち主がフォーカスを足せない（足すボタンが押せない）時は中断。足せたのに 0 に戻った時は今までどおり NG
  {
    const s2case = (canPlus) => {
      const b = {};
      const sh = shakeInit(b, 7, 4);
      sh.m = { id: 'S2', step: 'other', owner: 'P3', data: { otherDone: true }, stepTicks: 0, lastStep: 'other' };
      const ov = view('P3', 'event', { dChallenge: [{ 'data-challenge-mine': '1', 'data-challenge-hero': 'h2' }], checkMarks: [{ 'data-challenge-focus': '0' }], checkPlusOn: canPlus });
      shakeBrain(ov, b);
      if (canPlus) sh.m.data.maxSpent = 1;
      shakeObserve([view('P1', 'event'), ov], b);
      return { ng: sh.k.S2.ng, abort: sh.k.S2.abort };
    };
    const np = s2case(false);
    const back = s2case(true);
    check(np.ng === 0 && np.abort === 1 && back.ng === 1, '揺さぶり S2: 持ち主が足せない時は中断・足した後に 0 に戻ったら NG', JSON.stringify({ np, back }));
  }
  // 区切り 4 の誤検知の直し: S13 の準備完了は「ターン終了」の印が ready から変われば進んだ（長い戦闘で 60 手を超えても NG にしない）
  {
    const readyCase = (after) => {
      const b = {};
      const sh = shakeInit(b, 7, 4);
      sh.watch.push({ id: 'S13', kind: 'ready', seats: ['P3', 'P4'], ticks: 0, what: 'S13（ready）' });
      const bv = (seat, st) => view(seat, 'battle', { bEndTurn: [{ 'data-end-turn': st }] });
      for (let k = 0; k < 70; k++) shakeObserve([bv('P1', 'ready'), bv('P2', 'ready'), bv('P3', after), bv('P4', after)], b);
      return { ok: sh.k.S13.ok, ng: sh.k.S13.ng };
    };
    const moved = readyCase('waiting');
    const stuck = readyCase('ready');
    check(moved.ok === 1 && moved.ng === 0 && stuck.ng === 1, '揺さぶり S13（準備完了）: 印が変われば OK・60 手 ready のままなら NG', JSON.stringify({ moved, stuck }));
  }
  // 区切り 4: 4人の時、S1 は P2 と P3 が交代（2回目は P3 が始める。2人の時は P3 では始めない）
  {
    const start = (people, count) => {
      const b = {};
      shakeInit(b, 7, people);
      b.sh.k.S1.count = count;
      let id = null;
      for (let i = 0; i < 6 && !id; i++) {
        const v = view('P3', 'dungeon', { ...doorsP2({ r1: 'P1' }), dEvent: `x${i}` }, { actions: [act('button[data-bar-button="装備"]', '装備', ['data-bar-button=装備'])] });
        v.facts.dungeonId = [{ 'data-dungeon': `q${i}` }];
        shakeBrain(v, b);
        id = b.sh.m?.id ? `${b.sh.m.id}:${b.sh.m.seat}` : null;
      }
      return id;
    };
    check(start(4, 1) === 'S1:P3' && start(4, 0) === null && start(2, 1) === null, '揺さぶり S1（4人）: P3 は自分の番（起きた回数が奇数）の時だけ始める', `${start(4, 1)} ${start(4, 0)} ${start(2, 1)}`);
  }

  // ---- 3. 確かめが本物の不具合に当たる ----
  const s5case = async ({ resultFocus, focusAfter }) => {
    const b = {};
    const sh = shakeInit(b, 7);
    sh.flags.s5done = false;
    const stage = (seat, mine, spent, chance) =>
      view(seat, 'event', {
        dChallenge: [{ 'data-challenge-hero': 'h1', 'data-challenge-mine': mine ? '1' : '0' }],
        checkMarks: mine ? [{ 'data-challenge-focus': String(spent), 'data-challenge-chance': String(chance) }] : [],
        eventId: [{ 'data-event-window': 'ancientStele' }],
      });
    const judge = { heroes: async () => [{ id: 'h0', focus: 3 }, { id: 'h1', focus: 3 }], failures: [], fail: async (kind, o) => judge.failures.push({ kind, ...o }), note: () => {} };
    const fleet = { devices: [] };
    for (const [spent, chance] of [[0, 60], [1, 85]]) {
      const views = [stage('P1', false, 0, 0), stage('P2', true, spent, chance)];
      await shakeBeforePress({ judge, views, board: b });
      shakeObserve(views, b);
      await shakeAfterTick({ fleet, judge, views, board: b });
    }
    judge.heroes = async () => [{ id: 'h0', focus: 3 }, { id: 'h1', focus: focusAfter }];
    const res = (seat) => view(seat, 'event', { dCheckResult: [{ 'data-check-result': 'success', 'data-check-focus': String(resultFocus) }] });
    const views = [res('P1'), res('P2')];
    shakeObserve(views, b);
    await shakeAfterTick({ fleet, judge, views, board: b });
    return { ng: sh.k.S5.ng, ok: sh.k.S5.ok, count: sh.k.S5.count, fails: judge.failures.map((f) => f.text) };
  };
  const good = await s5case({ resultFocus: 1, focusAfter: 2 });
  check(good.count === 1 && good.ng === 0 && good.ok === 3, '揺さぶり S5: 足した数どおりに判定され、挑む役のフォーカスだけが減れば OK', JSON.stringify(good));
  const bad = await s5case({ resultFocus: 0, focusAfter: 3 });
  check(bad.ng === 2 && bad.fails.length === 2 && bad.fails.every((t) => t.startsWith('揺さぶり S5')), '揺さぶり S5: フォーカスの指定が捨てられ 0 で判定された形（35ffa1b の前）に当たる', JSON.stringify(bad));

  // S2: ほかの人がシートを開け閉めしている間に、持ち主のフォーカスの指定が 0 に戻る → NG
  const s2case = async (spents) => {
    const b = {};
    const sh = shakeInit(b, 7);
    sh.m = { id: 'S2', step: 'other', owner: 'P2', data: {}, stepTicks: 0, lastStep: 'other' };
    sh.k.S2.count = 1;
    const judge = { heroes: async () => null, failures: [], fail: async (kind, o) => judge.failures.push({ kind, ...o }), note: () => {} };
    for (const [k, sp] of spents.entries()) {
      if (k === spents.length - 1) sh.m.data.otherDone = true;
      const views = [view('P1', 'event', { dChallenge: [{ 'data-challenge-hero': 'h1', 'data-challenge-mine': '0' }] }), view('P2', 'event', { dChallenge: [{ 'data-challenge-hero': 'h1', 'data-challenge-mine': '1' }], checkMarks: [{ 'data-challenge-focus': String(sp), 'data-challenge-chance': '80' }] })];
      shakeObserve(views, b);
      await shakeAfterTick({ fleet: { devices: [] }, judge, views, board: b });
    }
    return { ng: sh.k.S2.ng, ok: sh.k.S2.ok, fails: judge.failures.length };
  };
  const s2good = await s2case([1, 1, 1]);
  const s2bad = await s2case([1, 0, 0]);
  check(s2good.ok === 1 && s2good.ng === 0, '揺さぶり S2: ほかの人の開け閉めの後も持ち主の指定が残れば OK', JSON.stringify(s2good));
  check(s2bad.ng >= 1 && s2bad.fails >= 1, '揺さぶり S2: 持ち主のフォーカスの指定が 0 に戻ったら NG（審判の失敗）', JSON.stringify(s2bad));
  check(HOLD.hold === true, '揺さぶり: HOLD は「わざと待つ」の印');

  // ---- 区切り 3-S の直し: 演出が終わらない（同じ演出の印が 45 秒消えない）は「止まり」・お供の演出はシルエットの間だけ ----
  {
    const j = new Judge({ outDir: process.env.SMART_OUTPUT ?? 'screenshots/smart-coop/selftest', devices: [] });
    j.fail = async (kind, o) => { j.failures.push({ kind, ...o }); return o; };
    const bv = [view('P1', 'event', {}, { busy: ['[data-pet-reveal="silhouette"]'] })];
    await j.watch(bv);
    j.busySince -= 50000;
    const r = await j.watch(bv);
    check(r === 'stuck' && j.failures.some((f) => f.kind === 'stuck' && /演出中の印/.test(f.text)), '審判: 演出が終わらない（同じ演出の印が 45 秒消えない）は止まり', JSON.stringify(j.failures));
    check(BUSY.includes('[data-pet-reveal="silhouette"]') && !BUSY.includes('[data-pet-reveal]'), '画面を読む: お供の演出はシルエットの間だけ演出中（見せ終わった印 shown では待たない）');
  }
}
