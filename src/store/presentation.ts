import { TIMING, BALANCE } from '../data/balance';
import { EVENTS } from '../data/events';
import { getStatus } from '../data/statuses';
import { getCard } from '../data/cards';
import { petExplore } from '../engine/game/pets';
import { unwrapCommand, viewOf } from '../engine/game/scenes';
import { timeOfDay } from '../engine/game/world/time';
import { visionOf } from '../engine/game/world/fog';
import { hexDistance } from '../engine/game/world/hex';
import { heroMaxHp } from '../engine/game/hero';
import { doorBeyond, doorDetail, doorOmen, type DoorOmen } from '../engine/game/dungeonOmen';
import { petEventBonusOf, restMultiplierOf } from '../engine/game/common';
import { getRoomType } from '../data/rules';
import { cardSound, damageSound, petCry, statusSound } from '../audio/cues';
import { COMBO_NAMES } from '../engine/battle/effects';

/** 連携の印か（連携・大連携・極連携） */
const isCombo = (name: string) => !!name && (COMBO_NAMES as readonly string[]).includes(name);
import { petLoveLevel } from '../engine/game/pets';
import { BIG_HIT, cardImpact, type ImpactStyle } from './hitStyle';
import { slotTiming } from './slotTiming';
import type { SoundId } from '../audio/ids';
import type { AbilityNotice, BattleEvent, GameCommand, GameState } from '../types';

export type PopupTone = 'damage' | 'block' | 'status' | 'zero' | 'ability' | 'heal' | 'resource' | 'break';
export interface PopupDraft { unitId: string; text: string; tone: PopupTone; /** 連携の段階（2 = 金の光・大きな数字、3 = さらに広がる輪。見た目だけ） */ tier?: SynergyTier }
export interface NoticeDraft extends AbilityNotice { unitId: string; count?: number }
export interface PresentationFrame {
  delay: number;
  motions?: { unitId: string; kind: 'attack' | 'hit' | 'cast' | 'phase' }[];
  popups?: PopupDraft[];
  notices?: NoticeDraft[];
  roll?: Extract<BattleEvent, { type: 'roll' }>;
  /** このコマで鳴らす音（K6。音は状態にも乱数にも触れない） */
  sounds?: SoundId[];
  /** 他の人の操作の演出（音を少し小さくする） */
  quiet?: boolean;
  /** このコマで連携の演出（揺れ・輪）を始める段階（Step C。見た目だけ） */
  synergy?: SynergyTier;
  /** 段階B: 技名の帯（味方のカード・敵の技。行動の最初のコマ） */
  callout?: CalloutDraft;
  /** 段階B: 命中・障壁・光の柱のエフェクト（受けたユニットの上に出す） */
  impacts?: ImpactDraft[];
  /** 段階B: 戦場全体を揺らす（大ダメージ・完全成功） */
  shake?: boolean;
  /** 段階B: 敵の攻撃を味方のブロックで防いだ（味方の前に盾を出して弾く） */
  guards?: string[];
  /** 回2: このコマで倒れた敵（倒れた演出を、とどめの一撃の後に始める。見た目だけ） */
  deaths?: string[];
}

export interface CalloutDraft { side: 'ally' | 'enemy'; actorId: string; cardId?: string; actionName?: string }
export interface ImpactDraft { unitId: string; style: ImpactStyle; color?: string; big?: boolean }

/** 重なりの段階（Step C）。1 = いつもの完全成功、2 = 完全成功＋連携かジョブの能力、3 = 3つ以上の重なり */
export type SynergyTier = 1 | 2 | 3;
export interface SynergyInfo { tier: SynergyTier | 0; layers: number; combo: boolean; jobAbilities: string[] }

/**
 * 1回の行動（カード1枚）の出来事から、演出の段階を決める（純粋。状態にも乱数にも触れない）。
 * 重なり = 完全成功（1）＋ 連携（1）＋ その行動で発動したジョブの能力（今のジョブ・引き継いだ能力。名前ごとに1）。
 * 完全成功でない・味方のカードでない・敵にダメージが無い行動は 0（演出なし）。
 */
