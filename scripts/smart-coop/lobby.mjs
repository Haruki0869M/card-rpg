// 賢いマルチプレイ検証 bot: 土台「部屋を作って入る・キャラを作る・出発」（計画 §2-2）。全部画面のボタン（press.mjs）
// 1. P1: タイトル「新しい冒険」→（1本目以外はシナリオのカード）→「やさしい」→ 人数 →「オンライン協力」→ 名前 →「部屋を作る」→ 合言葉を画面から読む
// 2. P2〜: 招待のリンク（&room=合言葉）で開く → 名前 →「参加する」。4人の時、P4 だけは合言葉を手で打って入る【計画の提案】
// 3. 1人1キャラ:「作る」→ ジョブを選ぶ（種から決まる順。回復役を1人は入れる）→「このキャラに決める」
// 4. P1「冒険に出発」→ 全端末が世界マップになるまで待つ → 物語を閉じる（「つづける」）
import { SCENES, readView, readAll } from './view/index.mjs';
import { HEALER_JOB_NAMES } from './view/scenes/create.mjs';
import { press, pressIfShown, typeText } from './press.mjs';
import { seeded, until, wait, log } from './util.mjs';

const NAMES = ['ハル', 'ナツ', 'アキ', 'フユ'];
const T = SCENES.title.sel, S = SCENES.setup.sel, J = SCENES.join.sel, L = SCENES.lobby.sel, C = SCENES.create.sel, G = SCENES.game.sel;

/** 画面が want になるまで待つ（読めない画面は審判に知らせる）。なれば View を返す */
async function waitScreen(s, dev, want, ms = 20000) {
  let v = null;
  const ok = await until(async () => {
    v = await readView(dev);
    return [].concat(want).includes(v.screen);
  }, ms, 200);
  if (!ok) {
    await s.judge.fail(v?.unreadable ? 'unreadable' : 'lobby', { seat: dev.seat, text: `${[].concat(want).join('か')} の画面にならない（今: ${v?.screen ?? '読めない'}・字の始め: ${v?.textSample?.slice(0, 60) ?? ''}）` });
    return null;
  }
  return v;
}

/** 押して、だめなら例外（部屋に入る所は、押せないと先に進めない。証拠は press が残している） */
async function must(s, dev, target, what, o = {}) {
  const r = await press(s, dev, target, { what, ...o });
  if (!r.pressed) throw new LobbyStop(`${dev.seat}: ${what} が押せない`);
  return r;
}
async function mustType(s, dev, target, text, what) {
  const r = await typeText(s, dev, target, text, { what });
  if (!r.pressed) throw new LobbyStop(`${dev.seat}: ${what} に打てない`);
}
export class LobbyStop extends Error {}

/** 種から決まるジョブの並び（回復役を1人は入れる）。jobs = 画面のチップの字 */
export function pickJobs(jobs, people, seed) {
  const rnd = seeded(seed);
  const list = [...jobs];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  const out = list.slice(0, people);
  if (!out.some((n) => HEALER_JOB_NAMES.includes(n))) {
    const healer = list.find((n) => HEALER_JOB_NAMES.includes(n));
    if (healer) out[seed % people] = healer;
  }
  return out;
}

/**
 * 部屋を作って全員で出発する。
 * @param s セッション { judge }
 * @param fleet 端末
 * @param o { url（?emu= つき）, people, seed, scenarioIndex（0 = 1本目）, difficulty }
 * 返す物: { code, jobs, started: true }（途中で進めなければ LobbyStop）
 */
