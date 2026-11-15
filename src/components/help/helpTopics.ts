// ===== 遊び方・用語集の中身（Step A ③） =====
// 読むだけのデータ。冒険の状態・乱数には触れない。数値は balance.ts などから読み、書き写さない（ずれないように）。
import { BALANCE } from '../../data/balance';
import { getStatus } from '../../data/statuses';
import { OMEN_INFO } from '../../engine/game/dungeonOmen';
import { breakDamagePctOf, needsWeakPerfect } from '../../engine/battle/effects';
import { ENEMIES } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { DUNGEON_THEMES } from '../../data/rules';
import { getScenario } from '../../data/scenarios';
import { SCOURGES, TERRAINS } from '../../data/world';
import { CHEST_NAME } from '../../data/terms';
import { OFFLINE_GRACE_MS } from '../../net/room';
import type { ScourgeDef } from '../../types';

/** BREAK で敵に付く状態（例: 「脆弱1」） */
const breakStatusText = () => `${getStatus(BALANCE.breakStatus).name}${BALANCE.breakWeak}`;
/**
 * 2026-11-13（docs/tasks/break-read-plan.md §2）: 「弱点の属性で、しかも完全成功」の決まりが当たる予告の名前（紫の札・ボス・中ボス・災厄の大技）。
 * 決まりの値（balance.ts・effects の needsWeakPerfect）から作る（決まりと文がずれないように）。どれにも当たらなければ空
 */
function strictBreakWho(): string {
  const who = [
    ...(BALANCE.breakBehaviorNeedsWeakPerfect ? ['紫の札（特殊な行動）'] : []),
    ...(needsWeakPerfect({ boss: true }) ? ['ボス・中ボス・災厄の大技'] : []),
  ];
  return who.join('と');
}
/** 上の予告が、合計ダメージでは崩れないか（紫の札・大物の線が両方とも ∞ の時だけ true） */
function strictNoDamage(): boolean {
  const purple = !BALANCE.breakBehaviorNeedsWeakPerfect || (BALANCE.breakDamagePctBehavior !== undefined && !Number.isFinite(BALANCE.breakDamagePctBehavior));
  const big = !needsWeakPerfect({ boss: true }) || !Number.isFinite(breakDamagePctOf({ boss: true }));
  return purple && big;
}
/** 赤い札の説明の後に足す、厳しい決まりの文（決まりが無ければ空） */
function strictBreakText(): string {
  const who = strictBreakWho();
  if (!who) return '';
  // 2026-11-13: 鍵の順番で1つ目のダンジョンのボスは、今までどおり（effects の needsWeakPerfect の firstKeyBoss。決まりから読む）
  const firstKey = needsWeakPerfect({ boss: true }) && !needsWeakPerfect({ boss: true, firstKeyBoss: true }) ? 'なお、1つ目の鍵のダンジョンのボスの大技は、今までどおり崩せます（紫の札は除く）。' : '';
  return `ただし、${who}は、弱点の属性で、しかも完全成功で攻撃した時だけ崩せます（完全成功だけ${strictNoDamage() ? '・大きなダメージ' : ''}では崩れません。弱点を持たない相手は、完全成功で崩せます）。${firstKey}予告の下の「⚡弱点（属性）で完全成功 → BREAK」が目印です。まとめると、赤い札 = 今までどおり／${who.replace('ボス・中ボス・災厄の大技', '大物')} = 弱点の属性で完全成功。`;
}

// ===== 2026-11-15: シナリオ2（凍てつく王国）の道・寒さ・温泉・凍え・災厄（数はデータから読む。書き写さない） =====
const FROZEN = 'frozenKingdom';
/** シナリオの名前（「」付き） */
const scenarioName = (id: string) => `「${getScenario(id).name}」`;
/** 倍率の短い書き方（2 → ×2・0.5 → ×0.5） */
const times = (v: number) => `×${Math.round(v * 100) / 100}`;

/** シナリオ2の3つの道（見取り図の札と同じ名前・印・説明） */
function frozenLanesText(): string {
  const lanes = (getScenario(FROZEN).map?.lanes ?? []).filter((l) => l.hint);
  return `${scenarioName(FROZEN)}の道: ${lanes.map((l) => `${l.mark ?? ''}${l.name}＝${l.hint}`).join('／')}。`;
}

/** シナリオ2の3つの道の寒さの倍率（帯の倍率。無い道は ×1） */
function frozenLaneColdText(): string {
  const lanes = (getScenario(FROZEN).map?.lanes ?? []).filter((l) => l.hint);
  return lanes.map((l) => `${l.name}${times(l.climate ?? 1)}`).join('・');
}

