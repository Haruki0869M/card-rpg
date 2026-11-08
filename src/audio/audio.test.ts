import { describe, expect, it } from 'vitest';
import { CARDS } from '../data/cards';
import { getStatus } from '../data/statuses';
import { PETS } from '../data/pets';
import { battleFrames, explorationSounds } from '../store/presentation';
import { applyGameCommand, createGame } from '../engine';
import { tapSound } from './uiSounds';
import { BGM_LOOP, bgmFor } from './bgm';
import type { BattleEvent, CardDef } from '../types';
import { cardSound, damageSound, dungeonStepSound, footstepSound, hitSize, PET_CRY, perfectSound, rollResultSound, statusSound } from './cues';
import { BGM_IDS, JINGLE_IDS, PET_SOUND_IDS, PRELOAD_IDS, SFX_IDS } from './ids';
import { createLimiter } from './limiter';
import { audioReady, hasSound, playBgm, playSound, playSounds, setAudioVolumes } from './player';

const card = (over: Partial<CardDef>): CardDef => ({ id: 'x', name: 'x', category: 'physical', cost: 1, slots: 2, baseChance: 70, target: 'enemy', tiers: [{ minSuccesses: 1, effects: [{ kind: 'damage', amount: 5 }] }], ...over });

describe('音の対応表（K6）', () => {
  it('武器種・属性・召喚・自分に使うで攻撃の音を選ぶ', () => {
    expect(cardSound(card({ weaponType: 'sword' }))).toBe('sfx_battle_slash');
    expect(cardSound(card({ weaponType: 'hammer' }))).toBe('sfx_battle_blunt');
    expect(cardSound(card({ weaponType: 'spear' }))).toBe('sfx_battle_pierce');
    expect(cardSound(card({ weaponType: 'bow' }))).toBe('sfx_battle_shoot');
    expect(cardSound(card({ weaponType: 'gun' }))).toBe('sfx_battle_gun');
    expect(cardSound(card({}))).toBe('sfx_battle_slash');
    expect(cardSound(card({ category: 'magic', tiers: [{ minSuccesses: 1, effects: [{ kind: 'damage', amount: 5, element: 'fire' }] }] }))).toBe('sfx_magic_fire');
    expect(cardSound(card({ category: 'magic', tiers: [{ minSuccesses: 1, effects: [{ kind: 'damage', amount: 5, element: 'holy' }] }] }))).toBe('sfx_magic_light');
    expect(cardSound(card({ category: 'magic' }))).toBe('sfx_magic_wind');
    expect(cardSound(card({ target: 'self', tiers: [{ minSuccesses: 1, effects: [{ kind: 'block', amount: 5 }] }] }))).toBe('sfx_battle_self');
    expect(cardSound(card({ tiers: [{ minSuccesses: 1, effects: [{ kind: 'summon', id: 's', name: 's', icon: 's', damage: 3, turns: 2 }] }] }))).toBe('sfx_battle_summon');
  });
  it('登録されている全カードで、音の一覧にある名前を返す', () => {
    const ids = new Set<string>(SFX_IDS);
    for (const c of CARDS.all) expect(ids.has(cardSound(c)), c.id).toBe(true);
  });
  it('ダメージの大きさ（1〜9 小・10〜24 中・25以上 大）と、味方・敵・防御・0 を分ける', () => {
    expect([hitSize(1), hitSize(9), hitSize(10), hitSize(24), hitSize(25)]).toEqual(['small', 'small', 'mid', 'mid', 'big']);
    expect(damageSound(12, 0, false)).toBe('sfx_hit_mid');
    expect(damageSound(30, 0, true)).toBe('sfx_hurt_big');
    expect(damageSound(0, 5, true)).toBe('sfx_guard_ok');
    expect(damageSound(0, 0, false)).toBe('sfx_damage_zero');
  });
  it('状態の良し悪しで強化・弱体・状態異常・治ったを分ける', () => {
    expect(statusSound(getStatus('burn'), 1)).toBe('sfx_status_ailment');
    expect(statusSound(getStatus('weak'), 1)).toBe('sfx_status_debuff');
    expect(statusSound(getStatus('regen'), 2)).toBe('sfx_status_buff');
    expect(statusSound(getStatus('poison'), -1)).toBe('sfx_status_cleanse');
    expect(statusSound(getStatus('regen'), -1)).toBeUndefined();
  });
  it('完全成功はスロットの数で段階が上がる', () => {
    expect([perfectSound(2), perfectSound(3), perfectSound(4), perfectSound(5), perfectSound(6)]).toEqual(['sfx_slot_great', 'sfx_slot_great', 'sfx_slot_great2', 'sfx_slot_great2', 'sfx_slot_great3']);
    expect(rollResultSound(0, 3, false)).toBe('sfx_slot_fail');
    expect(rollResultSound(2, 3, false)).toBe('sfx_slot_success');
    expect(rollResultSound(3, 3, true)).toBe('sfx_slot_great');
  });
  it('お供12種すべてに鳴き声の名前があり、名前の重なりが無い', () => {
    for (const p of PETS.all) expect(PET_CRY[p.id], p.id).toBeDefined();
    expect(new Set(Object.values(PET_CRY)).size).toBe(PET_SOUND_IDS.length);
  });
  it('音の名前は決まり（小文字・英数字と _）どおりで、重なりが無い', () => {
    const all: string[] = [...SFX_IDS, ...PET_SOUND_IDS, ...BGM_IDS, ...JINGLE_IDS];
    expect(new Set(all).size).toBe(all.length);
    for (const id of all) expect(id).toMatch(/^(sfx|pet|bgm|jgl)_[a-z0-9_]+$/);
    for (const id of PRELOAD_IDS) expect(all).toContain(id);
  });
});

