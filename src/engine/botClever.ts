// ===== 工夫する bot（計画書 第2版 §5-3 の「工夫する bot」）=====
// 普通の bot（bot.ts）を土台に、bot.ts から memo.clever の時だけ呼ぶ部品。
// 「人の上手さの真似」ではなく「工夫が効いているかを見る道具」。ずるをしない:
//   - 見るのは、画面に出ている情報だけ（敵の予告・大技の印・弱点の案内・HP・誰がどの敵を殴ったか・霧の晴れたマス）。
//   - これから引く乱数・霧の中の物・部屋の中身は見ない。
//   - 乱数は使わない（判断は全部、決まった順の比べ合い）。ゲームの乱数の流れは、送る操作だけで変わる。
// 数字（「HPが6割より上なら寄り道」など）は bot の作戦の提案で、ゲームの中身ではない。
import { cardOf } from '../data/cards';
import { getEnemyAction } from '../data/enemies';
import { BALANCE } from '../data/balance';
import { elementGuide } from '../components/battle/elementGuide';
import type { AllyState, BattleState, CardDef, Command, EnemyState, GameCommand, GameState, Hero } from '../types';
import { cardTargets, isAllyCard, secondaryCard } from './battle/targets';
import { unitIdOf } from './battle/units';
import { canBreak, comboStage, needsWeakPerfect, perfectAloneBreaks, targetOf } from './battle/effects';
import { allyHasWeakCard } from './battle/breakRules';
import { isDone, tierDamageAgainst, unusableReason } from './battle/battle';
import { aliveScourges } from './game/world/scourgeCurse';
import { isRandomDungeonTile } from './game/world/randomDungeons';
import { hexDistance } from './game/world/hex';
import { heroMaxHp, jobWeapons } from './game/hero';
import { jobOptions } from './game/jobs';
import { livingHeroes } from './game/heroes';
import { rarityIndex } from './game/dungeon';
import { getItem } from '../data/items';
import { pouchOverflow } from './game/common';

/** 工夫する bot の覚え（BotMemo に入れる） */
export interface CleverMemo {
  /** ランダムダンジョンに入った回数（入口で入った時に数える） */
  randomTries: number;
  /** 災厄に挑んだ回数（遭遇の画面が出た時に数える） */
  scourgeTries: number;
  /** 数えた遭遇（同じ遭遇を2回数えない） */
  seenEncounters: Set<string>;
  /** 測る道具用: 外す工夫（どの工夫が効いているかを1つずつ外して確かめる）。battle = 戦闘の工夫 / job = 転職 / detour = 寄り道 / hone = 技を磨く */
  off?: Set<CleverPart>;
}

export type CleverPart = 'battle' | 'job' | 'detour' | 'hone';

export const newCleverMemo = (off: CleverPart[] = []): CleverMemo => ({ randomTries: 0, scourgeTries: 0, seenEncounters: new Set(), off: new Set(off) });

/** その工夫を使うか */
export const cleverUses = (cm: CleverMemo | undefined, part: CleverPart) => !!cm && !cm.off?.has(part);

/** 寄り道（ランダムダンジョン・災厄）の目標の数と、挑み直す上限（bot の作戦の提案） */
const RANDOM_GOAL = 1;
const RANDOM_MAX_TRIES = 2;
const SCOURGE_GOAL = 1;
const SCOURGE_MAX_TRIES = 2;
/** 寄り道を始めてよい、パーティのHPの割合（全員がこれより上） */
const DETOUR_HP = 0.6;
/** 見晴らしの塔へ寄ってよい距離（災厄の場所が霧の中の時だけ） */
const TOWER_DETOUR = 8;

// ---------- レベル ----------

/**
 * 転職を入れた「育ち具合」のレベル（レベル上げの目安にだけ使う）。
 * 転職すると Lv1 に戻るので、そのままのレベルで比べると、転職のたびにレベル上げをやり直してしまう。
 * 中位の Lv1 ≒ 基本の Lv（転職できるレベル）、最上位の Lv1 ≒ その上、として足す（提案）
 */
export function effectiveLevel(h: Hero): number {
  const n = h.jobs?.length ?? 0;
  return h.level + (n >= 1 ? BALANCE.jobChange.base - 1 : 0) + (n >= 2 ? BALANCE.jobChange.mid - 1 : 0);
}

// ---------- 世界マップの寄り道 ----------