export function synergyOf(events: readonly BattleEvent[], allyIds: ReadonlySet<string> = new Set()): SynergyInfo {
  const none: SynergyInfo = { tier: 0, layers: 0, combo: false, jobAbilities: [] };
  const roll = events.find((e): e is Extract<BattleEvent, { type: 'roll' }> => e.type === 'roll');
  if (!roll?.perfect || (allyIds.size && !allyIds.has(roll.characterId))) return none;
  if (!events.some((e) => e.type === 'damage' && e.amount > 0 && !allyIds.has(e.unitId))) return none;
  const combo = events.some((e) => e.type === 'ability' && isCombo(e.name));
  const jobAbilities = [...new Set(events.flatMap((e) => e.type === 'ability' && e.unitId === roll.characterId && (e.source?.kind === 'job' || e.source?.kind === 'inherited') ? [e.name] : []))];
  const layers = 1 + (combo ? 1 : 0) + jobAbilities.length;
  return { tier: layers >= 3 ? 3 : layers === 2 ? 2 : 1, layers, combo, jobAbilities };
}

/** 順序の整理だけを行う。エンジンの状態や乱数には触れない。allyIds = 味方のID（被弾の音を分ける） */
export function battleFrames(events: BattleEvent[], allyIds: ReadonlySet<string> = new Set()): PresentationFrame[] {
  const frames: PresentationFrame[] = [], actors = new Set<string>();
  // カードの効果音（攻撃の種類・魔法の属性など）は、最初に効果が見えるコマで鳴らす
  let pendingCast: SoundId | undefined;
  const tailSounds: SoundId[] = [];
  const tailDeaths: string[] = [];
  const roll = events.find(e => e.type === 'roll');
  const act = events.find(e => e.type === 'enemyAct');
  // 段階B: 当たった時の見た目（味方のカード = 武器種・属性で決める。敵の技 = 赤い爪あと。ほか = 衝撃）
  let actImpact: { style: ImpactStyle; color?: string } = { style: 'impact' };
  const rollCard = roll?.type === 'roll' ? getCard(roll.cardId) : undefined;
  if (roll?.type === 'roll') {
    actors.add(roll.characterId);
    const card = rollCard!;
    actImpact = cardImpact(card);
    frames.push({ delay: 0, roll, motions: [{ unitId: roll.characterId, kind: card.target === 'self' ? 'cast' : 'attack' }], sounds: ['sfx_battle_card_play'], callout: { side: 'ally', actorId: roll.characterId, cardId: roll.cardId } });
    if (roll.successes > 0) pendingCast = cardSound(card);
  } else if (act?.type === 'enemyAct') {
    actImpact = { style: 'enemy' };
    actors.add(act.enemyUid); frames.push({ delay: 0, motions: [{ unitId: act.enemyUid, kind: 'attack' }], sounds: ['sfx_enemy_attack_start'], callout: { side: 'enemy', actorId: act.enemyUid, actionName: act.actionName } });
  }
  const actorId = roll?.type === 'roll' ? roll.characterId : act?.type === 'enemyAct' ? act.enemyUid : undefined;
  let shaken = false;
  const notices = new Map<string, NoticeDraft>();
  // 重なりの段階（Step C）: 2以上なら、この行動で敵に出すダメージの数字を大きく金色にし、最初のコマで揺れ・輪を始める
  const synergy = synergyOf(events, allyIds), bigTier = synergy.tier >= 2 ? (synergy.tier as SynergyTier) : undefined;
  let synergyStarted = false;
  let firstEffect = true;
  const hitCounts = new Map<string, number>();
  for (const e of events) {
    const popups: PopupDraft[] = [], motions: NonNullable<PresentationFrame['motions']> = [], sounds: SoundId[] = [];
    const impacts: ImpactDraft[] = [], guards: string[] = [];
    let shake = false;
    if (e.type === 'damage') {
      if (e.sourceId && !actors.has(e.sourceId)) {
        actors.add(e.sourceId); frames.push({ delay: 0, motions: [{ unitId: e.sourceId, kind: 'attack' }] }); firstEffect = true;
      }
      const count = (hitCounts.get(e.unitId) ?? 0) + 1; hitCounts.set(e.unitId, count);
      // 長い連撃は最後の段にまとめる。最初の3発は個別に読めるよう残す。
      if (count > TIMING.popupRows) {
        const previous = [...frames].reverse().find(f => f.popups?.some(p => p.unitId === e.unitId && (p.tone === 'damage' || p.tone === 'zero')));
        if (previous) {
          const merge = (tone: PopupTone, amount: number, prefix: string) => {
            if (amount <= 0) return;
            const p = previous.popups!.find(p => p.unitId === e.unitId && p.tone === tone);
            if (p) p.text = `${prefix}${Number(p.text.match(/\d+/)?.[0] ?? 0) + amount}（連撃）`;
            else previous.popups!.push({ unitId: e.unitId, tone, text: `${prefix}${amount}（連撃）` });
          };
          merge('damage', e.amount, '-'); merge('zero', e.blocked, '防御');
          continue;
        }
      }
      if (e.amount > 0) popups.push({ unitId: e.unitId, tone: 'damage', text: `-${e.amount}`, ...(bigTier && !allyIds.has(e.unitId) ? { tier: bigTier } : {}) });
      if (e.blocked > 0 || e.amount === 0) popups.push({ unitId: e.unitId, tone: 'zero', text: e.blocked > 0 ? `防御${e.blocked}` : '0' });
      if (e.amount > 0 || e.blocked > 0) motions.push({ unitId: e.unitId, kind: 'hit' });
      sounds.push(damageSound(e.amount, e.blocked, allyIds.has(e.unitId)));
      // 段階B: 命中のエフェクト。行動した本人の攻撃ならその見た目、ほか（反撃・召喚など）は衝撃
      const own = !e.sourceId || e.sourceId === actorId;
      const look = own ? actImpact : allyIds.has(e.sourceId!) ? { style: 'impact' as const } : { style: 'enemy' as const };
      if (e.amount > 0) impacts.push({ unitId: e.unitId, ...look, ...(e.amount >= BIG_HIT ? { big: true } : {}) });
      // 味方がブロックで防いだ（敵の攻撃）: 盾を出して弾く
      if (e.blocked > 0 && allyIds.has(e.unitId) && !allyIds.has(e.sourceId ?? actorId ?? '')) guards.push(e.unitId);
      // 大ダメージ・完全成功（敵に当たった最初の一撃）は戦場を揺らす
      if (e.amount >= BIG_HIT || (roll?.type === 'roll' && roll.perfect && e.amount > 0 && !allyIds.has(e.unitId) && !shaken)) shake = true;
    } else if (e.type === 'block' && e.amount > 0) { popups.push({ unitId: e.unitId, tone: 'block', text: `ブロック+${e.amount}` }); sounds.push('sfx_status_block_gain'); impacts.push({ unitId: e.unitId, style: 'barrier' }); }
    else if (e.type === 'heal' && e.amount > 0) { popups.push({ unitId: e.unitId, tone: 'heal', text: `HP+${e.amount}` }); sounds.push('sfx_status_heal'); impacts.push({ unitId: e.unitId, style: 'heal' }); }
    else if (e.type === 'status' && e.amount) {
      const def = getStatus(e.status);
      popups.push({ unitId: e.unitId, tone: 'status', text: `${def.name}${e.amount > 0 ? '+' : ''}${e.amount}` });
      // 味方のカードで味方が強くなった（支援）: 金の光の柱
      if (e.amount > 0 && allyIds.has(e.unitId) && roll?.type === 'roll' && !def.harmful) impacts.push({ unitId: e.unitId, style: 'buff' });
      const snd = statusSound(def, e.amount); if (snd) sounds.push(snd);
    }
    else if (e.type === 'resource' && e.amount > 0) { popups.push({ unitId: e.unitId, tone: 'resource', text: `${e.resource === 'focus' ? 'フォーカス' : 'マナ'}+${e.amount}` }); sounds.push(e.resource === 'focus' ? 'sfx_status_focus' : 'sfx_status_mana'); }
    else if (e.type === 'resource' && e.amount < 0) { popups.push({ unitId: e.unitId, tone: 'status', text: `${e.resource === 'focus' ? 'フォーカス' : 'マナ'}${e.amount}` }); sounds.push('sfx_status_debuff'); }
    else if (e.type === 'death') {
      // 倒れた音は、とどめのコマに重ねる（コマを増やすと演出の間が変わるので）
      if (!allyIds.has(e.unitId)) { const last = frames[frames.length - 1]; if (last) { (last.sounds ??= []).push('sfx_enemy_down'); (last.deaths ??= []).push(e.unitId); } else { tailSounds.push('sfx_enemy_down'); tailDeaths.push(e.unitId); } }
    } else if (e.type === 'phase') {
      const snd: SoundId | undefined = e.phase === 'victory' ? 'jgl_victory' : e.phase === 'defeat' ? 'jgl_defeat' : e.phase === 'ally' ? 'sfx_turn_start' : e.phase === 'enemy' ? 'sfx_turn_enemy' : undefined;
      if (snd) tailSounds.push(snd);
    }
    else if (e.type === 'ability') {
      const parent = [...notices.entries()].find(([, n]) => n.unitId === e.unitId && n.name === e.name && n.source?.kind !== 'summon');
      if (e.source?.kind === 'summon' && parent) continue;
      if (e.source?.kind !== 'summon') for (const [key, n] of notices) if (n.unitId === e.unitId && n.name === e.name && n.source?.kind === 'summon') notices.delete(key);
      const key = `${e.unitId}:${e.source?.kind}:${e.source?.id}:${e.name}`, old = notices.get(key);
      if (old) old.count = (old.count ?? 1) + 1;
      else notices.set(key, { unitId: e.unitId, name: e.name, source: e.source });
    } else if (e.type === 'break') {
      // 大技の予告を崩した: 敵の上に大きく「BREAK!」。敵がのけぞる（音は連携と同じ小さな音。静かな音が好み、の決まり）
      motions.push({ unitId: e.enemyUid, kind: 'hit' }); popups.push({ unitId: e.enemyUid, tone: 'break', text: '⚡BREAK!' });
      sounds.push('sfx_battle_combo');
    } else if (e.type === 'enemyPhase') {
      motions.push({ unitId: e.enemyUid, kind: 'phase' }); popups.push({ unitId: e.enemyUid, tone: 'ability', text: e.name });
      sounds.push('sfx_boss_phase');
    }
    if (popups.length || motions.length) {
      if (pendingCast) { sounds.unshift(pendingCast); pendingCast = undefined; }
      // 段階C: カードの効果は、スロットが全部止まって結果が出てから（攻撃のエフェクトへつなぐ）。敵の行動は今までどおり
      const lead = firstEffect && roll?.type === 'roll' && frames.length === 1 ? Math.max(TIMING.actionLead, slotTiming(roll.results).total) : TIMING.actionLead;
      const frame: PresentationFrame = { delay: firstEffect && actors.size ? lead : TIMING.effectStep, popups, motions };
      if (sounds.length) frame.sounds = [...new Set(sounds)];
      if (impacts.length) frame.impacts = impacts;
      if (guards.length) frame.guards = guards;
      if (shake) { frame.shake = true; shaken = true; }
      if (bigTier && !synergyStarted && popups.some((p) => p.tier)) { frame.synergy = bigTier; synergyStarted = true; }
      frames.push(frame); firstEffect = false;
    }
  }
  if (notices.size) {
    // 連携・ジョブの能力の小さな音（Step C。殴った音より静か）
    const list = [...notices.values()], noticeSounds: SoundId[] = [];
    if (list.some((n) => isCombo(n.name))) noticeSounds.push('sfx_battle_combo');
    if (list.some((n) => n.source?.kind === 'job' || n.source?.kind === 'inherited')) noticeSounds.push('sfx_battle_ability');
    frames.push({ delay: 0, notices: list, ...(noticeSounds.length ? { sounds: noticeSounds } : {}) });
  }
  // 手番・勝敗の音は最後のコマに重ねる。コマが無ければ音だけのコマを作る
  if (tailSounds.length) {
    const last = frames[frames.length - 1];
    if (last) last.sounds = [...new Set([...(last.sounds ?? []), ...tailSounds])];
    else frames.push({ delay: 0, sounds: [...new Set(tailSounds)] });
  }
  // 回2: コマが無い時に倒れた敵は、最後のコマ（無ければ音のコマ）で倒れる
  if (tailDeaths.length) {
    const last = frames[frames.length - 1];
    if (last) last.deaths = [...(last.deaths ?? []), ...tailDeaths];
    else frames.push({ delay: 0, deaths: tailDeaths });
  }
  return frames;
}

