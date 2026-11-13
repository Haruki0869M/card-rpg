import { CATEGORY_LABEL } from '../data/terms';
import { getStatus } from '../data/statuses';
import { BALANCE } from '../data/balance';
import { activeStatuses, actionFailChanceOf, skipActionStatus } from '../engine';
import { getElement } from '../data/elements';
import { getEnemy, getEnemyAction } from '../data/enemies';
import { breakStopsAction, describeEffect, enemyHitDamage, findAlly, lowHpMulOn, targetOf } from '../engine';
import { behaviorBadge, FRENZY_BADGE } from '../data/enemyBehaviors';
import { blockSkippedOnBreak } from '../engine';
import { breakRuleOf } from '../engine/battle/breakRules';
import type { BattleState, CardDef, CardEffect, EnemyBehaviorId, EnemyState, StatusId } from '../types';

export { CATEGORY_LABEL };
/** 状態異常の名前 */
export const STATUS_LABEL = (id: string) => getStatus(id).name;

/** Tierがカバーする成功数の範囲表記（例: "0-1", "2"） */
export function tierRange(card: CardDef, i: number): string {
  const lo = card.tiers[i].minSuccesses;
  const hi = i + 1 < card.tiers.length ? card.tiers[i + 1].minSuccesses - 1 : card.slots;
  return lo === hi ? `${lo}` : `${lo}-${hi}`;
}

export function tierTitle(card: CardDef, i: number): string {
  const lo = card.tiers[i].minSuccesses;
  if (lo === card.slots) return `${lo}成功（完全成功）`;
  return `${tierRange(card, i).replace('-', '〜')}成功`;
}

/** 詳細表示用の全文（効果の部品の説明文。全体カードなら「敵全員に」） */
export const longEffect = (e: CardEffect, card?: CardDef): string => describeEffect(e, 'ally', card);

export type IntentPart =
  | { kind: 'attack'; damage: number; hits: number; targetId?: string; element?: string }
  | { kind: 'attackAll'; damage: number; hits: number; element?: string }
  | { kind: 'block'; amount: number; others: boolean }
  | { kind: 'debuff'; status: StatusId; amount: number; targetId?: string; all: boolean }
  /** その他の効果（効果の種類のアイコン＋短い数値） */
  | { kind: 'other'; effect: CardEffect };

export interface IntentView {
  parts: IntentPart[];
  name: string;
  details: string[];
  /** 大技の予告（体勢を崩せる。BREAK） */
  big?: boolean;
  /** もう体勢を崩した（威力が半分になっている） */
  broken?: boolean;
  /** 予告の説明（敵の特殊な行動。何が起きるか・どうすれば止まるか） */
  hint?: string;
  /** 敵の特殊な行動の札（⚠️手数読み など）と、いつも出す1行の案内（src/data/enemyBehaviors.ts） */
  behavior?: { id: EnemyBehaviorId; icon: string; label: string; short: string; brief: string };
  /** 強敵の本気の予告（🔥本気の札。src/data/enemyBehaviors.ts の FRENZY_BADGE） */
  frenzy?: { icon: string; label: string; short: string; brief: string; long: string };
  /** ボスの段階の開幕の一手（🌀の札。2026-11-14）: phase = 段階の番号（2段目 = 1）・label = 札の文字・short = 狭い時の札・long = 長押しの説明 */
  opening?: { phase: number; label: string; short: string; long: string };
  /** 数え読み（2026-11-14）: left = あと何回の予告で actionName を出すか（fire = この予告がその行動）・turns = 最初の数 */
  countdown?: { left: number; turns: number; fire: boolean; actionName: string };
}