/**
 * 寄り道の行き先（無ければ undefined）。1つ目の鍵を取った後だけ（敵の強さに追いつく前に寄り道で倒れないように）。
 * - 災厄: 霧が晴れて見えている災厄へ（倒した数が目標に届くまで・挑む回数の上限まで）。見えていなければ、近くの見晴らしの塔へ。
 * - ランダムダンジョン: 見えている、まだ踏破していないランダムダンジョンへ（目標に届くまで・上限まで）。
 */
export function cleverDetour(g: GameState, at: number, cm: CleverMemo): { tile: number; why: 'town' | 'grind' | 'dungeon'; kind: 'scourge' | 'tower' | 'random' } | undefined {
  const w = g.world!;
  if (w.keys.length < 1) return undefined;
  const heroes = livingHeroes(g);
  if (heroes.some((h) => h.hp <= heroMaxHp(h) * DETOUR_HP)) return undefined;
  const near = (tiles: number[]) => [...tiles].sort((a, b) => hexDistance(w, at, a) - hexDistance(w, at, b) || a - b)[0];
  // 災厄（倒した数 = 出た数 − 生きている数）
  const alive = aliveScourges(w);
  const killed = (w.scourgesMet?.length ?? 0) - alive.length;
  if (killed < SCOURGE_GOAL && cm.scourgeTries < SCOURGE_MAX_TRIES && alive.length) {
    const seen = alive.filter(({ wd }) => w.tiles[wd.tile].seen).map(({ wd }) => wd.tile);
    const t = near(seen);
    if (t !== undefined) return { tile: t, why: 'grind', kind: 'scourge' };
    // 「場所は霧の中。見晴らしの塔に登ると見える」: 見えている、まだ登っていない塔が近ければ登る
    const towers = w.tiles.flatMap((x, i) => (x.f?.kind === 'tower' && !x.f.used && x.seen && hexDistance(w, at, i) <= TOWER_DETOUR ? [i] : []));
    const tw = near(towers);
    if (tw !== undefined) return { tile: tw, why: 'dungeon', kind: 'tower' };
  }
  // ランダムダンジョン
  const done = w.tiles.filter((x) => isRandomDungeonTile(x.f) && x.f!.used).length;
  if (done < RANDOM_GOAL && cm.randomTries < RANDOM_MAX_TRIES) {
    const rd = w.tiles.flatMap((x, i) => (isRandomDungeonTile(x.f) && !x.f!.used && x.seen ? [i] : []));
    const t = near(rd);
    if (t !== undefined) return { tile: t, why: 'dungeon', kind: 'random' };
  }
  return undefined;
}

/** 遭遇の画面が出た時: 災厄との遭遇なら、挑んだ回数を数える */
export function noteEncounter(g: GameState, cm: CleverMemo) {
  const e = g.encounter;
  const w = g.world;
  if (!e || !w) return;
  const key = `${w.worldTurn}:${e.wandererId}`;
  if (cm.seenEncounters.has(key)) return;
  cm.seenEncounters.add(key);
  if (w.wanderers.find((x) => x.id === e.wandererId)?.scourge) cm.scourgeTries++;
}

// ---------- 転職 ----------

/**
 * 転職の操作（無ければ undefined）。転職のカードの選択が残っていれば先に選ぶ。
 * 転職は「今その場でできる」時だけ（転職のための寄り道はしない）。選ぶ順: 最上位 → 中位 → 特殊。
 * 同じ段では、今持っている武器を使えるジョブ（装備を付け替えずに済む）→ 一覧の順
 */
export function jobCommand(g: GameState, heroes: Hero[]): GameCommand | undefined {
  for (const h of heroes) {
    if (h.jobPick?.length) return { type: 'PICK_JOB_CARD', playerId: h.playerId, heroId: h.id, cardId: h.jobPick[0] };
  }
  const order = { top: 0, mid: 1, special: 2 } as Record<string, number>;
  for (const h of heroes) {
    if (h.hp <= 0 || h.retired) continue;
    const opts = jobOptions(h, g).filter((o) => o.ready);
    if (!opts.length) continue;
    const wt = h.equipment.weapon ? getItem(h.equipment.weapon.itemId).weaponType : undefined;
    const fits = (id: string) => (wt && jobWeapons(id).includes(wt) ? 0 : 1);
    const pick = [...opts].sort((a, b) => (order[a.job.tier ?? ''] ?? 3) - (order[b.job.tier ?? ''] ?? 3) || fits(a.job.id) - fits(b.job.id))[0];
    return { type: 'CHANGE_JOB', playerId: h.playerId, heroId: h.id, jobId: pick.job.id };
  }
  return undefined;
}