/** 湖の氷（移動力・サイコロのボーナス） */
function lakeIceText(): string {
  const t = TERRAINS.get('lakeIce');
  return `${t.name}: 凍った湖の上は滑って速く、移動力${t.moveCost}・サイコロ+${t.moveDiceBonus ?? 0}。ただし寒いマスです。`;
}

/** 温泉（回復の量はイベントのデータから） */
function hotSpringText(): string {
  const ev = EVENTS.get('hotSpring');
  const opt = ev.options.find((o) => o.success?.some((x) => x.kind === 'warmth'));
  const heal = opt?.success?.find((x) => x.kind === 'heal') as { amount?: number } | undefined;
  return `♨温泉（${ev.title}）: 湯につかると、全員のHP+${heal?.amount ?? 0}と、次の朝まで寒さを受けません（地図の駒に♨の印）。`;
}

/** 氷漬けの宝物庫（凍え） */
function frozenVaultText(): string {
  const th = DUNGEON_THEMES.get('frozenVault');
  const c = th.chill!;
  const grades = c.chest
    .filter((g) => g.min > 0)
    .slice()
    .reverse()
    .map((g) => `凍え${g.min}で${CHEST_NAME[g.rarity]}`)
    .join('・');
  return `${scenarioName(FROZEN)}だけのテーマ: ${th.mark}${th.name}。部屋に入るたびに凍えが1つ積もり、その場の全員のHPが「凍え×${c.hpPercent}%」減ります（HPは1で止まる）。焚き火（休憩の部屋）に入ると凍えは0。奥の氷漬けの箱は、凍えているほど良い箱です（${grades}）。温まるか、凍えたまま奥へ急ぐかを選びます。`;
}

/** シナリオ2だけの災厄（シナリオ1の地図に無い物） */
function frozenScourges(): ScourgeDef[] {
  const first = new Set(getScenario('corruptionKing').map?.scourges ?? []);
  return (getScenario(FROZEN).map?.scourges ?? []).filter((id) => !first.has(id)).map((id) => SCOURGES.get(id));
}

/** 災厄の悪さの短い文（データの値から） */
function curseText(d: ScourgeDef): string {
  const c = d.curse;
  if (c.coldMul) return `寒さで減るHPが${c.coldMul}倍`;
  if (c.buryRoad) return '街道が雪に埋もれる（街道の上のサイコロ+1が無くなる）';
  // 夜はもともと狭い（visionRange − nightVisionPenalty = 1マス）。視界は最低1マスなので、ふだんの夜は変わらない
  if (c.visionDown) return `昼の視界−${c.visionDown}（夜はもともと${BALANCE.visionRange - BALANCE.nightVisionPenalty}マスなので、ふだんは変わらない）`;
  return d.curseShort ?? d.name;
}

/** 災厄の加護の短い文（データの値から） */
function boonText(d: ScourgeDef): string {
  const b = d.boon;
  switch (b.kind) {
    case 'frostBreath':
      return `${d.boon.name}（戦闘の始めに味方1人が${getStatus(b.status).name}${b.amount}）`;
    case 'bellToll':
      return `${d.boon.name}（${b.every}ターンごとの🔔鐘の番に、ボス・中ボスの単体攻撃がほかの味方にも${b.pct}%響く）`;
    case 'darkVeil':
      return `${d.boon.name}（ボス・中ボスの最初の予告の名前と数字が見えない）`;
    default:
      return d.boon.name;
  }
}

/** 災厄の段階（HPが半分を切った後）の短い文（敵のデータの値から） */
function phaseText(d: ScourgeDef): string {
  const ph = ENEMIES.get(d.boss).phases?.[0];
  if (!ph) return '';
  const name = (ph.rule ?? ph.name).split(':')[0].split('：')[0];
  const effects = ph.actions?.flatMap((a) => a.effects) ?? [];
  if (effects.some((e) => e.kind === 'hide')) return `${name}（次の敵の番まで、単体のカードは外れる。全体攻撃・お供・毒などは当たる）`;
  const echo = effects.find((e) => e.kind === 'echoBlow') as { max?: number } | undefined;
  if (echo) return `${name}（こだまの予告のターンに当てたいちばん大きな一撃が、敵の番に味方全員へ返る。最大${echo.max}）`;
  if (ph.focusFeed) return `${name}（味方がフォーカスを1つ使うたび、影の攻撃+${ph.focusFeed.per}。最大${ph.focusFeed.max}つ。BREAK で0）`;
  return name;
}

/** シナリオ2の災厄の段落 */
function frozenScourgeText(): string {
  const list = frozenScourges();
  return `💀${scenarioName(FROZEN)}の災厄: 悪さは「${list.map(curseText).join('」「')}」のどれか。加護は ${list.map(boonText).join('・')}。`;
}

