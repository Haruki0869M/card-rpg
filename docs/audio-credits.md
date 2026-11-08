# 音の出どころ（audio-credits）

ゲームに入れた音の、出どころとライセンスの記録（K6）。新しく音を足したら、ここにも書く。

## 1. Kenney（CC0）— 効果音・短いジングル

- 作者: Kenney Vleugels（https://kenney.nl）
- ライセンス: Creative Commons Zero（CC0）。個人・商用どちらでも使える。表記は任意（「あると嬉しい」）。各素材の License.txt で確認済み。
- 取得日: 2026-11-08。オーナーの OK（「8つともOK」）をまとめ役経由で受けて、kenney.nl の各素材のページからダウンロードした（登録・支払いなし）。
- 使った素材集（すべて https://kenney.nl/assets/<名前>）: rpg-audio・impact-sounds・interface-sounds・casino-audio・music-jingles・ui-audio・digital-audio・sci-fi-sounds（zip 合計 約12MB）。元の zip はリポジトリに入れていない。
- 加工: `scripts/audio/convert-ogg.mjs convert` で、モノラル 22.05kHz 16bit の WAV にし、頭と尻の無音を切り、ピークを −3dB にそろえてから、下の「音量」の倍率を掛けた（画面の操作の音や足音は小さめ）。
- 選び方: Claude は音を聞けないので、ファイル名と、長さ・音の高さの上がり下がり（`scripts/audio/convert-ogg.mjs analyze`）で選んだ。遊んでみて合わない音は、この表の行を差し替えて作り直す。