// ---------- カードの作業（技を磨く・祭壇・イベント） ----------

/** カードの値打ち（強化で選ぶ順）: 格が高い → 枠が多い → 山札の後ろ（後から手に入れた札） */
const cardWorth = (h: Hero, uid: string) => {
  const i = h.deck.findIndex((c) => c.uid === uid);
  const c = cardOf(h.deck[i]);
  return rarityIndex(c.rarity ?? 'common') * 100 + c.slots * 10 + i / 100;
};

/** カードを1枚選ぶ作業が残っているキャラがいれば、その操作 */
export function cardTaskCommand(heroes: Hero[]): GameCommand | undefined {
  for (const h of heroes) {
    const task = h.cardTask;
    if (!task) continue;
    const up = h.deck.filter((c) => !c.upgraded).sort((a, b) => cardWorth(h, b.uid) - cardWorth(h, a.uid));
    if (task === 'upgrade' || task === 'altar') return { type: 'CARD_TASK', playerId: h.playerId, heroId: h.id, cardUid: up[0]?.uid, altar: task === 'altar' ? 'upgrade' : undefined };
    // 外す・変異: いちばん値打ちの低い札（最初の山札の基本の札が先に来る）
    const low = [...h.deck].sort((a, b) => cardWorth(h, a.uid) - cardWorth(h, b.uid))[0];
    if (task === 'remove' && h.deck.length <= BALANCE.minDeckSize) return { type: 'CARD_TASK', playerId: h.playerId, heroId: h.id };
    return { type: 'CARD_TASK', playerId: h.playerId, heroId: h.id, cardUid: low?.uid };
  }
  return undefined;
}

/**
 * 漂流物の山（漂流物の洞。2026-11-16）の候補が残っているキャラがいれば、その操作（どの bot も選ぶ）。
 * 格がいちばん高い品（同じ格なら左）。袋に入らずお金に換わる品は後回し
 */
export function flotsamCommand(heroes: Hero[]): GameCommand | undefined {
  for (const h of heroes) {
    const offer = h.flotsam;
    if (!offer?.length) continue;
    const worth = (id: string) => rarityIndex(getItem(id).rarity) * 10 - (pouchOverflow(h, id) ? 100 : 0);
    const index = offer.reduce((best, id, i) => (worth(id) > worth(offer[best]) ? i : best), 0);
    return { type: 'FLOTSAM_PICK', playerId: h.playerId, heroId: h.id, index };
  }
  return undefined;
}

/** 休憩の選び方: だれかのHPが6割以下なら回復、そうでなければ技を磨く（磨ける札が無ければ回復） */
export function restKind(heroes: Hero[]): 'hp' | 'upgrade' {
  if (heroes.some((h) => h.hp <= heroMaxHp(h) * DETOUR_HP)) return 'hp';
  return heroes.some((h) => h.deck.some((c) => !c.upgraded)) ? 'upgrade' : 'hp';
}

// ---------- 戦闘 ----------

const hasDamage = (card: CardDef) => card.tiers.some((t) => t.effects.some((e) => e.kind === 'damage'));
const isAttack = (card: CardDef) => (card.target === 'enemy' || card.target === 'allEnemies') && hasDamage(card);
/** ブロックだけのカード（自分に使う。盾砕きの予告の時は使わない） */
const blockOnly = (card: CardDef) => card.target === 'self' && card.tiers.every((t) => t.effects.every((e) => e.kind === 'block'));
const healCard = (card: CardDef) => isAllyCard(card) && card.tiers.some((t) => t.effects.some((e) => e.kind === 'heal'));

/** 予告から読める、このターンの注意（画面の予告の欄に出ている事だけ） */
export interface Warnings {
  /** 手数読み: 1人がこのターンに使ってよいカードの枚数（無ければ Infinity） */
  playLimit: number;
  /** 盾砕きで狙われている味方（ブロックに頼らない） */
  shieldBreak: Set<string>;
  /** 癒し封じの予告がある（回復を先に使う） */
  healSeal: boolean;
}

