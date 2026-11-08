# 音の出どころ（audio-credits）

ゲームに入れた音の、出どころとライセンスの記録（K6）。新しく音を足したら、ここにも書く。

## 1. Kenney（CC0）— 効果音・短いジングル

- 作者: Kenney Vleugels（https://kenney.nl）
- ライセンス: Creative Commons Zero（CC0）。個人・商用どちらでも使える。表記は任意（「あると嬉しい」）。各素材の License.txt で確認済み。
- 取得日: 2026-11-08。オーナーの OK（「8つともOK」）をまとめ役経由で受けて、kenney.nl の各素材のページからダウンロードした（登録・支払いなし）。
- 使った素材集（すべて https://kenney.nl/assets/<名前>）: rpg-audio・impact-sounds・interface-sounds・casino-audio・music-jingles・ui-audio・digital-audio・sci-fi-sounds（zip 合計 約12MB）。元の zip はリポジトリに入れていない。
- 加工: `scripts/audio/convert-ogg.mjs convert` で、モノラル 22.05kHz 16bit の WAV にし、頭と尻の無音を切り、ピークを −3dB にそろえてから、下の「音量」の倍率を掛けた（画面の操作の音や足音は小さめ）。
- **耳障りにしない加工（オーナーの指示: うるさい音・耳障りな音はダメ）**: 表の「高い音を削る」より上をなだらかに削り（明るすぎる音は 4500Hz）、頭と尻に短いフェード、詰まった大きな音は平均の大きさを −20dB までに抑えた。高すぎる・鋭い音だった11個は、同じ素材集のやわらかい音に差し替えた（銃・氷・リーチ2つ・手番のカットイン・詳細・装備・リールの停止・エラー・地図・購入は小さく）。さらにゲームの中でも、効果音は 6kHz から上を −4dB、鳴き声は 3.5kHz から上を −8dB にしてから鳴らす（`src/audio/player.ts`）。
- 選び方: Claude は音を聞けないので、ファイル名と、長さ・音の高さの上がり下がり（`scripts/audio/convert-ogg.mjs analyze`）で選んだ。遊んでみて合わない音は、この表の行を差し替えて作り直す。

