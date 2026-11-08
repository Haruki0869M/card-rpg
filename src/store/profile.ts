// ===== 伝承の書の記録（冒険をまたいで残る、この端末だけの記録。K5） =====
// 図鑑（見た・手に入れた）とクリアの記録。冒険の状態を「見るだけ」で作る純粋な関数。
// エンジン・乱数（Rng）・冒険の状態には一切触れない。強さが冒険をまたいで上がる物は持たない。
import { jobOptions } from '../engine/game/jobs';
import type { GameState, Hero, PlayerId } from '../types';

export const PROFILE_VERSION = 1;

/** 見た / 手に入れた（ID の一覧） */
export interface SeenGot {
  seen: string[];
  got: string[];
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
}

const RUN_KEEP = 30;
const BATTLE_KEEP = 40;

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
  };
}

/** クリアしたシナリオの ID（シナリオの解放に使う） */
export const clearedScenarioIds = (p: Profile): string[] => Object.keys(p.clears).filter((id) => p.clears[id] > 0);

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
      if (own) s.pets.got.push(k);
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
  return next;
}