/** テストでも使う（敵の特殊な行動の直しで、新しい形の行動でも働くかを確かめる） */
export function readWarnings(b: BattleState): Warnings {
  const w: Warnings = { playLimit: Infinity, shieldBreak: new Set(), healSeal: false };
  for (const e of b.enemies) {
    if (e.dead || !e.intent) continue;
    const act = getEnemyAction(e.defId, e.intent.actionId);
    for (const eff of act.effects) {
      if (eff.kind === 'punishPlays') w.playLimit = Math.min(w.playLimit, eff.min - 1);
      if (eff.kind === 'shieldBreak' && !e.broken) {
        if (targetOf(eff) === 'target' && e.intent.targetId) w.shieldBreak.add(e.intent.targetId);
        else for (const a of b.allies) w.shieldBreak.add(a.id);
      }
      if (eff.kind === 'applyStatus' && eff.status === 'healSeal' && !e.broken) w.healSeal = true;
    }
  }
  return w;
}

/** 早く倒したい予告（倒すか BREAK すれば止まる: 仲間を呼ぶ・浄化） */
const urgentIntent = (e: EnemyState) => {
  if (!e.intent || e.broken) return false;
  return getEnemyAction(e.defId, e.intent.actionId).effects.some((x) => x.kind === 'summonEnemy' || x.kind === 'purify');
};

/** 1枚の攻撃カードを、その敵に使った時の点（高いほど先に使う）と、使うフォーカス */
function attackScore(b: BattleState, a: AllyState, card: CardDef, e: EnemyState): { score: number; focus: number } {
  const normalFocus = card.slots >= 3 ? Math.min(card.slots, a.focus) : 0;
  const guide = elementGuide(b, a, card, e);
  let score = 20;
  let focus = normalFocus;
  if (guide?.kind === 'weak') score += 40;
  if (guide?.kind === 'resist') score -= 40;
  if (canBreak(e)) {
    // 大技の予告: 弱点で当てれば崩れる。弱点でなければ、フォーカスを全部の枠に入れて完全成功で崩す（足りれば）
    // つまみの測定（2026-11-13）: BREAK の決まりを変えた時は、画面の説明と同じ決まりで考える（既定の決まりでは、前と全く同じ点）
    // つまみの測定2: 大物だけの決まり（ア）・弱点を突けない人（イ）・重い一撃（エ）も、エンジンと同じ関数で考える（既定の決まりでは前と同じ点）
    // 2026-11-13: 紫の札（特殊な行動）の決まりも、エンジンと同じ関数（敵を渡す）で考える
    if (guide?.kind === 'weak' && !needsWeakPerfect(b, e)) score += 60;
    else if (guide?.kind === 'weak' && card.slots <= a.focus) {
      focus = card.slots;
      score += 60;
    } else if (guide?.kind !== 'weak' && card.slots <= a.focus && perfectAloneBreaks(b, e, { card, focusUsed: card.slots, hasWeakCard: () => allyHasWeakCard(a, e) })) {
      focus = card.slots;
      score += 50;
    } else score += 25; // 合計ダメージ（最大HPの2割）で崩せるかもしれない
  }
  if (urgentIntent(e)) score += 30;
  // 連携: このターンに、ほかの味方がもう殴った敵（連携の段階が上がる）
  if (comboStage(a, e) > 0) score += 20;
  // 倒しきれそうな敵（予告の数字と同じ、カードの一番上の段のダメージで見る）
  const top = tierDamageAgainst(a, card, e).at(-1) ?? 0;
  if (top >= e.hp + e.block) score += 15;
  score += 10 * (1 - e.hp / Math.max(1, e.maxHp));
  return { score, focus };
}

/**
 * 賢い bot（botSmart.ts）の「仲間どうしの連携」が、点を足し引きするための口。
 * 渡さない時（工夫する bot）は、今までと全く同じ動き。
 */
export interface BattleAdjust {
  /** 攻撃カードを敵 e に使う時の点とフォーカスを直す */
  attack(a: AllyState, card: CardDef, e: EnemyState, s: { score: number; focus: number }): { score: number; focus: number };
  /** 攻撃でないカードの点を直す（kind = ブロックだけ / 回復 / ほか）。targetId = 回復の相手 */
  other(a: AllyState, card: CardDef, kind: 'block' | 'heal' | 'other', score: number, targetId?: string): number;
}