/** 予告の札の下・敵が3体以上の時の案内の1行に出す文（本気・特殊な行動）。両方の時は1つにまとめる。崩した後は出さない */
export function intentBrief(v: IntentView | null): { icon: string; text: string } | undefined {
  if (!v || v.broken) return undefined;
  if (v.frenzy) return { icon: v.frenzy.icon, text: v.behavior ? `${v.behavior.brief}・${v.frenzy.brief}` : v.frenzy.brief };
  return v.behavior ? { icon: v.behavior.icon, text: v.behavior.brief } : undefined;
}

/** インテントの表示（敵のレベル・弱体・味方の脆弱を反映した実際の値） */
export function intentView(state: BattleState, enemy: EnemyState): IntentView | null {
  if (!enemy.intent || enemy.dead) return null;
  if (enemy.skipNextAction) return { parts: [{ kind: 'other', effect: { kind: 'skipIntent' } }], name: '時間停止で休み', details: ['次の行動は休み。その後は通常の行動順へ戻る'] };
  const action = getEnemyAction(enemy.defId, enemy.intent.actionId);
  const target = enemy.intent.targetId ? findAlly(state, enemy.intent.targetId) : undefined;
  const targetName = target ? target.name : '（対象なし）';
  const parts: IntentPart[] = [];
  const details: string[] = [];
  // 強奪・BREAK で次の行動の数値が変わっている時は、その値で出す（実際の行動と同じ計算）
  const mul = enemy.nextActionMultiplier ?? 1;
  for (const raw of action.effects) {
    // 特殊な行動に足したブロックは、BREAK されると付かない（battle.ts の executeIntent と同じ）
    if (enemy.broken && blockSkippedOnBreak(action, raw)) continue;
    const eff = mul !== 1 && 'amount' in raw && raw.amount !== undefined ? { ...raw, amount: Math.floor(raw.amount * mul) } : raw;
    const to = targetOf(eff);
    if (eff.kind === 'damage') {
      const hits = eff.hits ?? 1;
      if (to === 'target') {
        // 手負い狙い: 狙った相手のHPが今、半分以下なら倍率込みの値
        const low = lowHpMulOn(eff.lowHpMul, target);
        const dmg = enemyHitDamage(enemy, eff.amount, target, low);
        parts.push({ kind: 'attack', damage: dmg, hits, targetId: target?.id, element: eff.element });
        details.push(`${targetName}に${dmg}の${elementText(eff.element)}ダメージ${hits > 1 ? `×${hits}回` : ''}${elementStatusText(eff.element)}${eff.lowHpMul ? (low !== 1 ? `（HPが半分以下なので×${eff.lowHpMul} 反映済み）` : `（当たる時にHPが半分以下なら×${eff.lowHpMul}）`) : ''}`);
      } else {
        const dmg = enemyHitDamage(enemy, eff.amount, undefined);
        parts.push({ kind: 'attackAll', damage: dmg, hits, element: eff.element });
        details.push(`味方全員に${dmg}の${elementText(eff.element)}ダメージ${hits > 1 ? `×${hits}回` : ''}${elementStatusText(eff.element)}（状態異常で増減あり）`);
      }
    } else if (eff.kind === 'block' && (to === 'self' || to === 'otherAllies' || to === 'allies')) {
      parts.push({ kind: 'block', amount: eff.amount, others: to !== 'self' });
      details.push(describeEffect(eff, 'enemy'));
    } else if (eff.kind === 'applyStatus' && (to === 'target' || to === 'foes')) {
      const all = to === 'foes';
      parts.push({ kind: 'debuff', status: eff.status, amount: eff.amount, targetId: all ? undefined : target?.id, all });
      details.push(`${all ? '味方全員' : targetName}に「${STATUS_LABEL(eff.status)}」${eff.amount}`);
    } else {
      parts.push({ kind: 'other', effect: eff });
      details.push(describeEffect(eff, 'enemy').replace('対象に', `${targetName}に`).replace('対象の', `${targetName}の`));
      // 手数読み: 今このターンに使った枚数（予定のダメージが変わる）
      if (eff.kind === 'punishPlays') {
        const live = state.allies.filter((a) => !a.dead);
        details.push(`今使った枚数: ${live.map((a) => `${a.name} ${a.played ?? 0}枚${(a.played ?? 0) >= eff.min ? `（${enemyHitDamage(enemy, (a.played ?? 0) * eff.amount, a)}ダメージ）` : ''}`).join('・')}`);
      }
    }
  }
  // 凍結・痺れ（行動を休む・失敗する）
  const frozen = skipActionStatus(enemy.statuses);
  if (frozen) details.unshift(`${frozen.name}で、この行動は休む`);
  else {
    const fail = actionFailChanceOf(enemy.statuses);
    if (fail) details.unshift(`痺れなどで${fail}%の確率で行動に失敗する`);
  }
  if (action.effects.some((e) => e.kind === 'damage')) {
    if (enemy.attackMul !== 1) details.push(`（Lv${enemy.level}の攻撃力補正 ×${enemy.attackMul.toFixed(2)} 反映済み）`);
    for (const { def } of activeStatuses(enemy.statuses))
      if (def.dealtMultiplier !== undefined) details.push(`（${def.name}によりダメージ×${def.dealtMultiplier} 反映済み）`);
  }
  if (mul !== 1) details.push(`（次の行動の威力 ×${mul} 反映済み）`);
  // ダメージの無い大技（浄化・仲間を呼ぶ・かばう・癒し封じ）は、BREAK すると起きない（battle.ts の executeIntent）
  const stops = breakStopsAction(action);
  if (enemy.broken) details.unshift(stops ? '体勢が崩れている（BREAK）: この行動は起きない' : '体勢が崩れている（BREAK）: この行動の威力は半分');
  else if (action.big) details.unshift(`大技！ ${breakHowText(state, enemy)}（BREAK: ${stops ? 'この行動は起きない' : '威力が半分'}・${breakStatusText()}・ブロック0）`);
  const badge = behaviorBadge(action);
  // 強敵の本気: 長押しの説明（DetailPopup）で、なぜ強いか・どう受けるかを出す
  // 大技でない行動は BREAK できないので、説明から「BREAK するか」を外す（pre-deploy20 の点検 1）
  const frenzy = enemy.intent.frenzy ? { ...FRENZY_BADGE, long: action.big ? FRENZY_BADGE.long : FRENZY_BADGE.longNoBreak } : undefined;
  // ボスの段階（2026-11-14）: 開幕の一手の札（🌀第2段階）と、数え読みの残り
  const opening = openingBadge(enemy);
  const cd = enemy.countdown;
  const countdown = cd ? { left: enemy.intent.countdownFire ? 0 : cd.left, turns: cd.turns, fire: !!enemy.intent.countdownFire, actionName: getEnemyAction(enemy.defId, cd.actionId).name } : undefined;
  if (countdown) details.push(countdown.fire ? `数え読みが0になった: この予告が「${countdown.actionName}」` : `数え読み: あと${countdown.left}回の予告で「${countdown.actionName}」（数えている間に BREAK すると1つ戻る）`);
  // 弱点が予告と一緒に変わる行動（満ち潮・引き潮）
  if (action.weakWhile?.length) details.push(`この予告の間の弱点: ${elementNames(action.weakWhile)}`);
  return { parts, name: action.name, details, big: !!action.big, broken: !!enemy.broken, ...(action.hint ? { hint: action.hint } : {}), ...(badge ? { behavior: badge } : {}), ...(frenzy ? { frenzy } : {}), ...(opening ? { opening } : {}), ...(countdown ? { countdown } : {}) };
}