describe('同時に鳴る数の制限', () => {
  it('同じ音は50ms空け、同時に2つまで', () => {
    const l = createLimiter();
    expect(l.tryStart('a', 0, 300)).toBe(true);
    expect(l.tryStart('a', 20, 300)).toBe(false);
    expect(l.tryStart('a', 60, 300)).toBe(true);
    expect(l.tryStart('a', 120, 300)).toBe(false);
    expect(l.tryStart('a', 310, 300)).toBe(true);
  });
  it('お供の鳴き声は、同じ声を3秒空ける（ほかの音は今までどおり）', () => {
    const l = createLimiter();
    expect(l.tryStart('pet_okame', 0, 500, 3000)).toBe(true);
    expect(l.tryStart('pet_okame', 1000, 500, 3000)).toBe(false);
    expect(l.tryStart('pet_owl', 1000, 500, 3000)).toBe(true);
    expect(l.tryStart('pet_okame', 3001, 500, 3000)).toBe(true);
  });
  it('全体で12まで。鳴り終わった分は数えない', () => {
    const l = createLimiter();
    for (let i = 0; i < 12; i++) expect(l.tryStart(`s${i}`, 0, 100)).toBe(true);
    expect(l.tryStart('s12', 0, 100)).toBe(false);
    expect(l.active(50)).toBe(12);
    expect(l.tryStart('s12', 100, 100)).toBe(true);
    expect(l.active(100)).toBe(1);
  });
});

describe('音のファイルが無い・音が使えない時', () => {
  it('何もせず、エラーも出さない', () => {
    // 野営の音はまだファイルが無い（無い音でも何も起きないことを確かめる）
    expect(hasSound('sfx_world_camp')).toBe(false);
    expect(audioReady()).toBe(false);
    expect(() => {
      setAudioVolumes({ sfxVolume: 5, bgmVolume: 4, petVolume: 3 });
      playSound('sfx_world_camp');
      playSounds(['sfx_hit_big', 'jgl_victory'], { quiet: true });
      playBgm('bgm_battle');
      playBgm(null);
    }).not.toThrow();
  });
});