/** 探索のお供は、確定した操作に対応する効果だけ通知する。描画からは呼ばない。 */
export function explorationNotices(before: GameState, after: GameState, wire: GameCommand): NoticeDraft[] {
  const unwrapped = unwrapCommand(wire), prev = viewOf(before, unwrapped.scene), next = viewOf(after, unwrapped.scene);
  let cmd = unwrapped.command;
  if (cmd.type === 'VOTE') { if (!cmd.command) return []; cmd = cmd.command; }
  const result: NoticeDraft[] = [];
  const add = (id: string, name: string) => {
    const h = after.heroes.find(h => h.id === id);
    if (!h?.pet) return;
    result.push({ unitId: h.id, name, source: { kind: 'pet', id: h.pet.petId, label: h.pet.name, effectName: name } });
  };
  if (cmd.type === 'ADOPT_PET' && cmd.petId) {
    const h = after.heroes.find(h => h.id === cmd.heroId), old = before.heroes.find(h => h.id === cmd.heroId);
    if (h?.pet && h.pet !== old?.pet) {
      const pe = petExplore(h);
      if (pe.vision) add(h.id, `視界+${pe.vision}`);
      if (pe.nightVision && after.world && timeOfDay(after.world.worldTurn) === 'night') add(h.id, '夜でもよく見える');
    }
  }
  if (cmd.type === 'PET_PAT') {
    const h = after.heroes.find(h => h.id === cmd.heroId), old = before.heroes.find(h => h.id === cmd.heroId);
    if (h?.pet && old && h.focus > old.focus) add(h.id, `なかよし（フォーカス+${h.focus - old.focus}）`);
  }
  if (cmd.type === 'WORLD_ROLL_MOVE' && prev.world?.move === null && next.world?.move !== null) {
    const h = after.heroes.find(h => h.id === cmd.heroId), bonus = petExplore(h).moveBonus;
    if (bonus) add(cmd.heroId, `移動力+${bonus}`);
  }
  if (cmd.type === 'OPEN_CHEST' && !prev.chest?.contents && !!next.chest?.contents) {
    const bonus = petExplore(after.heroes.find(h => h.id === cmd.heroId)).luckBonus;
    if (bonus) add(cmd.heroId, `宝箱の運+${bonus}%`);
  }
  if (cmd.type === 'CHOOSE_EVENT' && !prev.event?.result && next.event?.result) {
    const resolved = next.event.result, option = prev.event && EVENTS.get(prev.event.eventId).options[resolved.optionIndex];
    if (option?.check && resolved.heroId) {
      const who = after.heroes.find(h => h.id === resolved.heroId);
      const bonus = (petExplore(who).eventBonus ?? 0) + petEventBonusOf(who);
      if (bonus) add(resolved.heroId, `イベントの判定+${bonus}%`);
    }
  }
  if (cmd.type === 'WORLD_CAMP') {
    const h = before.heroes.find(h => h.id === cmd.heroId), now = after.heroes.find(h => h.id === cmd.heroId);
    const bonus = petExplore(h).campHeal;
    if (h && now && bonus && now.hp > h.hp && h.hp + Math.ceil(heroMaxHp(h) * BALANCE.campHpRatio * restMultiplierOf(h)) < Math.min(heroMaxHp(h), now.hp)) add(h.id, '野営の回復をお手伝い');
  }
  const moved = after.world?.lastMove && after.world.lastMove.seq !== before.world?.lastMove?.seq;
  if (before.world && after.world && moved) {
    for (const id of after.world.lastMove!.heroes) {
      const h = after.heroes.find(h => h.id === id), pe = petExplore(h), at = after.world.pos[id];
      if (!h?.pet || at === undefined || !pe.vision) continue;
      const without = { ...after, heroes: after.heroes.map(x => x.id === id ? { ...x, pet: undefined } : x) };
      const base = visionOf(without, after.world, id), withPet = visionOf(after, after.world, id);
      if (after.world.tiles.some((t, i) => t.seen && !before.world!.tiles[i].seen && hexDistance(after.world!, at, i) > base && hexDistance(after.world!, at, i) <= withPet)) add(id, `視界+${pe.vision}`);
    }
  }
  // フクロウ: 扉の先（中身・その先の扉）が新しく読めた（先読み。抜本的な見直し §2-4）
  if (prev.dungeon && next.dungeon && prev.dungeon.dungeonId === next.dungeon.dungeonId) {
    const read = (g: GameState) => new Set(g.dungeon!.rooms.filter((r) => doorDetail(g, r) !== undefined || doorBeyond(g, r).length > 0).map((r) => r.id));
    const was = read(prev);
    if ([...read(next)].some((id) => !was.has(id))) {
      const owl = next.heroes.find((h) => (!next.party || next.party.includes(h.id)) && h.hp > 0 && h.pet?.petId === 'owl');
      if (owl) add(owl.id, '扉の先を見通した');
    }
  }
  if (before.world && after.world && timeOfDay(before.world.worldTurn) !== 'night' && timeOfDay(after.world.worldTurn) === 'night') {
    for (const h of after.heroes) if (after.world.pos[h.id] !== undefined && petExplore(h).nightVision) add(h.id, '夜でもよく見える');
  }
  return result;
}