/**
 * 工夫する bot の、味方の番の1手（無ければ undefined = 番を終える）。
 * - 弱点のカードを先に・耐性の敵は避ける（弱点の案内と同じ判断）
 * - 大技の予告の敵を、弱点か完全成功（フォーカス）で崩す
 * - 連携: いちばん点の高い1手を、味方全員の中から選ぶ。同じ点なら、このターンに使った枚数が少ない味方から（味方が交互に殴る）
 * - 手数読みの予告: 1人の枚数を止める。盾砕きで狙われている味方は、ブロックだけのカードを使わない
 * - 仲間を呼ぶ・浄化の予告の敵を先に。かばう敵がいる時の単体攻撃は、かばう敵に向ける（どのみち吸われる）
 */
export function cleverBattleCommand(b: BattleState, adjust?: BattleAdjust): Command | undefined {
  const warn = readWarnings(b);
  const foes = b.enemies.filter((e) => !e.dead);
  const guard = foes.find((e) => e.guarding);
  // 味方への支援の相手: 普通の bot と同じく、HPの割合が一番低い味方
  const lowest = <T extends { hp: number; maxHp: number }>(xs: T[]) => [...xs].sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
  let best: { score: number; cmd: Command } | undefined;
  for (const a of b.allies) {
    if (isDone(b, a)) continue;
    if ((a.played ?? 0) >= warn.playLimit) continue;
    const rotation = -3 * (a.played ?? 0);
    for (const c of a.hand) {
      const card = cardOf(c);
      if (unusableReason(b, a, card, c.uid)) continue;
      let score: number;
      let targetId: string | undefined;
      let allyTargetId: string | undefined;
      let focus = card.slots >= 3 ? Math.min(card.slots, a.focus) : 0;
      if (isAttack(card)) {
        if (card.target === 'enemy') {
          // 区切り3b: 吹雪に隠れている敵（白狼王）には、単体の攻撃は外れる。相手から外す（隠れている敵しかいなければ、このカードは使わない = 全体攻撃・守りに回る）
          const cands = guard ? [guard] : foes.filter((e) => !e.hidden);
          let pick: { score: number; focus: number; e: EnemyState } | undefined;
          for (const e of cands) {
            const s0 = attackScore(b, a, card, e);
            const s = adjust ? adjust.attack(a, card, e, s0) : s0;
            if (!pick || s.score > pick.score) pick = { ...s, e };
          }
          if (!pick) continue;
          score = pick.score;
          focus = pick.focus;
          targetId = pick.e.uid;
        } else {
          // 全体攻撃: 敵の中で一番点の高い相手で数える。かばう敵がいる時は、全体攻撃が通るので少し上げる
          score = Math.max(...foes.map((e) => (adjust ? adjust.attack(a, card, e, attackScore(b, a, card, e)) : attackScore(b, a, card, e)).score)) + (guard || foes.some((e) => e.hidden) ? 15 : 0) + 5 * (foes.length - 1);
        }
      } else if (card.target === 'enemy') {
        // ダメージの無い、敵1体へのカード（弱体など）: かばう敵がいればその敵、いなければ大技の予告の敵 → 左の敵
        const t = guard ?? foes.find((e) => canBreak(e)) ?? foes[0];
        targetId = t?.uid;
        score = 14;
      } else if (isAllyCard(card)) {
        // 支援・回復: 一番弱っている味方へ（普通の bot と同じ）。癒し封じの予告・弱った味方がいれば回復を先に
        const t = lowest(cardTargets(b, a, card));
        targetId = t ? unitIdOf(t) : undefined;
        score = 15;
        if (healCard(card) && t) {
          const ratio = t.hp / Math.max(1, t.maxHp);
          score += ratio < 0.5 ? 40 : ratio < 0.8 ? 10 : -10;
          if (warn.healSeal && ratio < 1) score += 25;
        }
        if (adjust) score = adjust.other(a, card, healCard(card) ? 'heal' : 'other', score, targetId);
      } else if (blockOnly(card)) {
        if (warn.shieldBreak.has(a.id)) continue;
        score = 10;
        if (adjust) score = adjust.other(a, card, 'block', score);
      } else score = 12;
      if (card.secondaryTarget) {
        const t2 = lowest(cardTargets(b, a, secondaryCard(card)));
        allyTargetId = t2 ? unitIdOf(t2) : undefined;
      }
      score += rotation;
      if (!best || score > best.score) {
        best = { score, cmd: { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: c.uid, targetId, allyTargetId, focusUsed: focus } };
      }
    }
  }
  return best?.cmd;
}
