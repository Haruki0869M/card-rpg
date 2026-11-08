// ===== 伝承の書の記録（冒険をまたいで残る、この端末だけの記録。K5） =====
// 図鑑（見た・手に入れた）とクリアの記録。冒険の状態を「見るだけ」で作る純粋な関数。
// エンジン・乱数（Rng）・冒険の状態には一切触れない。強さが冒険をまたいで上がる物は持たない。
import { BALANCE } from '../data/balance';
import { jobOptions } from '../engine/game/jobs';
import { petLoveLevel } from '../engine/game/pets';
import type { GameState, Hero, PlayerId } from '../types';

export const PROFILE_VERSION = 1;

/** 見た / 手に入れた（ID の一覧） */
export interface SeenGot {
  seen: string[];
  got: string[];
}

/** うちの子（自分のキャラが連れていたお供1匹ずつ）の、冒険1回分の思い出 */
export interface UchinokoRun {
  /** 戦闘で活躍した回数 */
  acts: number;
  /** 一緒にクリアしたダンジョンの数 */
  dc: number;
  /** 冒険の終わり（クリア / 全滅）。途中なら無し */
  end?: 'ending' | 'gameover';
}

/** うちの子図鑑の1匹（名前・色はそのまま残る。強さは持たない） */
export interface UchinokoEntry {
  uid: string;
  petId: string;
  color: string;
  name: string;
  /** 懐き度の点数（見た目だけ。一番高かった時） */
  love: number;
  /** 出会ったシナリオ */
  scenarioId: string;
  /** 冒険ごとの思い出（冒険の鍵 → 記録） */
  runs: Record<string, UchinokoRun>;
}

/** 冒険1回の記録（同じ冒険を二重に数えないための鍵と結果） */
export interface RunRecord {
  key: string;
  scenarioId: string;
  result?: 'ending' | 'gameover';
}

export interface Profile {
  version: number;
  jobs: SeenGot;
  cards: SeenGot;
  /** 装備・消耗品 */
  items: SeenGot;
  /** 敵: seen = 出会った、kills = 倒した数（got は「1体以上倒した」） */
  enemies: { seen: string[]; kills: Record<string, number> };
  /** お供: 'petId:色ID' で記録する（色ごと） */
  pets: SeenGot;
  /** シナリオごとのクリア回数・ゲームオーバーの回数 */
  clears: Record<string, number>;
  gameovers: Record<string, number>;
  /** 始めた冒険の数 */
  adventures: number;
  /** 最近の冒険（二重に数えないため。新しい順に最大 RUN_KEEP 件） */
  runs: RunRecord[];
  /** 最近数えた戦闘の勝利（二重に数えないため。最大 BATTLE_KEEP 件） */
  battles: string[];
  /** うちの子図鑑（古い順） */
  uchinoko: UchinokoEntry[];
  /** マイペットに登録した子（uid） */
  myPets: string[];
}

const RUN_KEEP = 30;
const BATTLE_KEEP = 40;
const UCHINOKO_KEEP = 200;

export function emptyProfile(): Profile {
  return {
    version: PROFILE_VERSION,
    jobs: { seen: [], got: [] },
    cards: { seen: [], got: [] },
    items: { seen: [], got: [] },
    enemies: { seen: [], kills: {} },
    pets: { seen: [], got: [] },
    clears: {},
    gameovers: {},
    adventures: 0,
    runs: [],
    battles: [],
    uchinoko: [],
    myPets: [],
  };
}

const strList = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : []);
const countMap = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, n] of Object.entries(v as Record<string, unknown>)) if (typeof n === 'number' && Number.isFinite(n) && n > 0) out[k] = Math.floor(n);
  }
  return out;
};
const seenGot = (v: unknown): SeenGot => {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<SeenGot>;
  const got = strList(o.got);
  // 手に入れた物は、見た物でもある
  return { seen: [...new Set([...strList(o.seen), ...got])], got };
};

