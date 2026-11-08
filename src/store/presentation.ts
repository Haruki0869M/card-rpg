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
import { doorOmen, type DoorOmen } from '../engine/game/dungeonOmen';
import { restMultiplierOf } from '../engine/game/common';
import { getRoomType } from '../data/rules';
import { cardSound, damageSound, petCry, statusSound } from '../audio/cues';
import { petLoveLevel } from '../engine/game/pets';
import type { SoundId } from '../audio/ids';
import type { AbilityNotice, BattleEvent, GameCommand, GameState } from '../types';

export type PopupTone = 'damage' | 'block' | 'status' | 'zero' | 'ability' | 'heal' | 'resource';
export interface PopupDraft { unitId: string; text: string; tone: PopupTone }
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
}

/** 順序の整理だけを行う。エンジンの状態や乱数には触れない。allyIds = 味方のID（被弾の音を分ける） */
export function battleFrames(events: BattleEvent[], allyIds: ReadonlySet<string> = new Set()): PresentationFrame[] {
  const frames: PresentationFrame[] = [], actors = new Set<string>();
  // カードの効果音（攻撃の種類・魔法の属性など）は、最初に効果が見えるコマで鳴らす
  let pendingCast: SoundId | undefined;
  const tailSounds: SoundId[] = [];
  const roll = events.find(e => e.type === 'roll');
  const act = events.find(e => e.type === 'enemyAct');
  if (roll?.type === 'roll') {
    actors.add(roll.characterId);
    const card = getCard(roll.cardId);
    frames.push({ delay: 0, roll, motions: [{ unitId: roll.characterId, kind: card.target === 'self' ? 'cast' : 'attack' }], sounds: ['sfx_battle_card_play'] });
    if (roll.successes > 0) pendingCast = cardSound(card);
  } else if (act?.type === 'enemyAct') {
    actors.add(act.enemyUid); frames.push({ delay: 0, motions: [{ unitId: act.enemyUid, kind: 'attack' }], sounds: ['sfx_enemy_attack_start'] });
  }
  const notices = new Map<string, NoticeDraft>();
  let firstEffect = true;
  const hitCounts = new Map<string, number>();
  for (const e of events) {
    const popups: PopupDraft[] = [], motions: NonNullable<PresentationFrame['motions']> = [], sounds: SoundId[] = [];
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
      if (e.amount > 0) popups.push({ unitId: e.unitId, tone: 'damage', text: `-${e.amount}` });
      if (e.blocked > 0 || e.amount === 0) popups.push({ unitId: e.unitId, tone: 'zero', text: e.blocked > 0 ? `防御${e.blocked}` : '0' });
      if (e.amount > 0 || e.blocked > 0) motions.push({ unitId: e.unitId, kind: 'hit' });
      sounds.push(damageSound(e.amount, e.blocked, allyIds.has(e.unitId)));
    } else if (e.type === 'block' && e.amount > 0) { popups.push({ unitId: e.unitId, tone: 'block', text: `ブロック+${e.amount}` }); sounds.push('sfx_status_block_gain'); }
    else if (e.type === 'heal' && e.amount > 0) { popups.push({ unitId: e.unitId, tone: 'heal', text: `HP+${e.amount}` }); sounds.push('sfx_status_heal'); }
    else if (e.type === 'status' && e.amount) {
      const def = getStatus(e.status);
      popups.push({ unitId: e.unitId, tone: 'status', text: `${def.name}${e.amount > 0 ? '+' : ''}${e.amount}` });
      const snd = statusSound(def, e.amount); if (snd) sounds.push(snd);
    }
    else if (e.type === 'resource' && e.amount > 0) { popups.push({ unitId: e.unitId, tone: 'resource', text: `${e.resource === 'focus' ? 'フォーカス' : 'マナ'}+${e.amount}` }); sounds.push(e.resource === 'focus' ? 'sfx_status_focus' : 'sfx_status_mana'); }
    else if (e.type === 'death') {
      // 倒れた音は、とどめのコマに重ねる（コマを増やすと演出の間が変わるので）
      if (!allyIds.has(e.unitId)) { const last = frames[frames.length - 1]; if (last) (last.sounds ??= []).push('sfx_enemy_down'); else tailSounds.push('sfx_enemy_down'); }
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
    } else if (e.type === 'enemyPhase') {
      motions.push({ unitId: e.enemyUid, kind: 'phase' }); popups.push({ unitId: e.enemyUid, tone: 'ability', text: e.name });
      sounds.push('sfx_boss_phase');
    }
    if (popups.length || motions.length) {
      if (pendingCast) { sounds.unshift(pendingCast); pendingCast = undefined; }
      const frame: PresentationFrame = { delay: firstEffect && actors.size ? TIMING.actionLead : TIMING.effectStep, popups, motions };
      if (sounds.length) frame.sounds = [...new Set(sounds)];
      frames.push(frame); firstEffect = false;
    }
  }
  if (notices.size) frames.push({ delay: 0, notices: [...notices.values()] });
  // 手番・勝敗の音は最後のコマに重ねる。コマが無ければ音だけのコマを作る
  if (tailSounds.length) {
    const last = frames[frames.length - 1];
    if (last) last.sounds = [...new Set([...(last.sounds ?? []), ...tailSounds])];
    else frames.push({ delay: 0, sounds: [...new Set(tailSounds)] });
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
      const bonus = petExplore(after.heroes.find(h => h.id === resolved.heroId)).eventBonus;
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
  // フクロウ: 扉の気配が新しく見えた（第3段階C1）
  if (prev.dungeon && next.dungeon && prev.dungeon.dungeonId === next.dungeon.dungeonId) {
    const omens = (g: GameState) => g.dungeon!.rooms.filter((r) => doorOmen(g, r)).length;
    if (omens(next) > omens(prev)) {
      const owl = next.heroes.find((h) => (!next.party || next.party.includes(h.id)) && h.hp > 0 && h.pet?.petId === 'owl');
      if (owl) add(owl.id, '何かの気配！');
    }
  }
  if (before.world && after.world && timeOfDay(before.world.worldTurn) !== 'night' && timeOfDay(after.world.worldTurn) === 'night') {
    for (const h of after.heroes) if (after.world.pos[h.id] !== undefined && petExplore(h).nightVision) add(h.id, '夜でもよく見える');
  }
  return result;
}