/** 開幕の一手の札（予告の印 intent.opening がある時だけ）。段階の名前と新しい決まりを長押しの説明にする */
export function openingBadge(enemy: EnemyState): IntentView['opening'] {
  const n = enemy.intent?.opening;
  if (!n) return undefined;
  const ph = getEnemy(enemy.defId).phases?.[n - 1];
  return { phase: n, label: `第${n + 1}段階`, short: `${n + 1}段`, long: `「${ph?.name ?? ''}」になって最初の一手${ph?.rule ? `。この段階の新しい決まり: ${ph.rule}` : ''}` };
}

/** 属性の名前を「・」でつなぐ（例: 「雷・聖」） */
export const elementNames = (ids: readonly string[]) => ids.map((id) => getElement(id).name).join('・');

/**
 * 2026-11-13（docs/tasks/break-read-plan.md）: その敵の大技（紫の札を含む）を崩す方法の文（予告の長押しの説明）。決まりは breakRules.ts の breakRuleOf から読む（決まりと文がずれないように）。
 * 例（ボス・中ボス・災厄）: 「ボス・中ボス・災厄の大技は、弱点の属性（雷・聖）で、しかも完全成功で攻撃した時だけ体勢を崩せる（完全成功だけ・大きなダメージでは崩れない）」
 * 例（強敵・ふつう）: 「弱点の属性（火）で攻撃・完全成功で攻撃・このターンに最大HPの20%のダメージ、のどれかで体勢を崩せる」
 */