describe('戦闘の演出の音', () => {
  const allies = new Set(['a0']);
  const roll = (successes: number): BattleEvent => ({ type: 'roll', characterId: 'a0', cardId: 'strike', targetId: 'e0', chance: 80, results: successes ? ['hit'] : ['miss'], successes, perfect: successes > 0, summary: '確認' });
  it('カードを出す音はスロットのコマ、攻撃の音は最初に効果が見えるコマで鳴る', () => {
    const f = battleFrames([roll(1), { type: 'damage', unitId: 'e0', sourceId: 'a0', amount: 12, blocked: 0 }], allies);
    expect(f[0].sounds).toEqual(['sfx_battle_card_play']);
    expect(f[1].sounds?.[1]).toBe('sfx_hit_mid');
    expect(SFX_IDS).toContain(f[1].sounds?.[0]);
  });
  it('失敗した時は攻撃の音を鳴らさない', () => {
    const f = battleFrames([roll(0), { type: 'damage', unitId: 'e0', sourceId: 'a0', amount: 2, blocked: 0 }], allies);
    expect(f[1].sounds).toEqual(['sfx_hit_small']);
  });
  it('味方の被弾・敵の踏み込み・撃破・勝利', () => {
    const f = battleFrames([{ type: 'enemyAct', enemyUid: 'e0', actionName: '噛みつき', targetIds: ['a0'] }, { type: 'damage', unitId: 'a0', sourceId: 'e0', amount: 30, blocked: 0 }], allies);
    expect(f[0].sounds).toEqual(['sfx_enemy_attack_start']); expect(f[1].sounds).toEqual(['sfx_hurt_big']);
    const k = battleFrames([{ type: 'damage', unitId: 'e0', sourceId: 'a0', amount: 5, blocked: 0 }, { type: 'death', unitId: 'e0' }, { type: 'phase', phase: 'victory' }], allies);
    expect(k[k.length - 1].sounds).toEqual(['sfx_hit_small', 'sfx_enemy_down', 'jgl_victory']);
  });
  it('長い連撃は、まとめた分の音を鳴らさない', () => {
    const f = battleFrames(Array.from({ length: 12 }, () => ({ type: 'damage' as const, sourceId: 'a0', unitId: 'e0', amount: 3, blocked: 0 })), allies);
    expect(f.flatMap((x) => x.sounds ?? []).filter((s) => s === 'sfx_hit_small')).toHaveLength(3);
  });
  it('手番が変わっただけなら音だけのコマ、ほかのコマがあればそこに重ねる', () => {
    expect(battleFrames([{ type: 'phase', phase: 'enemy' }], allies)).toEqual([{ delay: 0, sounds: ['sfx_turn_enemy'] }]);
    const f = battleFrames([{ type: 'block', unitId: 'a0', amount: 3 }, { type: 'phase', phase: 'ally' }], allies);
    expect(f).toHaveLength(1); expect(f[0].sounds).toEqual(['sfx_status_block_gain', 'sfx_turn_start']);
  });
  it('音を決めても、入力の出来事は変えない', () => {
    const events: BattleEvent[] = [roll(1), { type: 'damage', unitId: 'e0', sourceId: 'a0', amount: 12, blocked: 0 }, { type: 'death', unitId: 'e0' }], before = structuredClone(events);
    battleFrames(events, allies);
    expect(events).toEqual(before);
  });
});

