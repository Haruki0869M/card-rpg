// ===== 音の名前の一覧（K6） =====
// docs/audio-list.md と docs/tasks/stage3-dungeon-plan.md §11 の ID をそのまま並べる。
// ファイルは src/assets/audio/<sfx|bgm|pet>/<ID>.mp3 に置くだけで鳴る（無ければ何もしない）。

export const SFX_IDS = [
  // 戦闘・攻撃
  'sfx_battle_slash', 'sfx_battle_blunt', 'sfx_battle_pierce', 'sfx_battle_shoot', 'sfx_battle_gun',
  'sfx_magic_fire', 'sfx_magic_ice', 'sfx_magic_thunder', 'sfx_magic_wind', 'sfx_magic_light', 'sfx_magic_dark',
  'sfx_battle_summon', 'sfx_battle_self', 'sfx_battle_card_play',
  // 連携・ジョブの能力（Step C。合成: scripts/audio/synth-synergy.mjs）
  'sfx_battle_combo', 'sfx_battle_ability',
  // ダメージ・防御
  'sfx_hit_small', 'sfx_hit_mid', 'sfx_hit_big', 'sfx_hurt_small', 'sfx_hurt_mid', 'sfx_hurt_big',
  'sfx_guard_ok', 'sfx_damage_zero', 'sfx_enemy_down',
  // 回復・状態
  'sfx_status_heal', 'sfx_status_block_gain', 'sfx_status_buff', 'sfx_status_debuff', 'sfx_status_ailment',
  'sfx_status_focus', 'sfx_status_mana', 'sfx_status_cleanse',
  // 敵・ターン
  'sfx_enemy_attack_start', 'sfx_boss_phase', 'sfx_turn_start', 'sfx_turn_enemy', 'sfx_enemy_appear', 'sfx_battle_start',
  // スロット
  'sfx_slot_spin', 'sfx_slot_stop', 'sfx_slot_success', 'sfx_slot_great', 'sfx_slot_great2', 'sfx_slot_great3',
  'sfx_slot_fail', 'sfx_slot_reach',
  // 宝箱・報酬
  'sfx_chest_shake', 'sfx_chest_glow1', 'sfx_chest_glow2', 'sfx_chest_glow3', 'sfx_chest_glow4',
  'sfx_chest_reach', 'sfx_chest_legend', 'sfx_card_flip', 'sfx_card_flip_rare',
  // 画面操作
  'sfx_ui_tap', 'sfx_ui_ok', 'sfx_ui_cancel', 'sfx_ui_deny', 'sfx_ui_card_select', 'sfx_ui_detail', 'sfx_ui_notice',
  'sfx_ui_screen', 'sfx_ui_classchange', 'sfx_ui_buy', 'sfx_ui_coin', 'sfx_ui_levelup', 'sfx_ui_equip',
  'sfx_ui_toggle', 'sfx_ui_error',
  // 世界マップ
  'sfx_step_grass', 'sfx_step_sand', 'sfx_step_snow', 'sfx_step_stone', 'sfx_world_arrive', 'sfx_world_dice',
  'sfx_world_camp', 'sfx_world_night', 'sfx_world_enter_town', 'sfx_world_enter_dungeon', 'sfx_world_fog_clear',
  'sfx_world_event', 'sfx_world_shrine', 'sfx_world_rest',
  // お供
  'sfx_pet_cutin', 'sfx_pet_heart', 'sfx_pet_ribbon',
  // ダンジョン（第3段階 §11）
  'sfx_step_dirt', 'sfx_step_rock', 'sfx_dungeon_turn', 'sfx_dungeon_door', 'sfx_dungeon_gate', 'sfx_dungeon_map',
  'sfx_dungeon_steps_out', 'sfx_dungeon_omen_danger', 'sfx_dungeon_omen_treasure', 'sfx_dungeon_omen_other',
  'sfx_dungeon_watch', 'sfx_turn_cutin', 'sfx_turn_notice',
] as const;

export const PET_SOUND_IDS = [
  'pet_okame', 'pet_wolf', 'pet_cat', 'pet_turtle', 'pet_dragon', 'pet_rabbit',
  'pet_owl', 'pet_fox', 'pet_bunting', 'pet_budgie', 'pet_nagae', 'pet_redpanda',
] as const;

export const BGM_IDS = [
  'bgm_title', 'bgm_town', 'bgm_world_day', 'bgm_world_night', 'bgm_dungeon', 'bgm_battle', 'bgm_boss',
  'bgm_camp', 'bgm_chest', 'bgm_ending', 'bgm_sc1', 'bgm_sc2', 'bgm_sc3', 'bgm_sc4', 'bgm_sc5', 'bgm_sc6', 'bgm_sc7',
] as const;

export const JINGLE_IDS = ['jgl_victory', 'jgl_defeat', 'jgl_ending'] as const;

export type SfxId = (typeof SFX_IDS)[number];
export type PetSoundId = (typeof PET_SOUND_IDS)[number];
export type BgmId = (typeof BGM_IDS)[number];
export type JingleId = (typeof JINGLE_IDS)[number];
/** 1回だけ鳴らす音（効果音・鳴き声・ジングル） */
export type SoundId = SfxId | PetSoundId | JingleId;

/** 戦闘・画面操作でよく使う短い音。音が使えるようになった後、裏で先に読み込む */
export const PRELOAD_IDS: readonly SoundId[] = [
  'sfx_ui_tap', 'sfx_ui_ok', 'sfx_ui_cancel', 'sfx_ui_deny', 'sfx_ui_card_select',
  'sfx_battle_card_play', 'sfx_slot_spin', 'sfx_slot_stop', 'sfx_slot_success', 'sfx_slot_fail', 'sfx_slot_great',
  'sfx_battle_slash', 'sfx_battle_blunt', 'sfx_magic_fire',
  'sfx_hit_small', 'sfx_hit_mid', 'sfx_hit_big', 'sfx_hurt_small', 'sfx_hurt_mid', 'sfx_hurt_big',
  'sfx_guard_ok', 'sfx_enemy_down', 'sfx_status_heal', 'sfx_status_block_gain', 'sfx_turn_start',
];