| ゲームの音の名前 | 素材集 | 元のファイル | 音量 | 高い音を削る（Hz） |
|---|---|---|---|---|
| sfx_battle_slash | rpg-audio | knifeSlice2.ogg | 1.0 | 4500 |
| sfx_battle_blunt | impact-sounds | impactPunch_heavy_001.ogg | 1.0 | 6000 |
| sfx_battle_pierce | rpg-audio | knifeSlice.ogg | 1.0 | 4500 |
| sfx_battle_shoot | rpg-audio | cloth1.ogg | 1.0 | 6000 |
| sfx_battle_gun | impact-sounds | impactPlate_light_000.ogg | 0.8 | 6000 |
| sfx_magic_fire | sci-fi-sounds | explosionCrunch_000.ogg | 0.8 | 6000 |
| sfx_magic_ice | digital-audio | highDown.ogg | 0.6 | 4500 |
| sfx_magic_thunder | digital-audio | zap1.ogg | 0.8 | 6000 |
| sfx_magic_wind | sci-fi-sounds | forceField_000.ogg | 0.8 | 6000 |
| sfx_magic_light | digital-audio | powerUp3.ogg | 0.8 | 4500 |
| sfx_magic_dark | digital-audio | lowThreeTone.ogg | 0.8 | 6000 |
| sfx_battle_summon | digital-audio | zapThreeToneUp.ogg | 0.8 | 6000 |
| sfx_battle_self | digital-audio | phaserUp1.ogg | 0.6 | 6000 |
| sfx_battle_card_play | casino-audio | card-slide-1.ogg | 0.6 | 6000 |
| sfx_hit_small | impact-sounds | impactPunch_medium_000.ogg | 0.8 | 6000 |
| sfx_hit_mid | impact-sounds | impactPunch_heavy_002.ogg | 1.0 | 6000 |
| sfx_hit_big | impact-sounds | impactPunch_heavy_000.ogg | 1.0 | 6000 |
| sfx_hurt_small | impact-sounds | impactSoft_medium_000.ogg | 0.8 | 6000 |
| sfx_hurt_mid | impact-sounds | impactSoft_heavy_000.ogg | 1.0 | 6000 |
| sfx_hurt_big | impact-sounds | impactPlate_heavy_003.ogg | 1.0 | 6000 |
| sfx_guard_ok | impact-sounds | impactMetal_heavy_000.ogg | 0.8 | 6000 |
| sfx_damage_zero | impact-sounds | impactMetal_light_000.ogg | 0.6 | 6000 |
| sfx_enemy_down | digital-audio | phaserDown1.ogg | 0.8 | 6000 |
| sfx_status_heal | digital-audio | powerUp1.ogg | 0.6 | 6000 |
| sfx_status_block_gain | impact-sounds | impactMetal_medium_000.ogg | 0.6 | 6000 |
| sfx_status_buff | digital-audio | phaserUp3.ogg | 0.6 | 6000 |
| sfx_status_debuff | digital-audio | phaserDown3.ogg | 0.6 | 6000 |
| sfx_status_ailment | sci-fi-sounds | slime_000.ogg | 0.6 | 4500 |
| sfx_status_focus | interface-sounds | pluck_001.ogg | 0.6 | 4500 |
| sfx_status_mana | interface-sounds | glass_001.ogg | 0.6 | 6000 |
| sfx_status_cleanse | digital-audio | highUp.ogg | 0.6 | 6000 |
| sfx_enemy_attack_start | rpg-audio | cloth3.ogg | 0.6 | 6000 |
| sfx_boss_phase | sci-fi-sounds | lowFrequency_explosion_001.ogg | 1.0 | 6000 |
| sfx_turn_start | interface-sounds | bong_001.ogg | 0.45 | 6000 |
| sfx_turn_enemy | digital-audio | lowRandom.ogg | 0.45 | 6000 |
| sfx_enemy_appear | rpg-audio | creak1.ogg | 0.6 | 6000 |
| sfx_battle_start | rpg-audio | drawKnife3.ogg | 0.8 | 6000 |
| sfx_slot_spin | casino-audio | chips-handle-5.ogg | 0.45 | 4500 |
| sfx_slot_stop | casino-audio | chip-lay-3.ogg | 0.6 | 6000 |
| sfx_slot_success | interface-sounds | confirmation_001.ogg | 0.6 | 6000 |
| sfx_slot_great | music-jingles | jingles_HIT00.ogg | 0.8 | 6000 |
| sfx_slot_great2 | music-jingles | jingles_HIT10.ogg | 0.8 | 6000 |
| sfx_slot_great3 | music-jingles | jingles_HIT11.ogg | 0.8 | 6000 |
| sfx_slot_fail | interface-sounds | error_003.ogg | 0.45 | 6000 |
| sfx_slot_reach | interface-sounds | maximize_006.ogg | 0.45 | 6000 |
| sfx_chest_shake | casino-audio | dice-shake-2.ogg | 0.6 | 4500 |
| sfx_chest_glow1 | digital-audio | powerUp2.ogg | 0.45 | 6000 |
| sfx_chest_glow2 | digital-audio | powerUp6.ogg | 0.45 | 6000 |
| sfx_chest_glow3 | digital-audio | powerUp9.ogg | 0.6 | 6000 |
| sfx_chest_glow4 | digital-audio | powerUp12.ogg | 0.6 | 6000 |
| sfx_chest_reach | interface-sounds | maximize_009.ogg | 0.6 | 6000 |
| sfx_chest_legend | music-jingles | jingles_HIT15.ogg | 0.8 | 6000 |
| sfx_card_flip | casino-audio | card-place-2.ogg | 0.6 | 4500 |
| sfx_card_flip_rare | casino-audio | cards-pack-open-2.ogg | 0.6 | 4500 |
| sfx_ui_tap | ui-audio | click1.ogg | 0.45 | 6000 |
| sfx_ui_ok | interface-sounds | select_003.ogg | 0.45 | 6000 |
| sfx_ui_cancel | interface-sounds | back_001.ogg | 0.45 | 6000 |
| sfx_ui_deny | interface-sounds | error_006.ogg | 0.45 | 6000 |
| sfx_ui_card_select | interface-sounds | select_007.ogg | 0.45 | 6000 |
| sfx_ui_detail | interface-sounds | select_005.ogg | 0.45 | 6000 |
| sfx_ui_notice | interface-sounds | glass_002.ogg | 0.45 | 6000 |
| sfx_ui_screen | interface-sounds | maximize_008.ogg | 0.45 | 6000 |
| sfx_ui_classchange | music-jingles | jingles_PIZZI12.ogg | 0.8 | 6000 |
| sfx_ui_buy | rpg-audio | handleCoins.ogg | 0.45 | 4500 |
| sfx_ui_coin | rpg-audio | handleCoins2.ogg | 0.6 | 4500 |
| sfx_ui_levelup | music-jingles | jingles_HIT06.ogg | 0.8 | 6000 |
| sfx_ui_equip | impact-sounds | impactPlank_medium_000.ogg | 0.45 | 6000 |
| sfx_ui_toggle | interface-sounds | toggle_001.ogg | 0.45 | 6000 |
| sfx_ui_error | interface-sounds | error_004.ogg | 0.45 | 6000 |
| sfx_step_grass | impact-sounds | footstep_grass_000.ogg | 0.5 | 6000 |
| sfx_step_sand | impact-sounds | footstep_carpet_000.ogg | 0.5 | 6000 |
| sfx_step_snow | impact-sounds | footstep_snow_000.ogg | 0.5 | 6000 |
| sfx_step_stone | impact-sounds | footstep_concrete_000.ogg | 0.5 | 6000 |
| sfx_world_arrive | interface-sounds | drop_002.ogg | 0.45 | 6000 |
| sfx_world_dice | casino-audio | dice-throw-3.ogg | 0.6 | 6000 |
| sfx_world_night | music-jingles | jingles_PIZZI13.ogg | 0.6 | 6000 |
| sfx_world_enter_town | music-jingles | jingles_PIZZI10.ogg | 0.6 | 6000 |
| sfx_world_enter_dungeon | rpg-audio | doorClose_3.ogg | 0.6 | 6000 |
| sfx_world_event | interface-sounds | question_003.ogg | 0.45 | 6000 |
| sfx_world_shrine | impact-sounds | impactBell_heavy_000.ogg | 0.6 | 6000 |
| sfx_world_rest | music-jingles | jingles_PIZZI15.ogg | 0.6 | 6000 |
| sfx_pet_cutin | digital-audio | pepSound3.ogg | 0.45 | 6000 |
| sfx_pet_heart | digital-audio | twoTone2.ogg | 0.45 | 6000 |
| sfx_pet_ribbon | interface-sounds | confirmation_003.ogg | 0.45 | 6000 |
| sfx_step_dirt | rpg-audio | footstep00.ogg | 0.5 | 6000 |
| sfx_step_rock | rpg-audio | footstep08.ogg | 0.5 | 6000 |
| sfx_dungeon_turn | rpg-audio | cloth2.ogg | 0.45 | 6000 |
| sfx_dungeon_door | rpg-audio | doorOpen_1.ogg | 0.6 | 6000 |
| sfx_dungeon_gate | rpg-audio | doorOpen_2.ogg | 0.8 | 6000 |
| sfx_dungeon_map | rpg-audio | bookFlip1.ogg | 0.45 | 4500 |
| sfx_dungeon_steps_out | digital-audio | threeTone2.ogg | 0.45 | 6000 |
| sfx_dungeon_omen_danger | impact-sounds | impactBell_heavy_002.ogg | 0.6 | 6000 |
| sfx_dungeon_omen_treasure | digital-audio | powerUp10.ogg | 0.45 | 4500 |
| sfx_dungeon_omen_other | digital-audio | twoTone1.ogg | 0.45 | 6000 |
| sfx_turn_cutin | interface-sounds | maximize_007.ogg | 0.45 | 6000 |
| sfx_turn_notice | interface-sounds | pluck_002.ogg | 0.45 | 4500 |
| jgl_victory | music-jingles | jingles_PIZZI02.ogg | 0.8 | 6000 |
| jgl_defeat | music-jingles | jingles_PIZZI03.ogg | 0.8 | 6000 |