export function breakHowText(state: Pick<BattleState, 'boss' | 'midboss' | 'elite' | 'firstKeyBoss'>, enemy: EnemyState): string {
  const r = breakRuleOf(state, enemy);
  // 2026-11-13（docs/tasks/break-read-plan.md §2）: 紫の札（特殊な行動）も同じ決まり。どちらの理由かで、文の頭を変える
  const who = r.strictBy === 'behavior' ? '特殊な行動（紫の札）' : 'ボス・中ボス・災厄の大技';
  if (r.weakAndPerfect) return `${who}は、弱点の属性（${elementNames(r.weak)}）で、しかも完全成功で攻撃した時だけ体勢を崩せる（完全成功だけ${r.damagePct === undefined ? '・大きなダメージ' : ''}では崩れない）`;
  const ways = [
    ...(r.weakAlone ? [`弱点の属性（${elementNames(r.weak)}）で攻撃`] : []),
    ...(r.perfectAlone ? ['完全成功で攻撃'] : []),
    ...(r.damagePct !== undefined ? [`このターンに最大HPの${r.damagePct}%のダメージ`] : []),
  ];
  if (!ways.length) return 'カードや道具の「崩す」力でだけ体勢を崩せる';
  const how = ways.length > 1 ? `${ways.join('・')}、のどれかで体勢を崩せる` : `${ways[0]}${ways[0].endsWith('攻撃') ? 'した時' : 'を与えた時'}に体勢を崩せる`;
  return r.damagePct === undefined ? `${how}（大きなダメージでは崩れない）` : how;
}

/** BREAK で敵に付く状態の文（例: 「脆弱1」。balance.ts の breakStatus・breakWeak から作る） */
export const breakStatusText = () => `${getStatus(BALANCE.breakStatus).name}${BALANCE.breakWeak}`;

/** 体勢を崩した時の、その予告の最初の攻撃の値（今の値 → 崩した後の値。大技でない・もう崩した・攻撃でない時は undefined） */
/** stops = ダメージの無い大技（BREAK すると、その行動が起きない） */
export function breakPreview(state: BattleState, enemy: EnemyState): { name: string; from?: number; to?: number; stops?: boolean } | undefined {
  const now = intentView(state, enemy);
  if (!now?.big || now.broken || enemy.skipNextAction) return undefined;
  const st = BALANCE.breakStatus;
  const after = intentView(state, { ...enemy, broken: true, nextActionMultiplier: (enemy.nextActionMultiplier ?? 1) * BALANCE.breakPower, statuses: { ...enemy.statuses, [st]: (enemy.statuses[st] ?? 0) + BALANCE.breakWeak } });
  const dmg = (v: IntentView | null) => { const p = v?.parts.find((x) => x.kind === 'attack' || x.kind === 'attackAll'); return p && (p.kind === 'attack' || p.kind === 'attackAll') ? p.damage * p.hits : undefined; };
  const stops = breakStopsAction(getEnemyAction(enemy.defId, enemy.intent!.actionId));
  return { name: now.name, from: dmg(now), to: dmg(after), ...(stops ? { stops } : {}) };
}