/** シナリオ2の災厄の段階の段落 */
function frozenScourgePhaseText(): string {
  return `${scenarioName(FROZEN)}の災厄は、HPが半分を切ると ${frozenScourges().map(phaseText).join('・')}。予告の札と長押しで、打てる手が読めます。`;
}

export type HelpTopicId =
  | 'flow'
  | 'world'
  | 'town'
  | 'dungeon'
  | 'battle'
  | 'focus'
  | 'lives'
  | 'corruption'
  | 'jobs'
  | 'equipment'
  | 'pets'
  | 'coop'
  | 'lorebook'
  | 'glossary';

export interface HelpTopic {
  id: HelpTopicId;
  /** 一覧に出す絵文字 */
  icon: string;
  title: string;
  /** 1段落ずつ（短く・プレイヤーの目線で） */
  body: string[];
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const omen = (k: keyof typeof OMEN_INFO, color: string, what: string) => `${color}＝${OMEN_INFO[k].name}（${what}）`;

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'flow',
    icon: '🧭',
    title: 'ゲームの流れ',
    body: [
      '世界マップを旅して、町で準備し、ダンジョンのボスを倒しながら、最後の目的地をめざします。',
      'キャラは戦闘で経験値を集めてレベルが上がり、条件を満たすと転職できます。',
      '命の灯火が尽きて全員が倒れるか、侵食度が100%になるとゲームオーバー。のんびりしすぎないのがコツです。',
      '冒険は自動で保存されます。タイトルの「つづきから」で再開できます。',
    ],
  },
  {
    id: 'world',
    icon: '🗺️',
    title: '世界マップと移動',
    body: [
      'キャラごとに順番に動きます。手番が来たら、まずサイコロを1つ振ります。移動できるマス数は「出た目＋素早さのボーナス」です。' +
        `素早さの成功率が${BALANCE.moveDiceSpeed[0]}%以上で＋1、${BALANCE.moveDiceSpeed[1]}%以上で＋2。突進・騎乗などの探索の能力やお供でも増えます。`,
      '目を見た後、まだ動く前なら、フォーカスを1つ使って1回だけ振り直せます（2回目の目で決まります）。',
      '光っているマスをタップして移動。町・祠・ダンジョンの入口に止まると中に入れます。',
      '見えている敵に触れると遭遇。「戦う」「奇襲を狙う（感知）」「逃げる（素早さ）」から選べます。近く（1マス以内）の仲間は戦闘に加われます。',
      '朝→昼→夕方→夜と時間が進みます。夜は視界が狭くなり、敵が増えて強くなります。',
      '町以外では「野営」でHPとフォーカスを少し回復できます。夜の野営は夜襲に注意（確率はボタンに出ます）。',
      `何もないマスで止まると、${BALANCE.randomEventChance}%で突発イベントが起きます。`,
      '3つの道（広い地図のシナリオ）: 地図は西・中央・東の道に分かれ、シナリオごとに道の性格が違います（速い・寒い・魔物が多い・宝が多い など）。地図の「見取り図」の上の札で、行く前に違いが分かります。',
      frozenLanesText(),
      `寒さ（寒い地域のシナリオ）: 雪原・氷原・湖の氷など寒いマスに立ったままワールドターンが終わると、HPが少し減ります（奥の地域ほど多い・HPは1で止まる・町は寒くない）。道によって倍率が違います（${frozenLaneColdText()}）。その番に野営したキャラと、温泉で温まったキャラは受けません。`,
      lakeIceText(),
      hotSpringText(),
      '縦の低い画面（スマホの LINE の中で開いた時など）では、画面を広く使うために一部を畳んでいます。上の帯を押すと、遊び方の一番上に「次: …」（侵食度の次の変化）が読めます。💀×N は災厄の札を畳んだボタンで、押すと説明が開きます（町・神殿・祠では1行の帯）。🔍 は拡大のボタン（＋・標準・−）を畳んだ物で、押すと開き、もう1度 🔍 か地図を押すと閉じます。寒さ・温泉（♨）は短い札になり、押すと全文が出ます。',
    ],
  },
  {
    id: 'town',
    icon: '🏘️',
    title: '町と施設',
    body: [
      '町は安全な場所。ショップ・宿屋・依頼・カード削除・売却があります。',
      '宿屋に泊まると、そのキャラのHPとフォーカスが全回復し、悪い状態異常も治ります。',
      '依頼を受けて達成し、町で報告すると報酬がもらえます。',
      '祠では祈ると恵み（回復や加護）を受けられます。神殿・祭壇では特別な転職ができます。',
      '侵食度が上がると町が魔物に狙われます。期限までに倒さないと町が陥落し、お店と宿屋が使えなくなります。',
    ],
  },
  {
    id: 'dungeon',
    icon: '🚪',
    title: 'ダンジョンと扉',
    body: [
      '通路では、前にある扉を1つ選んで進みます。扉を1つ開けて部屋を済ませると、その組の手番が1回終わります（全員がダンジョンの中なら、すぐ次の扉を選べます）。',
      '部屋に入ると後ろの扉は閉まり、選ばなかった扉には戻れません。2人以上で入った時は、全員が同じ扉を選ぶと開きます。',
      '2つ目の鍵のダンジョンは、1つ目のダンジョンの鍵がないと扉が開きません。最後のダンジョンは、3つの鍵がそろうと開きます。',
      `扉の予兆（いつでも見えます）: ${omen('danger', '赤', 'ふつうの戦闘。カード報酬とゴールド')}／${omen('elite', '紫', '手ごわいが、レア以上のカードと装備が出やすい')}／${omen('treasure', '金', '宝箱')}／${omen('rest', '緑', '休憩')}／${omen('mystery', '青', 'イベント')}。ボスと中ボスは重い扉で分かります。絵の扉と下のボタンは、同じ並びです。`,
      `金の扉には「封魔の宝箱」のこともあります（紫の封印の印つき。${BALANCE.sealedChest.fromRow + 1}行目から奥の宝箱の約${BALANCE.sealedChest.chance}%）。封印を解くと、罠の判定（器用。失敗すると全員に最大HPの${BALANCE.sealedChest.trapHpPct}%のダメージと、次の戦闘の初めに脆弱${BALANCE.sealedChest.trapVulnerable}）の後、番人（強敵）との戦闘になります。勝てば、格の高い箱（装飾箱。${BALANCE.sealedChest.legendFromRow + 1}行目から奥は黄金箱）を開けられ、エピック以上の消耗品が必ず1つ入っています。開けずに立ち去ることもできます。`,
      `先読み: 感知の成功率${BALANCE.dungeonSensePer}%以上の仲間・フクロウのお供・霊感の能力があると、扉の先の中身（敵の名前・宝箱の種類・イベントの名前）と、その先の扉の色まで見えます。`,
      `「周囲の警戒」: だれかのフォーカスを${BALANCE.dungeonScoutFocus}払うと、その通路にいる間、同じ先読みができます（判定なし・1つの通路で1回だけ）。`,
      `休憩所では、3つから1つをみんなで選びます: 休む（HP回復）／瞑想（フォーカス+${BALANCE.restFocus}）／技を磨く（その場の全員が、自分のカードを1枚ずつ＋に強化）。HPが減っていなければ、技を磨くのがお得です。`,
      `奥へ進むほど敵が強くなります（${BALANCE.depthBonus.rowsPerStep}行ごとにレベル+1。${BALANCE.depthBonus.extraEnemyFromStep * BALANCE.depthBonus.rowsPerStep + 1}行目からは敵が1体増えます）。そのかわり、報酬のお金と経験値が増えます（浅層+${Math.round(BALANCE.depthBonus.reward[1] * 100)}%・中層+${Math.round(BALANCE.depthBonus.reward[2] * 100)}%・深層+${Math.round(BALANCE.depthBonus.reward[3] * 100)}%）。報酬のカードも、レア以上が同じ割合で出やすくなります。画面の左上の「深さ」で、今いる行が分かります。`,
      '最後のダンジョンは、7行目に中ボスが待っています（逃げられません）。倒すと、すぐ先に休憩の部屋があります。中ボスの2体は、HPが半分を切るか、相方が倒れると姿が変わります（どちらを先に倒すかも作戦です）。',
      '合流: 仲間が先に入ったダンジョンの入口に着いたら、「〇〇たちに合流する」で同じ組に入れます（組が通路にいる時だけ。戦闘や宝箱の途中なら、終わるのを待ちましょう）。合流すると、組の今の場所から一緒に進みます。',
      '一番奥のボスを倒すと大宝箱。途中で撤退もできますが、手に入れた宝箱の中身を1つ失います。',
      `ランダムダンジョン（寄り道）: 全5行の短いダンジョンです。最奥の主を倒すと必ず黄金箱が開き、${BALANCE.randomDungeon.exclusiveChance >= 100 ? '必ず' : `${BALANCE.randomDungeon.exclusiveChance}%で`}「専用」の装備（ここと闇商人でしか手に入らない）も1つ出ます。1か所1回だけで、制覇すると踏破済みになり、侵食度が${BALANCE.corruptionOnRandomDungeonClear}%下がります（負けた時は入り直せます）。`,
      'どのシナリオでも出るテーマは3つ: 💎古代の晶洞（イベントと宝箱が多い・晶石の祭壇でカードを強化か変異を2回）／⛓封魔の地下迷宮（強敵と封魔の宝箱が多い・敵Lv+1・エピックが2倍出やすい）／🗡無法者の隠れ処（戦闘が多い・闇商人が専用の装備を2つ並べ、1つ選んで買える）。',
      frozenVaultText(),
      '最奥の主を倒すと: 黄金箱の秘宝を3つから1つ選べる（2人以上はみんなで決める）・👁見破り（次に挑む鍵のダンジョンのボスの大技と開幕の一手が、完全成功だけで崩せる）・帰りに「抜け道」を選ぶと、次の目的地の近くに出られる。',
    ],
  },
  {
    id: 'battle',
    icon: '⚔️',
    title: '戦闘の基本',
    body: [
      `味方の番の始めに、カードを${BALANCE.drawPerTurn}枚引き、マナが${BALANCE.manaPerTurn}回復します。カードの左上の数字がマナの量です。`,
      '山札が無くなると、捨札を切り直して山札に戻します。切り直しは1人1ターンに1回まで（2回目が要る時は、そのターンはもう引けません）。',
      '手札のカードをタップ → 狙う相手をタップ → 『発動』。カードを長押しすると詳しい効果が見られます。',
      'カードには成功率と「枠（スロット）」があります。発動すると枠ごとに成功・失敗が決まり、成功した数が多いほど強い効果になります。',
      '★フォーカスを使うと、その枠は必ず成功します（くわしくは「★フォーカス」）。',
      `連携: 同じターンに別の仲間が攻撃した敵を攻撃すると、ダメージが増えます。2人目は「連携」＋${pct(BALANCE.comboBonus[1])}、3人目は「大連携」＋${pct(BALANCE.comboBonus[2])}、4人目は「極連携」＋${pct(BALANCE.comboBonus[3])}。攻める順番を相談しましょう。`,
      '完全成功に連携やジョブの能力が重なると、ダメージの数字が大きく金色に光ります（3つ重なると光の輪も）。見た目だけで、ダメージは同じです。',
      '敵の頭の上には、次の行動（攻撃・防御など）が出ています。守るか攻めるかの目安にしましょう。',
      `赤い「大技」の印が付いた予告は、体勢を崩せます（BREAK）。そのターンのうちに、弱点の属性で攻撃する・完全成功で攻撃を当てる・最大HPの${BALANCE.breakDamagePct}%以上のダメージを与える、のどれかで、その行動の威力が半分・${breakStatusText()}・ブロック0になります。${strictBreakText()}`,
      `紫の札（⚠️手数読み・🛡️かばう・🚫癒し封じ・📢増援・🎯手負い狙い・🔨盾砕き・✨浄化）は、敵の特殊な行動です。札の下の1行が、何が起きるかの目安です（予告を長押しすると、止め方も読めます）。同じ札でも、敵ごとに中身がちがいます（何を数えるか・だれを狙うか・いつ呼ぶか など。1行と長押しで確かめる）。ほとんどは大技なので、BREAK すると止まるか、威力が半分になります${BALANCE.breakBehaviorNeedsWeakPerfect ? '（崩せるのは、弱点の属性で完全成功した時だけ）' : ''}。`,
      'ボスのHPバーの縦線（▼）は、姿が変わる境目です。線を切っても今の予告はそのまま。その次の予告が「🌀第2段階」の札の付いた開幕の一手で、その段階の新しい決まり（仲間を呼ぶ・溜めて大技・弱点が増える など）を見せます。いつ境目を切るかも作戦です（敵を長押しすると、境目と決まりが読めます）。一部の開幕の一手は、BREAK しても軽い効果が残るか、崩した人に小さな代償があります（予告を長押しすると読めます）。',
      '「次: 〇〇」が出ている時は、その敵の次の予告まで決まっています（溜め。溜めを BREAK すると、次の大技も消えます）。予告の枠の右上の数字は数え読みで、0になった予告で大技が来ます（数えている間に BREAK すると1つ戻ります）。',
      '属性の攻撃は、完全成功なら必ず状態異常が付きます（氷＝凍結で行動を止める、雷＝痺れで30%失敗、火＝火傷）。カードを選ぶと、予測の所に出ます。',
      'マナを使い切ったら、右下の『ターン終了』。全員が終えると敵の番です（オンラインでは『準備完了』）。',
      '状態の印が入り切らない時は「＋N」（ほかにNつ）が出ます。押すと、その敵・味方の状態の一覧が開きます。小さい印は1つずつは押せないので、敵・味方を長押しして読みます（長押しの説明にも同じ一覧が出ます）。',
    ],
  },
  {
    id: 'focus',
    icon: '★',
    title: '★フォーカス',
    body: [
      'カードを選ぶと出るパネルで『＋』か★の丸を押すと、フォーカスを使えます。1つにつき1枠が必ず成功します。',
      `フォーカスは戦闘をまたいで持ち越す大事な資源です（はじめは${BALANCE.focusStart}、上限はふつう${BALANCE.focusMax}）。`,
      '回復するのは、宿屋・野営・休憩部屋・祠など。ここぞという大技に使いましょう。',
      '移動力・探索力・宝箱などの判定でも使えます。',
    ],
  },
  {
    id: 'lives',
    icon: '🔥',
    title: '命の灯火',
    body: [
      'パーティみんなで共有する「やり直しの回数」です。上のバーの🔥×数字が残りです。',
      `戦闘に負けると灯火が1つ消え、負けたキャラは最寄りの町でHP${pct(BALANCE.reviveHpRatio)}で目を覚まします。`,
      '灯火が0の時に負けると、そのキャラはその場に倒れます。仲間が同じマスに行けば、手番を使って助け起こせます。',
      '全員が倒れるとゲームオーバー。数は難易度で決まります（やさしい5・ふつう3・むずかしい2）。',
    ],
  },
  {
    id: 'corruption',
    icon: '💀',
    title: '侵食度',
    body: [
      '魔王の力が世界をむしばむ度合い。シナリオによって名前が変わります（例: 冬の深さ・霧の濃さ）。',
      `時間が進むと上がります（ワールドターンごと+${BALANCE.corruptionPerTurn}%、だれかがダンジョンの中にいる時は+${BALANCE.corruptionPerDungeonTurn}%・ダンジョンに入る時+${BALANCE.corruptionOnDungeonEnter}%・町が陥落した時+${BALANCE.corruptionOnTownFall}%）。鍵のダンジョンを制覇すると${BALANCE.corruptionOnKeyDungeonClear}%下がります。`,
      `交代運転にも時間がかかります。同じワールドターンのうちに、仲間の番ですでに動いたキャラを、別の人の番でまた動かすと+${BALANCE.corruptionPerRelayMove}%（1回の番に1回まで）。`,
      '一定の値をこえるごとに、敵が増える・強くなるなど世界が変わります。次の変化は上のバーに出ています。',
      `💀災厄の中ボス（広い地図のシナリオ）: 1つ目の鍵を取った時（その前に${BALANCE.scourge.firstCorruption}%を越えたらその時）・${BALANCE.scourge.milestones.join('%・')}%で、1体ずつ現れます（最大${BALANCE.scourge.max}体）。生きている間は「店の値段が高い」「侵食度が速く上がる」「野営の回復が半分」「夜の敵が強い」のどれかの悪さをします。倒すと悪さが消え、専用の装備を必ず落とし、侵食度が${BALANCE.scourge.purify}%下がります。逃げても巣に残ります。場所は見晴らしの塔に登ると見えます。`,
      '💀災厄の加護: 生きている災厄1体ごとに、鍵と最後のダンジョンのボス・中ボスとの戦闘に決まりが1つ足されます（用心棒の手下・毎ターンの回復・最初の予告が手負い狙い・最初の BREAK が1回効かない・段階を越えるたびに火傷）。倒しに行くか、背負ったまま急ぐかを選べます。災厄の札・ダンジョンの入口・ボスの長押しで、掛かっている加護が読めます。災厄はHPが半分を切ると姿が変わります（逃げる・回復する・溜める・弱点が変わる・再生）。',
      frozenScourgeText(),
      frozenScourgePhaseText(),
      '100%になるとゲームオーバーです。',
    ],
  },
  {
    id: 'jobs',
    icon: '🎓',
    title: 'ジョブと転職',
    body: [
      'ジョブは44種類。基本8 → 中位13 → 最上位13。中位からは特殊10にも進めます（特殊からは最上位に上がれません）。',
      `転職できるレベル: 基本→中位はLv${BALANCE.jobChange.base}、中位→最上位はLv${BALANCE.jobChange.mid}＋条件、中位→特殊はLv${BALANCE.jobChange.special}＋条件（条件は、中位に転職してから達成した数で数えます）。`,
      '転職するとLv1に戻ります。貯めた経験値は、次のLv2の手前まで持ち越し。前のジョブの戦闘の能力を1つ持ち越せます。',
      '山札・装備・成長は引き継ぎます。使えなくなった武器は持ち物へ移り、新しいジョブの最初の武器を持ちます。',
      '場所: 基本→中位は世界マップ・町・祠・神殿・祭壇・休憩部屋。中位→最上位は町の聖堂・祠・神殿。中位→特殊は神殿か、その職の祭壇。',
      '転職すると、そのジョブの専用カード3枚から1枚を選んで山札に入れます。条件の進み具合は転職の画面で見られます。',
      '最上位・特殊のジョブは、転職すると決め技（1戦闘に1回の大技）が山札に入ります。決め技は、戦闘の最初の手札に必ず1枚来ます。',
    ],
  },
  {
    id: 'equipment',
    icon: '🗡️',
    title: '装備と武器のカード',
    body: [
      '武器・鎧・装飾品を装備できます。武器はジョブごとに得意（◎）と使える（○）の種類があります。',
      '珍しい装備ほど、特別な効果を持っています。装飾品はルールを変えるような効果もあり、ビルドの核になります。',
      'カードの報酬は3枚から1枚。そのうち2枚は、今の山札や装備と相性の良いカードが出やすくなっています。',
      'パーティに味方を回復できるカードを持つ人がいない時は、どのジョブでも使える回復のカード（立て直し・応急処置など）が少し出やすくなります。',
      '装備の詳しい効果は、パーティの画面でタップすると見られます。',
    ],
  },
  {
    id: 'pets',
    icon: '🐾',
    title: 'お供',
    body: [
      'どのジョブでも1匹まで連れて歩けます。主に旅の途中の突発イベントで仲間になります（新しい子を迎えると、今の子とはお別れ）。',
      'お供は12種類。種類ごとに戦闘や探索で助けてくれる効果があります。毛色は4色で、珍しい毛色もあります（強さは同じ）。',
      '一緒に歩く・戦闘に勝つ・撫でると懐き度が上がります（♡1〜5）。♡3でリボン、♡5でハート。懐き度は見た目だけで、強さは変わりません。',
      '撫でるのはパーティの画面や休憩部屋から。1回の冒険で最初の1回だけ、フォーカスが1増えます。',
      'お供は戦闘で傷つきません。カードでお供を動かすこともできます（お供の行動は、全部合わせて1ターン4回まで）。調教師の「かこめ！」は、敵に付いている悪い状態異常の種類の数だけ、お供がその敵へ飛びかかります。',
    ],
  },
  {
    id: 'coop',
    icon: '🤝',
    title: '協力プレイ',
    body: [
      '最大4人。キャラごとに担当（P1〜P4）があり、自分の担当のキャラだけを動かせます。',
      'ローカル協力: 1台のスマホを回して遊びます。手番の人が変わると「P2さんの番です」と出ます。',
      'オンライン協力: 冒険の準備で「部屋を作る」と合言葉が出ます。仲間はタイトルの「部屋に参加」から合言葉を入れます。',
      '戦闘は全員が同時にカードを使えます。ダンジョンの扉や次の行き先は、みんなで選んで決めます。',
      'ダンジョンのイベント: まず「どれにするか」をみんなで選びます（もう一度押すと取り消し）。判定がある時は、いちばん得意なキャラが挑む役になり、その担当の人がフォーカスを決めて挑みます（ほかのキャラに任せる・選び直すもできます）。お金などを払う選択肢は、払えるキャラのうち並びが先のキャラが払います。',
      'イベントの画面の下の帯の「装備」「道具」で、投票中・挑む段・待っている間も、パーティと道具袋を開けます（回復薬を使って戻っても、自分の票やフォーカスの指定はそのまま）。',
      '戦闘の勝利画面: 成長ボーナス → 自分のカード → 全員がそろってから戦利品の取り合い、の順に出ます。',
      'パーティ・装備の持ち物の行を押すと「使う」「渡す」が出ます（道具袋は、行を押すと使う相手が出ます）。詳しい説明は長押しで読めます。',
      `仲間の通信が切れた知らせは、一瞬の切断では出ません（約${Math.round(OFFLINE_GRACE_MS / 1000)}秒待ってから出ます）。`,
      '新しい版が公開されたら、2台とも読み込み直してください（版が違うと同じ部屋で遊べません。公開の前に作った部屋には、入り直せないことがあります）。',
      'この案内や説明の画面は、自分のスマホだけに出ます。ほかの人の画面や冒険は変わりません。',
    ],
  },
  {
    id: 'lorebook',
    icon: '📖',
    title: '伝承の書',
    body: [
      'タイトルから開く、冒険をまたいだ記録の本です。この端末だけに保存されます。冒険の途中も、メニューの「伝承の書（図鑑）」から読めます（読むだけ。冒険は止まりも変わりもしません）。',
      '図鑑: お供・ジョブ・カード・装備・敵。見た物と手に入れた物が埋まっていきます。',
      `うちの子図鑑とマイペット: 懐き度♡5か、ダンジョンを一緒に${BALANCE.myPetDungeonClears}回クリアした子を登録すると、次の冒険のスタートの町で${BALANCE.myPetCost}Gで呼べます。`,
      '強さが冒険をまたいで上がる物はありません。毎回の冒険はまっさらから始まります。',
    ],
  },
];