## 2. Claude が合成した音 — お供の鳴き声

- `scripts/audio/synth-pets.mjs` で合成（素材なし・ライセンスの心配なし）。12種 × A・B の2案。
- オーナーが試聴ページ（https://claude.ai/artifact/TurtNWMNfWW3D7aBBeKs9Z ）で選んだ案を入れた: A = オカメインコ・子狼・黒猫・子亀・小竜・フクロウ・文鳥・シマエナガ、B = うさぎ・子狐・セキセイインコ・レッサーパンダ。
- 高い声がしんどかったので、合成の時に 5kHz から上をなだらかに削り、声が高いほど小さくした（6kHz で約 −9dB）。鳴き声は効果音と別の音量（最初は 30%）で、同じお供の声は3秒空ける。

## 3. まだ音が無いもの

- 効果音: `sfx_world_camp`（焚き火）・`sfx_world_fog_clear`・`sfx_dungeon_watch`・`sfx_ui_*` 以外の一部など、表に無い名前。無い音は鳴らないだけ。
- BGM: 下の §4（ダウンロード待ち）。

## 4. BGM（OpenTracks・旧DOVA-SYNDROME）

音の担当がオーナーと選び、オーナーの OK を受けて音の担当がダウンロードした曲（原本は `C:/dev/card-rpg-assets/bgm-original/`、リポジトリの外。原本はリポジトリに入れない）。
**2026-11-08 に、K6 がサイトの規約と作曲者ごとの利用条件のページを読んで、10曲すべて組み込んでよいことを確かめた。**