describe('探索・画面の操作・BGM の音（K6②）', () => {
  const fresh = () => createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', name: '確認', gender: 'male', playerId: 'P1' }] });
  it('サイコロを振ると音が鳴り、同じ状態どうし（描画のやり直し）では鳴らない', () => {
    const g = fresh(); g.world!.story = undefined;
    const cmd = { type: 'WORLD_ROLL_MOVE' as const, playerId: 'P1' as const, heroId: g.heroes[0].id, focusUsed: 0 };
    const r = applyGameCommand(g, cmd); expect(r.error).toBeUndefined();
    expect(explorationSounds(g, r.state, cmd)).toContain('sfx_world_dice');
    expect(explorationSounds(r.state, r.state, cmd)).toEqual([]);
  });
  it('なでるとお供の鳴き声、懐き度の段が上がるとハート、♡3でリボン', () => {
    const g = fresh(), h = g.heroes[0];
    h.pet = { petId: 'cockatiel', color: 'normal', name: 'ぴー', love: 0, acts: 0 };
    const after = structuredClone(g); after.heroes[0].pet!.love = 999;
    const cmd = { type: 'PET_PAT' as const, playerId: 'P1' as const, heroId: h.id };
    const s = explorationSounds(g, after, cmd);
    expect(s).toContain('pet_okame'); expect(s).toContain('sfx_pet_ribbon');
  });
  it('お金が増えると硬貨の音、買い物は購入の音だけ', () => {
    const g = fresh(), after = structuredClone(g); after.heroes[0].gold += 10;
    expect(explorationSounds(g, after, { type: 'CLAIM_LOOT', playerId: 'P1' } as never)).toContain('sfx_ui_coin');
    const buy = explorationSounds(g, after, { type: 'TOWN_BUY', playerId: 'P1' } as never);
    expect(buy).toContain('sfx_ui_buy'); expect(buy).not.toContain('sfx_ui_coin');
  });
  it('ボタンの名前でタップの音を分け、data-sfx と切り替えボタンを優先する', () => {
    expect(tapSound('閉じる')).toBe('sfx_ui_cancel');
    expect(tapSound('発動')).toBe('sfx_ui_ok');
    expect(tapSound('装備')).toBe('sfx_ui_tap');
    expect(tapSound('閉じる', 'none')).toBeNull();
    expect(tapSound('通常', null, true)).toBe('sfx_ui_toggle');
  });
  it('場面ごとの曲（タイトル・昼夜・ボス・勝敗の間は止める）', () => {
    const g = fresh();
    expect(bgmFor('title', null)).toBe('bgm_title');
    expect(bgmFor('game', { ...g, mode: 'town' })).toBe('bgm_town');
    expect(['bgm_world_day', 'bgm_world_night']).toContain(bgmFor('game', { ...g, mode: 'world' }));
    expect(bgmFor('game', { ...g, mode: 'reward' })).toBeNull();
    expect(bgmFor('game', { ...g, mode: 'ending' })).toBe('bgm_ending');
    for (const k of Object.keys(BGM_LOOP)) expect(BGM_IDS).toContain(k);
    for (const s of [bgmFor('game', { ...g, mode: 'dungeon' }), bgmFor('game', { ...g, mode: 'chest' })]) expect(BGM_IDS).toContain(s);
  });
  it('地形とダンジョンで足音を選ぶ', () => {
    expect(footstepSound('plains')).toBe('sfx_step_grass');
    expect(footstepSound('desert')).toBe('sfx_step_sand');
    expect(footstepSound('snow')).toBe('sfx_step_snow');
    expect(footstepSound('road')).toBe('sfx_step_stone');
    expect(footstepSound(undefined)).toBe('sfx_step_stone');
    expect(dungeonStepSound('forestCave')).toBe('sfx_step_dirt');
    expect(dungeonStepSound('volcano')).toBe('sfx_step_rock');
    expect(dungeonStepSound('temple')).toBe('sfx_step_stone');
  });
});

describe('置いた音のファイル', () => {
  it('src/assets/audio の音は、すべて一覧にある名前で、種類のフォルダに入っている', async () => {
    const { readdirSync } = await import('node:fs');
    const ids = new Set<string>([...SFX_IDS, ...PET_SOUND_IDS, ...BGM_IDS, ...JINGLE_IDS]);
    for (const dir of ['sfx', 'pet', 'bgm']) {
      for (const f of readdirSync(`src/assets/audio/${dir}`).filter((f) => /\.(aac|webm|mp3|ogg|m4a|wav)$/.test(f))) {
        const id = f.replace(/\.(aac|webm|mp3|ogg|m4a|wav)$/, '');
        expect(ids.has(id), f).toBe(true);
        expect(dir === 'pet' ? id.startsWith('pet_') : dir === 'bgm' ? id.startsWith('bgm_') : id.startsWith('sfx_') || id.startsWith('jgl_'), f).toBe(true);
      }
    }
  });
});