| ゲームの音の名前 | 素材集 | 元のファイル | 音量 |
|---|---|---|---|
| sfx_battle_slash | rpg-audio | knifeSlice2.ogg | 1.0 |
| sfx_battle_blunt | impact-sounds | impactPunch_heavy_001.ogg | 1.0 |
| sfx_battle_pierce | rpg-audio | knifeSlice.ogg | 1.0 |
| sfx_battle_shoot | rpg-audio | cloth1.ogg | 1.0 |
| sfx_battle_gun | sci-fi-sounds | laserRetro_001.ogg | 0.8 |
| sfx_magic_fire | sci-fi-sounds | explosionCrunch_000.ogg | 0.8 |
| sfx_magic_ice | interface-sounds | glass_004.ogg | 0.8 |
| sfx_magic_thunder | digital-audio | zap1.ogg | 0.8 |
| sfx_magic_wind | sci-fi-sounds | forceField_000.ogg | 0.8 |
| sfx_magic_light | digital-audio | powerUp3.ogg | 0.8 |
| sfx_magic_dark | digital-audio | lowThreeTone.ogg | 0.8 |
| sfx_battle_summon | digital-audio | zapThreeToneUp.ogg | 0.8 |
| sfx_battle_self | digital-audio | phaserUp1.ogg | 0.6 |
| sfx_battle_card_play | casino-audio | card-slide-1.ogg | 0.6 |
| sfx_hit_small | impact-sounds | impactPunch_medium_000.ogg | 0.8 |
| sfx_hit_mid | impact-sounds | impactPunch_heavy_002.ogg | 1.0 |
| sfx_hit_big | impact-sounds | impactPunch_heavy_000.ogg | 1.0 |
| sfx_hurt_small | impact-sounds | impactSoft_medium_000.ogg | 0.8 |
| sfx_hurt_mid | impact-sounds | impactSoft_heavy_000.ogg | 1.0 |
| sfx_hurt_big | impact-sounds | impactPlate_heavy_003.ogg | 1.0 |
| sfx_guard_ok | impact-sounds | impactMetal_heavy_000.ogg | 0.8 |
| sfx_damage_zero | impact-sounds | impactMetal_light_000.ogg | 0.6 |
| sfx_enemy_down | digital-audio | phaserDown1.ogg | 0.8 |
| sfx_status_heal | digital-audio | powerUp1.ogg | 0.6 |
| sfx_status_block_gain | impact-sounds | impactMetal_medium_000.ogg | 0.6 |
| sfx_status_buff | digital-audio | phaserUp3.ogg | 0.6 |
| sfx_status_debuff | digital-audio | phaserDown3.ogg | 0.6 |
| sfx_status_ailment | sci-fi-sounds | slime_000.ogg | 0.6 |
| sfx_status_focus | interface-sounds | pluck_001.ogg | 0.6 |
| sfx_status_mana | interface-sounds | glass_001.ogg | 0.6 |
| sfx_status_cleanse | digital-audio | highUp.ogg | 0.6 |
| sfx_enemy_attack_start | rpg-audio | cloth3.ogg | 0.6 |
| sfx_boss_phase | sci-fi-sounds | lowFrequency_explosion_001.ogg | 1.0 |
| sfx_turn_start | interface-sounds | bong_001.ogg | 0.45 |
| sfx_turn_enemy | digital-audio | lowRandom.ogg | 0.45 |
| sfx_enemy_appear | rpg-audio | creak1.ogg | 0.6 |
| sfx_battle_start | rpg-audio | drawKnife3.ogg | 0.8 |
| sfx_slot_spin | casino-audio | chips-handle-5.ogg | 0.45 |
| sfx_slot_stop | casino-audio | chip-lay-1.ogg | 0.6 |
| sfx_slot_success | interface-sounds | confirmation_001.ogg | 0.6 |
| sfx_slot_great | music-jingles | jingles_HIT00.ogg | 0.8 |
| sfx_slot_great2 | music-jingles | jingles_HIT10.ogg | 0.8 |
| sfx_slot_great3 | music-jingles | jingles_HIT11.ogg | 0.8 |
| sfx_slot_fail | interface-sounds | error_003.ogg | 0.45 |
| sfx_slot_reach | interface-sounds | maximize_004.ogg | 0.45 |
| sfx_chest_shake | casino-audio | dice-shake-2.ogg | 0.6 |
| sfx_chest_glow1 | digital-audio | powerUp2.ogg | 0.45 |
| sfx_chest_glow2 | digital-audio | powerUp6.ogg | 0.45 |
| sfx_chest_glow3 | digital-audio | powerUp9.ogg | 0.6 |
| sfx_chest_glow4 | digital-audio | powerUp12.ogg | 0.6 |
| sfx_chest_reach | interface-sounds | maximize_005.ogg | 0.6 |
| sfx_chest_legend | music-jingles | jingles_HIT15.ogg | 0.8 |
| sfx_card_flip | casino-audio | card-place-2.ogg | 0.6 |
| sfx_card_flip_rare | casino-audio | cards-pack-open-2.ogg | 0.6 |
| sfx_ui_tap | ui-audio | click1.ogg | 0.45 |
| sfx_ui_ok | interface-sounds | select_003.ogg | 0.45 |
| sfx_ui_cancel | interface-sounds | back_001.ogg | 0.45 |
| sfx_ui_deny | interface-sounds | error_006.ogg | 0.45 |
| sfx_ui_card_select | interface-sounds | select_007.ogg | 0.45 |
| sfx_ui_detail | interface-sounds | open_002.ogg | 0.45 |
| sfx_ui_notice | interface-sounds | glass_002.ogg | 0.45 |
| sfx_ui_screen | interface-sounds | maximize_008.ogg | 0.45 |
| sfx_ui_classchange | music-jingles | jingles_PIZZI12.ogg | 0.8 |
| sfx_ui_buy | rpg-audio | handleCoins.ogg | 0.6 |
| sfx_ui_coin | rpg-audio | handleCoins2.ogg | 0.6 |
| sfx_ui_levelup | music-jingles | jingles_HIT06.ogg | 0.8 |
| sfx_ui_equip | rpg-audio | metalLatch.ogg | 0.45 |
| sfx_ui_toggle | interface-sounds | toggle_001.ogg | 0.45 |
| sfx_ui_error | interface-sounds | error_002.ogg | 0.45 |
| sfx_step_grass | impact-sounds | footstep_grass_000.ogg | 0.5 |
| sfx_step_sand | impact-sounds | footstep_carpet_000.ogg | 0.5 |
| sfx_step_snow | impact-sounds | footstep_snow_000.ogg | 0.5 |
| sfx_step_stone | impact-sounds | footstep_concrete_000.ogg | 0.5 |
| sfx_world_arrive | interface-sounds | drop_002.ogg | 0.45 |
| sfx_world_dice | casino-audio | dice-throw-3.ogg | 0.6 |
| sfx_world_night | music-jingles | jingles_PIZZI13.ogg | 0.6 |
| sfx_world_enter_town | music-jingles | jingles_PIZZI10.ogg | 0.6 |
| sfx_world_enter_dungeon | rpg-audio | doorClose_3.ogg | 0.6 |
| sfx_world_event | interface-sounds | question_003.ogg | 0.45 |
| sfx_world_shrine | impact-sounds | impactBell_heavy_000.ogg | 0.6 |
| sfx_world_rest | music-jingles | jingles_PIZZI15.ogg | 0.6 |
| sfx_pet_cutin | digital-audio | pepSound3.ogg | 0.45 |
| sfx_pet_heart | digital-audio | twoTone2.ogg | 0.45 |
| sfx_pet_ribbon | interface-sounds | confirmation_003.ogg | 0.45 |
| sfx_step_dirt | rpg-audio | footstep00.ogg | 0.5 |
| sfx_step_rock | rpg-audio | footstep08.ogg | 0.5 |
| sfx_dungeon_turn | rpg-audio | cloth2.ogg | 0.45 |
| sfx_dungeon_door | rpg-audio | doorOpen_1.ogg | 0.6 |
| sfx_dungeon_gate | rpg-audio | doorOpen_2.ogg | 0.8 |
| sfx_dungeon_map | rpg-audio | bookFlip3.ogg | 0.45 |
| sfx_dungeon_steps_out | digital-audio | threeTone2.ogg | 0.45 |
| sfx_dungeon_omen_danger | impact-sounds | impactBell_heavy_002.ogg | 0.6 |
| sfx_dungeon_omen_treasure | digital-audio | powerUp10.ogg | 0.45 |
| sfx_dungeon_omen_other | digital-audio | twoTone1.ogg | 0.45 |
| sfx_turn_cutin | interface-sounds | maximize_002.ogg | 0.45 |
| sfx_turn_notice | interface-sounds | pluck_002.ogg | 0.45 |
| jgl_victory | music-jingles | jingles_PIZZI02.ogg | 0.8 |
| jgl_defeat | music-jingles | jingles_PIZZI03.ogg | 0.8 |

## 2. Claude が合成した音 — お供の鳴き声

- `scripts/audio/synth-pets.mjs` で合成（素材なし・ライセンスの心配なし）。12種 × A・B の2案。
- 今は全部 **A 案を仮に入れている**。オーナーが試聴ページ（https://claude.ai/artifact/TurtNWMNfWW3D7aBBeKs9Z ）で選んだら、選んだ案に差し替える。

## 3. まだ音が無いもの

- 効果音: `sfx_world_camp`（焚き火）・`sfx_world_fog_clear`・`sfx_dungeon_watch`・`sfx_ui_*` 以外の一部など、表に無い名前。無い音は鳴らないだけ。
- BGM: オーナーが試聴ページ（https://claude.ai/artifact/UkaMacRxKAMKF9f5VsvZie ）で OpenTracks（旧DOVA-SYNDROME）の曲を選び中。決まったら、作曲者ごとの条件を確かめて、ここに書く。OpenTracks の規約では、曲のファイルを変換せずにそのまま置くことと、曲を単体で配ることが禁止されているので、変換してから入れる。