| ゲームの曲 | 曲名 | 作曲者 | 曲のページ | 作曲者の利用条件（作曲者のページの文の要点） | クレジット | つなぎ方 |
|---|---|---|---|---|---|---|
| bgm_title | 星と月の丘 | MATSU | https://opentracks.com/bgm/detail/12078 | サイトの音源利用ライセンスに準拠（https://opentracks.com/creator/detail/84） | 不要 | 重ねてつなぐ |
| bgm_town | 見習い音楽家の転生先はミクソリディアンの香り漂う街でした | ハモおた | https://opentracks.com/bgm/detail/13861 | ライセンス＋「公開している楽曲のAI学習は固く禁止」（/creator/detail/416） | 不要 | 重ねてつなぐ |
| bgm_world_day | 光差し込む森 | 蒲鉾さちこ | https://opentracks.com/bgm/detail/17343 | ライセンス＋「サイトの利用規約に則って」「使用の許可や一言は不要」「クレジットは任意（もらえると励み）」。曲のページに「無断転載・AI学習・大幅な曲の改変は禁止」（/creator/detail/418） | 任意 | 継ぎ目なく |
| bgm_world_night | 星空の下で | 田中芳典 | https://opentracks.com/bgm/detail/12703 | ライセンスに準拠（/creator/detail/130） | 不要 | 重ねてつなぐ |
| bgm_dungeon | 隠された遺跡の中へ | 秦暁 | https://opentracks.com/bgm/detail/14563 | ライセンス＋「利用規約に準じる」「年齢制限のある作品も可」「クレジット（作曲者名・楽曲名）は任意」（/creator/detail/425） | 任意 | 重ねてつなぐ |
| bgm_boss | ラスボスというほどではない中ボスぐらいの戦闘 | シンシンワダ | https://opentracks.com/bgm/detail/2182 | ライセンスに準拠（/creator/detail/91） | 不要 | 継ぎ目なく |
| bgm_camp | 穏やかな昼下がり | OK-Sounds | https://opentracks.com/bgm/detail/3970 | ライセンスに準拠（/creator/detail/140） | 不要 | 重ねてつなぐ |
| bgm_chest | 爽やかなアイリッシュ的なBGM | 鷹尾まさき | https://opentracks.com/bgm/detail/1836 | ライセンスに準拠（/creator/detail/62） | 不要 | 継ぎ目なく |
| bgm_ending | 闘いの夜明け | マニーラ | https://opentracks.com/bgm/detail/15859 | ライセンスに準拠（/creator/detail/422） | 不要 | 1回だけ |
| bgm_battle | Imaginary Mind | shimtone | https://opentracks.com/bgm/detail/22238 | ライセンスに準拠（/creator/detail/290）。曲のページに「クレジットは基本的に不要（してもらえると嬉しい）」 | 不要 | 重ねてつなぐ（1トラックだけでループの印が確かめられないので、安全な方） |