/** 古い・壊れた記録を直して読む（読めない所は空から）。知らない ID もそのまま残す（後で中身が増えた時のため） */
export function normalizeProfile(raw: unknown): Profile {
  if (!raw || typeof raw !== 'object') return emptyProfile();
  const r = raw as Record<string, unknown>;
  const en = (r.enemies && typeof r.enemies === 'object' ? r.enemies : {}) as Record<string, unknown>;
  const kills = countMap(en.kills);
  const runs = Array.isArray(r.runs)
    ? (r.runs as unknown[]).filter((x): x is RunRecord => !!x && typeof x === 'object' && typeof (x as RunRecord).key === 'string' && typeof (x as RunRecord).scenarioId === 'string')
        .map((x) => ({ key: x.key, scenarioId: x.scenarioId, ...(x.result === 'ending' || x.result === 'gameover' ? { result: x.result } : {}) }))
        .slice(0, RUN_KEEP)
    : [];
  const uchinoko = normalizeUchinoko(r.uchinoko);
  return {
    version: PROFILE_VERSION,
    jobs: seenGot(r.jobs),
    cards: seenGot(r.cards),
    items: seenGot(r.items),
    enemies: { seen: [...new Set([...strList(en.seen), ...Object.keys(kills)])], kills },
    pets: seenGot(r.pets),
    clears: countMap(r.clears),
    gameovers: countMap(r.gameovers),
    adventures: typeof r.adventures === 'number' && r.adventures > 0 ? Math.floor(r.adventures) : 0,
    runs,
    battles: strList(r.battles).slice(-BATTLE_KEEP),
    uchinoko,
    myPets: strList(r.myPets).filter((uid) => uchinoko.some((e) => e.uid === uid)),
  };
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
function normalizeUchinoko(v: unknown): UchinokoEntry[] {
  if (!Array.isArray(v)) return [];
  const out: UchinokoEntry[] = [];
  for (const x of v as Record<string, unknown>[]) {
    if (!x || typeof x !== 'object') continue;
    if (typeof x.uid !== 'string' || typeof x.petId !== 'string' || typeof x.color !== 'string' || out.some((e) => e.uid === x.uid)) continue;
    const runs: Record<string, UchinokoRun> = {};
    if (x.runs && typeof x.runs === 'object') {
      for (const [k, r] of Object.entries(x.runs as Record<string, Record<string, unknown>>)) {
        if (!r || typeof r !== 'object') continue;
        runs[k] = { acts: num(r.acts), dc: num(r.dc), ...(r.end === 'ending' || r.end === 'gameover' ? { end: r.end } : {}) };
      }
    }
    out.push({ uid: x.uid, petId: x.petId, color: x.color, name: typeof x.name === 'string' ? x.name : '', love: num(x.love), scenarioId: typeof x.scenarioId === 'string' ? x.scenarioId : '', runs });
  }
  return out.slice(-UCHINOKO_KEEP);
}

/** うちの子の思い出の合計（冒険の数・クリアの数・一緒にクリアしたダンジョン・活躍） */
export function uchinokoTotals(e: UchinokoEntry) {
  const rs = Object.values(e.runs);
  return {
    adventures: rs.length,
    clears: rs.filter((r) => r.end === 'ending').length,
    dungeonClears: rs.reduce((n, r) => n + r.dc, 0),
    acts: rs.reduce((n, r) => n + r.acts, 0),
  };
}

/** マイペットに登録できるか（懐き度♡5か、ダンジョンを一緒に3回クリア。1回の冒険の中でもよい。オーナー決定） */
export const canBeMyPet = (e: UchinokoEntry) => petLoveLevel(e.love) >= 5 || uchinokoTotals(e).dungeonClears >= BALANCE.myPetDungeonClears;

/** マイペットに登録する / 外す（登録できない子は登録しない） */
export function setMyPet(p: Profile, uid: string, on: boolean): Profile {
  const e = p.uchinoko.find((x) => x.uid === uid);
  if (on) return e && canBeMyPet(e) && !p.myPets.includes(uid) ? { ...p, myPets: [...p.myPets, uid] } : p;
  return p.myPets.includes(uid) ? { ...p, myPets: p.myPets.filter((x) => x !== uid) } : p;
}

/** うちの子の ID（マイペットから呼んだ子はその ID。冒険の中で迎えた子は、冒険・キャラ・種類・色・名前から作る） */
export const uchinokoUid = (game: Pick<GameState, 'seed'>, h: Hero) =>
  h.pet!.myPetUid ?? `${game.seed}-${h.id}-${h.pet!.petId}-${h.pet!.color}-${h.pet!.name}`;

/** クリアしたシナリオの ID（シナリオの解放に使う） */
/** お供を迎える画面の「NEW!」: この種類・毛色の子を、まだ一度も迎えたことがない（伝承の書の got に「種類:色」が無い） */
export const isNewPetCoat = (p: Pick<Profile, 'pets'>, petId: string, color: string): boolean => !p.pets.got.includes(`${petId}:${color}`);
export const clearedScenarioIds = (p: Pick<Profile, 'clears'>): string[] => Object.keys(p.clears).filter((id) => p.clears[id] > 0);

/** 冒険の状態から見つけた物（1回分） */
export interface Sightings {
  jobs: SeenGot;
  cards: SeenGot;
  items: SeenGot;
  enemies: string[];
  /** 勝った戦闘（鍵と、倒した敵） */
  victories: { key: string; kills: string[] }[];
  pets: SeenGot;
  run: { key: string; scenarioId: string; result?: 'ending' | 'gameover' };
  /** この端末のキャラが今連れているお供（うちの子図鑑へ） */
  myPets: { uid: string; petId: string; color: string; name: string; love: number; acts: number; dc: number }[];
}

/** 冒険を見分ける鍵（同じ種・同じシナリオ・同じ顔ぶれ） */
export const runKey = (g: Pick<GameState, 'seed' | 'scenarioId' | 'heroes'>) => `${g.seed}:${g.scenarioId}:${g.heroes.map((h) => h.id).join(',')}`;

/**
 * 冒険の状態から、図鑑に載せる物を集める。
 * isMine = この端末で操作するプレイヤーか（オンラインでは自分の席だけ。1台で遊ぶ時は全員）。
 * 「見た」は画面に出た物全部、「手に入れた」は自分のキャラの物だけ。
 */
export function collectSightings(game: GameState, isMine: (p: PlayerId) => boolean): Sightings {
  const s: Sightings = {
    jobs: { seen: [], got: [] },
    cards: { seen: [], got: [] },
    items: { seen: [], got: [] },
    enemies: [],
    victories: [],
    pets: { seen: [], got: [] },
    myPets: [],
    run: { key: runKey(game), scenarioId: game.scenarioId, ...(game.mode === 'ending' || game.mode === 'gameover' ? { result: game.mode } : {}) },
  };
  const mine = (h: Hero) => isMine(h.playerId);
  for (const h of game.heroes) {
    const own = mine(h);
    const cards = h.deck.filter((c) => !c.fromWeapon).map((c) => c.cardId);
    const items = [...Object.values(h.equipment).filter((i) => !!i).map((i) => i!.itemId), ...h.stash.map((i) => i.itemId), ...h.pouch.map((i) => i.itemId)];
    s.cards.seen.push(...cards);
    s.items.seen.push(...items);
    const jobs = [...new Set([...(h.jobs ?? []), h.classId])];
    s.jobs.seen.push(...jobs);
    if (own) {
      s.cards.got.push(...cards);
      s.items.got.push(...items);
      s.jobs.got.push(...jobs);
      // 転職の候補に出たジョブ（自分のキャラの分）
      try {
        s.jobs.seen.push(...jobOptions(h).map((o) => o.job.id));
      } catch {
        /* 古いデータで引けない時は数えない */
      }
    }
    if (h.pet) {
      const k = `${h.pet.petId}:${h.pet.color}`;
      s.pets.seen.push(k);
      if (own) {
        s.pets.got.push(k);
        const p = h.pet;
        s.myPets.push({ uid: uchinokoUid(game, h), petId: p.petId, color: p.color, name: p.name, love: p.love, acts: p.acts, dc: p.dungeonClears ?? 0 });
      }
    }
    for (const id of h.petOffer ?? []) {
      const col = h.petOfferColors?.[id];
      if (col) s.pets.seen.push(`${id}:${col}`);
    }
    if (h.peddler) {
      s.items.seen.push(...h.peddler.items.map((x) => x.item.itemId));
      s.cards.seen.push(...h.peddler.cards.map((x) => x.cardId));
    }
  }
  // 戦闘・報酬・宝箱は、世界マップ側と、ダンジョンの場面（expeditions）の両方を見る
  const scenes = [game, ...(game.expeditions ?? [])];
  for (const sc of scenes) {
    const b = sc.battle;
    if (b) {
      s.enemies.push(...b.enemies.map((e) => e.defId));
      if (b.phase === 'victory' && b.allies.some((a) => isMine(a.playerId))) {
        s.victories.push({ key: `${game.seed}:${b.seed}:${b.encounterId}`, kills: b.enemies.filter((e) => e.hp <= 0).map((e) => e.defId) });
      }
    }
    const r = sc.reward;
    if (r) {
      s.cards.seen.push(...r.cardOffers.map((o) => o.cardId));
      for (const l of r.loot) {
        if (l.kind === 'item') s.items.seen.push(l.item.itemId);
        else if (l.kind === 'card') s.cards.seen.push(l.cardId);
      }
    }
    for (const l of sc.chest?.contents ?? []) {
      if (l.kind === 'item') s.items.seen.push(l.item.itemId);
      else if (l.kind === 'card') s.cards.seen.push(l.cardId);
    }
  }
  // 町の品揃えは、今いる町の分だけ（画面に出ている物）
  const townId = game.town?.townId;
  const shop = townId ? game.world?.shops[townId] : undefined;
  if (shop) {
    s.items.seen.push(...shop.items.map((x) => x.item.itemId));
    s.cards.seen.push(...shop.cards.map((x) => x.cardId));
  }
  return s;
}

/** 一覧に足す（増えた時だけ新しい配列を返す） */
function addAll(list: string[], add: string[]): string[] {
  const set = new Set(list);
  let changed = false;
  for (const x of add) {
    if (!set.has(x)) {
      set.add(x);
      changed = true;
    }
  }
  return changed ? [...set] : list;
}
function addSeenGot(cur: SeenGot, add: SeenGot): SeenGot {
  const got = addAll(cur.got, add.got);
  const seen = addAll(cur.seen, [...add.seen, ...add.got]);
  return got === cur.got && seen === cur.seen ? cur : { seen, got };
}

/** 記録に足す。何も増えなければ同じ物を返す（保存しなくてよい） */
export function mergeSightings(p: Profile, s: Sightings): Profile {
  let next: Profile = p;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    if (v !== next[k]) next = { ...next, [k]: v };
  };
  set('jobs', addSeenGot(p.jobs, s.jobs));
  set('cards', addSeenGot(p.cards, s.cards));
  set('items', addSeenGot(p.items, s.items));
  set('pets', addSeenGot(p.pets, s.pets));
  const fresh = s.victories.filter((v) => !p.battles.includes(v.key));
  const kills = fresh.flatMap((v) => v.kills);
  const seenEnemies = addAll(p.enemies.seen, [...s.enemies, ...kills]);
  if (seenEnemies !== p.enemies.seen || kills.length) {
    const k = { ...p.enemies.kills };
    for (const id of kills) k[id] = (k[id] ?? 0) + 1;
    set('enemies', { seen: seenEnemies, kills: k });
  }
  if (fresh.length) set('battles', [...p.battles, ...fresh.map((v) => v.key)].slice(-BATTLE_KEEP));
  // 冒険の始まりと終わり（クリア・ゲームオーバー）を1回ずつ数える
  const old = p.runs.find((r) => r.key === s.run.key);
  if (!old) {
    set('adventures', p.adventures + 1);
    set('runs', [{ key: s.run.key, scenarioId: s.run.scenarioId }, ...p.runs].slice(0, RUN_KEEP));
  }
  if (s.run.result && !old?.result) {
    const runs = next.runs.map((r) => (r.key === s.run.key ? { ...r, result: s.run.result } : r));
    set('runs', runs);
    if (s.run.result === 'ending') set('clears', { ...p.clears, [s.run.scenarioId]: (p.clears[s.run.scenarioId] ?? 0) + 1 });
    else set('gameovers', { ...p.gameovers, [s.run.scenarioId]: (p.gameovers[s.run.scenarioId] ?? 0) + 1 });
  }
  // うちの子図鑑: 自分のキャラが連れているお供の、名前・懐き度・この冒険の思い出
  if (s.myPets.length) {
    let list = next.uchinoko;
    for (const m of s.myPets) {
      const i = list.findIndex((e) => e.uid === m.uid);
      const old = i >= 0 ? list[i] : undefined;
      const prevRun = old?.runs[s.run.key];
      const run: UchinokoRun = { acts: Math.max(prevRun?.acts ?? 0, m.acts), dc: Math.max(prevRun?.dc ?? 0, m.dc), ...((s.run.result ?? prevRun?.end) ? { end: prevRun?.end ?? s.run.result } : {}) };
      const love = Math.max(old?.love ?? 0, m.love);
      const same = old && old.name === m.name && old.love === love && prevRun && prevRun.acts === run.acts && prevRun.dc === run.dc && prevRun.end === run.end;
      if (same) continue;
      const entry: UchinokoEntry = { uid: m.uid, petId: m.petId, color: m.color, name: m.name, love, scenarioId: old?.scenarioId ?? s.run.scenarioId, runs: { ...(old?.runs ?? {}), [s.run.key]: run } };
      list = i >= 0 ? list.map((e, j) => (j === i ? entry : e)) : [...list, entry];
    }
    if (list !== next.uchinoko) {
      // 多すぎたら、マイペットでない古い子から外す
      while (list.length > UCHINOKO_KEEP) {
        const k = list.findIndex((e) => !next.myPets.includes(e.uid));
        list = list.filter((_, j) => j !== (k >= 0 ? k : 0));
      }
      set('uchinoko', list);
    }
  }
  return next;
}
