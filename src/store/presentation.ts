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
import { doorOmen } from '../engine/game/dungeonOmen';
import { restMultiplierOf } from '../engine/game/common';
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
}

/** 順序の整理だけを行う。エンジンの状態や乱数には触れない。 */
export function battleFrames(events: BattleEvent[]): PresentationFrame[] {
  const frames: PresentationFrame[] = [], actors = new Set<string>();
  const roll = events.find(e => e.type === 'roll');
  const act = events.find(e => e.type === 'enemyAct');
  if (roll?.type === 'roll') {
    actors.add(roll.characterId);
    frames.push({ delay: 0, roll, motions: [{ unitId: roll.characterId, kind: getCard(roll.cardId).target === 'self' ? 'cast' : 'attack' }] });
  } else if (act?.type === 'enemyAct') {
    actors.add(act.enemyUid); frames.push({ delay: 0, motions: [{ unitId: act.enemyUid, kind: 'attack' }] });
  }
  const notices = new Map<string, NoticeDraft>();
  let firstEffect = true;
  const hitCounts = new Map<string, number>();
  for (const e of events) {
    const popups: PopupDraft[] = [], motions: NonNullable<PresentationFrame['motions']> = [];
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
    } else if (e.type === 'block' && e.amount > 0) popups.push({ unitId: e.unitId, tone: 'block', text: `ブロック+${e.amount}` });
    else if (e.type === 'heal' && e.amount > 0) popups.push({ unitId: e.unitId, tone: 'heal', text: `HP+${e.amount}` });
    else if (e.type === 'status' && e.amount) popups.push({ unitId: e.unitId, tone: 'status', text: `${getStatus(e.status).name}${e.amount > 0 ? '+' : ''}${e.amount}` });
    else if (e.type === 'resource' && e.amount > 0) popups.push({ unitId: e.unitId, tone: 'resource', text: `${e.resource === 'focus' ? 'フォーカス' : 'マナ'}+${e.amount}` });
    else if (e.type === 'ability') {
      const parent = [...notices.entries()].find(([, n]) => n.unitId === e.unitId && n.name === e.name && n.source?.kind !== 'summon');
      if (e.source?.kind === 'summon' && parent) continue;
      if (e.source?.kind !== 'summon') for (const [key, n] of notices) if (n.unitId === e.unitId && n.name === e.name && n.source?.kind === 'summon') notices.delete(key);
      const key = `${e.unitId}:${e.source?.kind}:${e.source?.id}:${e.name}`, old = notices.get(key);
      if (old) old.count = (old.count ?? 1) + 1;
      else notices.set(key, { unitId: e.unitId, name: e.name, source: e.source });
    } else if (e.type === 'enemyPhase') {
      motions.push({ unitId: e.enemyUid, kind: 'phase' }); popups.push({ unitId: e.enemyUid, tone: 'ability', text: e.name });
    }
    if (popups.length || motions.length) {
      frames.push({ delay: firstEffect && actors.size ? TIMING.actionLead : TIMING.effectStep, popups, motions }); firstEffect = false;
    }
  }
  if (notices.size) frames.push({ delay: 0, notices: [...notices.values()] });
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