const OMEN_SOUND: Record<DoorOmen, SoundId> = { danger: 'sfx_dungeon_omen_danger', treasure: 'sfx_dungeon_omen_treasure', rest: 'sfx_dungeon_omen_other', mystery: 'sfx_dungeon_omen_other' };
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
  if ((t === 'WORLD_ROLL_MOVE' && prev.world?.move === null && next.world?.move !== null) || (t === 'EXPLORE_ROLL' && !!next.dungeon?.exploreRoll && next.dungeon.exploreRoll !== prev.dungeon?.exploreRoll)) out.push('sfx_world_dice');
  if (t === 'WORLD_CAMP') out.push('sfx_world_camp');
  if (t === 'DUNGEON_WATCH' && next.dungeon?.watchRoll && next.dungeon.watchRoll !== prev.dungeon?.watchRoll) out.push('sfx_dungeon_watch');
  if ((t === 'TOWN_BUY' || t === 'PEDDLER_BUY') && after !== before) out.push('sfx_ui_buy');
  if (t === 'EQUIP') out.push('sfx_ui_equip');
  // 場所に入った（町・祠・聖域・休憩・イベント）
  if (prev.mode !== next.mode && PLACE_SOUND[next.mode]) out.push(PLACE_SOUND[next.mode]!);
  // ダンジョンに入った（新しい場面ができた）
  if ((after.expeditions ?? []).some((x) => !before.expeditions?.some((y) => y.id === x.id))) out.push('sfx_world_enter_dungeon');
  // 夜になった
  if (before.world && after.world && timeOfDay(before.world.worldTurn) !== 'night' && timeOfDay(after.world.worldTurn) === 'night') out.push('sfx_world_night');
  // 扉を開けて部屋に入った（ボスの部屋は重い門の音）
  if (prev.dungeon && next.dungeon && prev.dungeon.dungeonId === next.dungeon.dungeonId && prev.dungeon.currentRoomId !== next.dungeon.currentRoomId) {
    const room = next.dungeon.rooms.find((r) => r.id === next.dungeon!.currentRoomId);
    out.push(room && getRoomType(room.type).battle?.boss ? 'sfx_dungeon_gate' : 'sfx_dungeon_door');
  }
  // 歩数を使い切った
  if (prev.dungeon && next.dungeon && prev.dungeon.dungeonId === next.dungeon.dungeonId && (prev.dungeon.explore ?? 0) > 0 && next.dungeon.explore === 0) out.push('sfx_dungeon_steps_out');
  // 扉の気配が新しく見えた（一番気になる気配の音）
  if (prev.dungeon && next.dungeon && prev.dungeon.dungeonId === next.dungeon.dungeonId) {
    const seen = new Set(prev.dungeon.rooms.filter((r) => doorOmen(prev, r)).map((r) => r.id));
    const fresh = next.dungeon.rooms.map((r) => !seen.has(r.id) && doorOmen(next, r)).filter((o): o is DoorOmen => !!o);
    const omen = (['danger', 'treasure', 'mystery', 'rest'] as const).find((o) => fresh.includes(o));
    if (omen) out.push(OMEN_SOUND[omen]);
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