/** 新しい扉の予兆が見えた時の音（予兆はいつも見えるので、強敵と宝の扉だけ鳴らす。静かめに） */
const OMEN_SOUND: Partial<Record<DoorOmen, SoundId>> = { elite: 'sfx_dungeon_omen_danger', treasure: 'sfx_dungeon_omen_treasure' };
const PLACE_SOUND: Partial<Record<string, SoundId>> = { town: 'sfx_world_enter_town', shrine: 'sfx_world_shrine', sanctuary: 'sfx_world_shrine', rest: 'sfx_world_rest', event: 'sfx_world_event' };

/**
 * 探索・町・お供などの操作の音（K6）。確定した操作の前後を比べるだけの純粋な関数。描画からは呼ばない。
 * 戦闘の音は battleFrames、歩く音・扉の音は見た目の部品（WorldMoveScene・DungeonAnim）が鳴らす。
 */
export function explorationSounds(before: GameState, after: GameState, wire: GameCommand): SoundId[] {
  const unwrapped = unwrapCommand(wire), prev = viewOf(before, unwrapped.scene), next = viewOf(after, unwrapped.scene);
  let cmd = unwrapped.command;
  if (cmd.type === 'VOTE') { if (!cmd.command) return []; cmd = cmd.command; }
  const out: SoundId[] = [];
  const t = cmd.type;
  if ((t === 'WORLD_ROLL_MOVE' || t === 'WORLD_REROLL_MOVE') && !!next.world?.moveDice && next.world.moveDice.seq !== prev.world?.moveDice?.seq) out.push('sfx_world_dice');
  if (t === 'WORLD_CAMP') out.push('sfx_world_camp');
  if (t === 'DUNGEON_SCOUT' && next.dungeon?.watchedAt !== prev.dungeon?.watchedAt) out.push('sfx_dungeon_watch');
  if ((t === 'TOWN_BUY' || t === 'PEDDLER_BUY') && after !== before) out.push('sfx_ui_buy');
  if (t === 'EQUIP') out.push('sfx_ui_equip');
  // 場所に入った（町・祠・聖域・休憩・イベント）
  if (prev.mode !== next.mode && PLACE_SOUND[next.mode]) out.push(PLACE_SOUND[next.mode]!);
  // ダンジョンに入った（新しい場面ができた）
  // ダンジョンに入った（新しい場面ができた・先の組に合流した）
  if ((after.expeditions ?? []).some((x) => { const old = before.expeditions?.find((y) => y.id === x.id); return !old || x.heroes.length > old.heroes.length; })) out.push('sfx_world_enter_dungeon');
  // 夜になった
  if (before.world && after.world && timeOfDay(before.world.worldTurn) !== 'night' && timeOfDay(after.world.worldTurn) === 'night') out.push('sfx_world_night');
  // 扉を開けて部屋に入った（ボスの部屋は重い門の音）
  if (prev.dungeon && next.dungeon && prev.dungeon.dungeonId === next.dungeon.dungeonId && prev.dungeon.currentRoomId !== next.dungeon.currentRoomId) {
    const room = next.dungeon.rooms.find((r) => r.id === next.dungeon!.currentRoomId);
    out.push(room && getRoomType(room.type).battle?.boss ? 'sfx_dungeon_gate' : 'sfx_dungeon_door');
  }
  // 新しい扉の予兆が見えた（強敵・宝の扉だけ）
  if (prev.dungeon && next.dungeon && prev.dungeon.dungeonId === next.dungeon.dungeonId) {
    const seen = new Set(prev.dungeon.rooms.filter((r) => doorOmen(prev, r)).map((r) => r.id));
    const fresh = next.dungeon.rooms.map((r) => !seen.has(r.id) && doorOmen(next, r)).filter((o): o is DoorOmen => !!o);
    const omen = (['elite', 'treasure'] as const).find((o) => fresh.includes(o));
    if (omen) out.push(OMEN_SOUND[omen]!);
  }
  // キャラごとの変化（転職・レベルアップ・お金・お供）
  let classChange = false, levelUp = false, coin = false, cry: SoundId | undefined, heart = false, ribbon = false;
  for (const h of after.heroes) {
    const old = before.heroes.find((x) => x.id === h.id);
    if (!old) continue;
    if (h.classId !== old.classId) classChange = true;
    else if (h.level > old.level) levelUp = true;
    if (h.gold > old.gold && t !== 'GIVE') coin = true;
    if (h.pet) {
      if ((t === 'ADOPT_PET' && h.pet !== old.pet && h.pet.petId !== old.pet?.petId) || (t === 'PET_PAT' && 'heroId' in cmd && cmd.heroId === h.id)) cry ??= petCry(h.pet.petId);
      const lv = petLoveLevel(h.pet.love), oldLv = old.pet && old.pet.petId === h.pet.petId ? petLoveLevel(old.pet.love) : lv;
      if (lv > oldLv) { heart = true; if (oldLv < 3 && lv >= 3) ribbon = true; }
    }
  }
  if (classChange) out.push('sfx_ui_classchange');
  if (levelUp) out.push('sfx_ui_levelup');
  if (coin && t !== 'TOWN_BUY' && t !== 'PEDDLER_BUY') out.push('sfx_ui_coin');
  if (cry) out.push(cry);
  if (ribbon) out.push('sfx_pet_ribbon');
  else if (heart) out.push('sfx_pet_heart');
  return [...new Set(out)];
}