/** 用語集（あいうえお順ではなく、遊ぶ時に出会う順） */
export const GLOSSARY: { term: string; text: string; topic?: HelpTopicId }[] = [
  { term: 'ワールドターン', text: '世界マップで全員が1回ずつ動くと1進む時間の単位。時間帯や侵食度が進みます。', topic: 'world' },
  { term: '移動力', text: '世界マップで動けるマス数。素早さの判定で決まります。', topic: 'world' },
  { term: '扉の予兆', text: '扉の奥の部屋の種類。扉とボタンの色で、いつでも分かります。', topic: 'dungeon' },
  { term: '先読み', text: '扉の先の中身と、その先の扉の色まで分かること。感知の高い仲間・フクロウ・霊感・「周囲の警戒」で。', topic: 'dungeon' },
  { term: '技を磨く', text: '休憩所で選べる。カードを1枚＋に強化します（その冒険の中だけ）。', topic: 'dungeon' },
  { term: 'マナ', text: 'カードを使うための力。毎ターン回復し、余っても持ち越しません。', topic: 'battle' },
  { term: 'スロット（枠）', text: 'カードの判定の回数。成功した数で効果が決まります。', topic: 'battle' },
  { term: '成功率', text: '1枠が成功する確率。カードの種類と能力値で決まります。', topic: 'battle' },
  { term: '完全成功', text: '全部の枠が成功すること。一番強い効果が出ます。', topic: 'battle' },
  { term: '★フォーカス', text: '枠を必ず成功させる力。戦闘をまたいで持ち越します。', topic: 'focus' },
  { term: '連携', text: `同じターンに別の仲間が攻撃した敵へのダメージが増える（2人目＋${pct(BALANCE.comboBonus[1])}・3人目＋${pct(BALANCE.comboBonus[2])}・4人目＋${pct(BALANCE.comboBonus[3])}）。`, topic: 'battle' },
  { term: 'BREAK（体勢崩し）', text: `「大技」の予告を出した敵に、弱点の属性・完全成功・大きなダメージを当てると、その行動の威力が半分・${breakStatusText()}・ブロック0。${strictBreakWho() ? `${strictBreakWho()}は、弱点の属性で完全成功した時だけ。` : ''}`, topic: 'battle' },
  { term: 'ボスの段階', text: 'ボスのHPバーの縦線（▼）を切ると姿が変わり、次の予告が「🌀」の札の開幕の一手になる。段階ごとに新しい決まりが1つ入る。', topic: 'battle' },
  { term: 'ブロック', text: '受けるダメージを先に引き受ける守り。', topic: 'battle' },
  { term: '行動予告', text: '敵の頭の上に出る、次の行動の印。', topic: 'battle' },
  { term: '状態異常', text: '毒・脆弱などの効果。アイコンをタップすると説明が出ます。', topic: 'battle' },
  { term: '＋N（状態の印）', text: '戦闘で入り切らない状態の印の数。押すと状態の一覧。敵・味方の長押しでも読めます。', topic: 'battle' },
  { term: '応援', text: '良い状態の1つ。付いている間、与えるダメージが増えます。', topic: 'battle' },
  { term: '命の灯火', text: 'パーティ共有のやり直しの回数。', topic: 'lives' },
  { term: '侵食度', text: '世界のむしばまれ具合。100%でゲームオーバー。', topic: 'corruption' },
  { term: '野営', text: '町の外で休んでHPとフォーカスを少し回復。夜は夜襲に注意。', topic: 'world' },
  { term: '3つの道', text: '広い地図の西・中央・東の道。シナリオごとに性格が違い、見取り図の札で分かります。', topic: 'world' },
  { term: '寒さ', text: '寒いマスでワールドターンが終わるとHPが減る。野営と温泉で防げます。', topic: 'world' },
  { term: '温泉（♨）', text: 'HPが回復し、次の朝まで寒さを受けない。', topic: 'world' },
  { term: '凍え', text: '氷漬けの宝物庫で部屋ごとに積もり、HPが減る。焚き火で0。奥の箱は凍えているほど良い。', topic: 'dungeon' },
  { term: '転職', text: '新しいジョブになること。Lv1に戻り、能力を1つ持ち越します。', topic: 'jobs' },
  { term: '神殿・祭壇', text: '中位から特殊ジョブへ転職できる特別な場所。', topic: 'jobs' },
  { term: '懐き度', text: 'お供との仲の良さ（♡1〜5）。見た目だけで強さは変わりません。', topic: 'pets' },
  { term: 'マイペット', text: '登録したお供を次の冒険に連れて行ける仕組み。', topic: 'lorebook' },
];

export const topicOf = (id: HelpTopicId) => HELP_TOPICS.find((t) => t.id === id);