export async function setupRoom(s, fleet, { url, people, seed, scenarioIndex = 0, difficulty = 'やさしい' }) {
  const devs = fleet.devices;
  const [host] = devs;
  const sep = url.includes('?') ? '&' : '?';
  // ---- 1. ホストが部屋を作る ----
  await host.page.goto(url);
  await waitScreen(s, host, 'title');
  await must(s, host, T.newGame, 'タイトル「新しい冒険」');
  await pressIfShown(s, host, T.confirmNew, { what: '「上書きして始める」' });
  if (!(await waitScreen(s, host, 'setup'))) throw new LobbyStop('冒険の準備の画面にならない');
  if (scenarioIndex > 0) await must(s, host, { ...S.scenarioCard, nth: scenarioIndex }, `シナリオのカード ${scenarioIndex + 1}本目`);
  await must(s, host, S.difficulty(difficulty), `難易度「${difficulty}」`);
  await must(s, host, S.partySize(people), `人数「${people}人」`);
  await must(s, host, S.online, '「オンライン協力」');
  await mustType(s, host, S.nameInput, NAMES[0], '名前');
  await must(s, host, S.createRoom, '「部屋を作る」');
  const lv = await waitScreen(s, host, 'lobby', 30000);
  if (!lv) throw new LobbyStop('待合室にならない（部屋が作れない）');
  const code = String(lv.facts.roomCode ?? '').trim();
  if (!/^[A-Z0-9]{4}$/.test(code)) throw new LobbyStop(`合言葉が読めない: ${code}`);
  log(`部屋 ${code}`);

  // ---- 2. ほかの人が入る ----
  for (const [k, dev] of devs.slice(1).entries()) {
    const typed = people === 4 && dev.seat === 'P4';
    if (typed) {
      // 合言葉を手で打って入る（招待リンクと手打ちの両方の道を通す）
      await dev.page.goto(url);
      await waitScreen(s, dev, 'title');
      await must(s, dev, T.joinRoom, 'タイトル「部屋に参加」');
      await waitScreen(s, dev, 'join');
      await mustType(s, dev, J.codeInput, code, '合言葉');
    } else {
      await dev.page.goto(`${url}${sep}room=${code}`);
      await waitScreen(s, dev, 'join');
    }
    await mustType(s, dev, J.nameInput, NAMES[k + 1], '名前');
    await must(s, dev, J.join, '「参加する」');
    if (!(await waitScreen(s, dev, 'lobby', 30000))) throw new LobbyStop(`${dev.seat} が部屋に入れない`);
  }

  // ---- 3. 1人1キャラ ----
  let jobs = null;
  for (const [k, dev] of devs.entries()) {
    // 前の人のキャラが、この端末の待合室に出るまで待つ（同じ枠を取り合わない）
    await until(async () => (await readView(dev)).facts.emptySlots === people - k, 15000, 200);
    await must(s, dev, L.makeHero, '待合室「作る」');
    const cv = await waitScreen(s, dev, 'create');
    if (!cv) throw new LobbyStop(`${dev.seat} がキャラクター作成にならない`);
    jobs ??= pickJobs(cv.facts.jobs ?? [], people, seed);
    if (jobs[k]) await must(s, dev, C.job(jobs[k]), `ジョブ「${jobs[k]}」`);
    await must(s, dev, C.decide, '「このキャラに決める」');
    await pressIfShown(s, dev, C.confirmDepart, { what: '「出発する」（確認）' });
    if (!(await waitScreen(s, dev, 'lobby'))) throw new LobbyStop(`${dev.seat} が待合室に戻らない`);
    await s.judge.step();
  }

  // ---- 4. 出発 ----
  const ready = await until(async () => (await readView(host)).facts.startEnabled === true, 15000, 200);
  if (!ready) {
    await s.judge.fail('lobby', { seat: host.seat, text: '全員のキャラがそろっても「冒険に出発」が押せない' });
    throw new LobbyStop('出発できない');
  }
  await must(s, host, L.start, '「冒険に出発」');
  const inWorld = await until(async () => (await readAll(devs)).every((v) => v.screen === 'game' && v.mode === 'world'), 30000, 300);
  if (!inWorld) {
    const vs = await readAll(devs);
    await s.judge.fail('lobby', { text: `全端末が世界マップにならない: ${vs.map((v) => `${v.seat}=${v.screen}/${v.mode}`).join(' ')}` });
    throw new LobbyStop('世界マップにならない');
  }
  await s.judge.step();
  // 物語を閉じる（どの端末にも出る。この端末で押すまで残る＝点検 F6。席の番号の順に、出ている端末で押す）
  for (let round = 0; round < 12; round++) {
    const vs = await readAll(devs);
    const i = vs.findIndex((v) => v.layers.some((l) => l.id === 'story'));
    if (i < 0) break;
    await must(s, devs[i], G.storyNext, '物語「つづける」');
    await wait(300);
  }
  await s.judge.step();
  const vs = await readAll(devs);
  const started = vs.every((v) => v.screen === 'game' && v.mode === 'world' && !v.layers.some((l) => l.id === 'story'));
  return { code, jobs, started, views: vs };
}