/** 属性の名前（無属性なら空） */
const elementText = (id?: string) => (id ? `${getElement(id).name}属性の` : '').replace(/の$/, '');

/** 属性の状態異常の確率の表示 */
function elementStatusText(id?: string): string {
  const el = id ? getElement(id) : undefined;
  return el?.status ? `（${el.chance}%で${getStatus(el.status).name}${el.amount ?? 1}）` : '';
}

// ---------- カードのひとことの説明（報酬・店の説明の窓。フェーズ3 項目2） ----------
const DAMAGE_KINDS = new Set(['damage', 'damageByPlays', 'echoHit', 'playedDamage', 'rallyDamage', 'chargeAttack', 'jump']);
const HEAL_KINDS = new Set(['heal', 'fullRestore', 'healPctOfDealt']);
const CARD_TARGET_WHO: Record<CardDef['target'], string> = { enemy: '敵1体', allEnemies: '敵全体', self: '自分', ally: '味方1人', otherAlly: 'ほかの味方1人', fallenAlly: '倒れた味方' };
const EFFECT_TO_WHO: Partial<Record<NonNullable<CardEffect['to']>, string>> = {
  self: '自分',
  allies: '味方全員',
  otherAllies: 'ほかの味方全員',
  foes: '敵全体',
  randomFoe: 'ランダムな敵',
  lowestAlly: 'HPの低い味方',
  randomAlly: 'ランダムな味方',
};

/** 効果の相手の名前（効果の to → 無ければカードの対象） */
function effectWho(e: CardEffect, card: CardDef): string {
  const to = targetOf(e); // 効果ごとの既定の相手（ブロックは自分など）
  if (to === 'allyTarget') return card.secondaryTarget ? CARD_TARGET_WHO[card.secondaryTarget] : '味方1人';
  return (to !== 'target' && EFFECT_TO_WHO[to]) || CARD_TARGET_WHO[card.target];
}

/**
 * カードのひとことの説明（例: 「敵全体に物理ダメージ」「味方1人のHPを回復」「敵1体に物理ダメージ・自分にブロック」）。
 * 一番よい成功（最後の段）の効果から、主な2つまで。ダメージ・回復・ブロックの量は出さない（段ごとの説明に出す）
 */
export function cardSummary(card: CardDef): string {
  const tier = card.tiers[card.tiers.length - 1];
  const parts: string[] = [];
  for (const e of tier?.effects ?? []) {
    const who = effectWho(e, card);
    let text: string;
    if (DAMAGE_KINDS.has(e.kind)) text = `${who}に${card.category === 'skill' ? '' : CATEGORY_LABEL[card.category]}ダメージ`;
    else if (HEAL_KINDS.has(e.kind)) text = who === '自分' ? 'HPを回復' : `${who}のHPを回復`;
    else if (e.kind === 'revive') text = `${who}を復活`;
    else if (e.kind === 'block' || e.kind === 'blockFromStatus') text = `${who}にブロック`;
    else if (e.kind === 'applyStatus' && 'status' in e) text = `${who}に「${STATUS_LABEL(e.status as StatusId)}」`;
    else {
      // そのほかの効果は、ふだんの説明の文の頭だけ（かっこの中の細かい所は段ごとの説明に出す）
      const full = describeEffect(e, 'ally', card).replace(/（.*$/, '');
      text = full.length > 24 ? `${full.slice(0, 23)}…` : full;
    }
    if (!parts.includes(text)) parts.push(text);
    if (parts.length >= 2) break;
  }
  return parts.join('・') || '特殊な効果';
}