作曲者の利用条件のページは https://opentracks.com/creator/detail/<番号> 。

### サイトの規約で確かめた所（文の要点）
- 音源利用ライセンス（https://opentracks.com/help/articles/license/ ）: 「営利（商用）・非営利、個人・法人を問わず、あらゆる制作物」に背景音楽として使える。「有償・無償の製品・作品（ゲーム・DVD等）での利用」は利用例に入っている。「著作権表示・提供等の表示は不要」。加工（形式の変換・切り出しとループ加工・フェード）はできる。
- ゲーム・TRPGでの利用（https://opentracks.com/help/articles/game_trpg/ ）: 「ブラウザゲーム、オンラインゲーム」に使える。「ゲームの動作に必要なデータとして、音源をゲーム内に組み込むことができます」。条件は「利用者が通常の操作で音源ファイルだけを取り出して複製・保存できない形で組み込む」こと。「音源ファイルのダウンロード・書き出し機能を設けたり、そのままコピーして利用できる状態で配布」はできない。暗号化は推奨だが必須ではない。
- → **Web で配信して遊ぶ人の端末に届くこと自体は、ゲームのデータとしての組み込みなので許されている**。素材としての再配布（曲だけを配る・素材集にする）は禁止。
- 禁止（このゲームで守ること）: 曲だけを配る・ダウンロードや書き出しの機能・**ゲームの中の音楽鑑賞の機能（サウンドテスト・ジュークボックスなど）は作らない**・サウンドトラックとして配る・AI の学習に使う・Content ID 登録・大幅な改変・OpenTracks の音源の URL への直リンク。

### 組み込み方
- `scripts/audio/convert-bgm.mjs` で AAC（ADTS、ステレオ 44.1kHz、96kbps、ピーク −1dB）に変換して `src/assets/audio/bgm/<ID>.aac` に置いた（形式の変換と音量の調整だけ。曲の中身は変えていない）。
- ゲームは、コードの中だけで作った audio 要素で少しずつ読みながら流し（長い曲を全部メモリに持たないため）、Web Audio の音量・フェードを通す。画面に再生の部品は置かず、保存のボタン・ダウンロードの機能は無い。ファイル名もビルドのハッシュ付き。
- クレジットは不要（2人は任意）。入れる場合はスタッフロールや設定画面に「音楽: OpenTracks（作曲者名・曲名）」と書く案（提案）。
