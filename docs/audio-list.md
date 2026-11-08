# 音の指示書（audio-list）— K6 効果音・BGM

> **状態: 提案（オーナー未確認）。** 「提案」と書いた所は、まだ決まっていません。
> **鳴らす仕組みは K6① で入った**（`src/audio/`）。`src/assets/audio/sfx/`・`bgm/`・`pet/` に、この一覧の ID をファイル名にして置く（例: `sfx/sfx_ui_tap.mp3`）だけで鳴る。無い音は何もしない。お供の鳴き声は `pet/pet_okame.mp3` など §5 の名前（お供IDとの対応は `src/audio/cues.ts` の `PET_CRY`: cockatiel→pet_okame、wolfPup→pet_wolf、blackCat→pet_cat、turtle→pet_turtle、babyDragon→pet_dragon、rabbit→pet_rabbit、owl→pet_owl、foxCub→pet_fox、javaSparrow→pet_bunting、budgie→pet_budgie、longTailedTit→pet_nagae、redPanda→pet_redpanda）。
> 進め方: ① Claude がこの一覧と指示文を作る → ② オーナーが音のAIで作り `incoming/` に入れる → ③ Claude が変換・切り出し・組み込み。
> 仕組み（`src/audio/` など）の設計は別の計画（k6-sound-plan）にあり、この文書は「作る音の一覧と指示文」だけを扱います。

---

## 0. オーナーに決めてほしいこと（すべて提案の既定値つき）

| # | 質問 | 提案の既定値 |
|---|---|---|
| 1 | 商用（広告・課金）の予定はある？ | 未定。あるなら有料プランで作る |
| 2 | 予算: ElevenLabs / Suno を数か月だけ有料にしてまとめて作る？ | それでよい（作り終えたら解約） |
| 3 | お供の鳴き声は本物の録音寄り？ かわいいデフォルメ寄り？ | **デフォルメ寄り**（本物の録音は後から差し替え可） |
| 4 | BGMの初期設定はオン？ オフ？ | オン（音量は控えめ。設定で消せる） |
| 5 | シナリオ別BGMは最初は共通曲で代用でよい？ | 代用でよい |
| 6 | 掛け声ボイス（「えいっ！」など）は入れない？ | 入れない |
| 7 | オンラインで他人の操作の音は小さくする？ | 約−4dB 小さくする |
| 8 | 仮音（jsfxr）で仕組みを先に入れてよい？ | よい（本番の音ができたら差し替え） |

---

## 1. ファイルの決まり（提案）

### 1.1 名前
`<種類>_<分類>_<内容>.<拡張子>`、すべて小文字・英数字と `_` のみ。

- 効果音: `sfx_battle_slash.mp3`
- BGM: `bgm_world_day.mp3`
- ジングル（短い曲）: `jgl_victory.mp3`
- お供の鳴き声: `pet_okame.mp3`（お供IDに合わせる。下の §5）
- 種類の接頭辞: `sfx` / `bgm` / `jgl` / `pet`
- 同じ音の別案は `_v2` `_v3` を付ける（採用したものだけ番号なしの名前にする）。

### 1.2 形式（組み込み後）
| 種類 | 形式 | 仕上げ |
|---|---|---|
| 効果音 | mp3 モノラル 44.1kHz 128kbps | ピーク −3dB、頭と尻の無音を切る |
| 鳴き声 | mp3 モノラル | ピーク −3dB、1秒前後 |
| BGM | mp3 ステレオ 44.1kHz 160kbps | 約 −16LUFS、**ループ**できる長さ（§6.2） |
| ジングル | mp3 ステレオ | 約 −16LUFS、ループしない |

### 1.3 置き場所
| 場所 | 役目 |
|---|---|
| `incoming/audio/`（リポジトリ外、またはコミットしない） | オーナーが生成した元ファイル（wav / mp3）を入れる所。名前は上の決まりでなくてもよい（ID を添える） |
| `src/assets/audio/sfx/` `bgm/` `pet/` | Claude が変換・切り出して組み込む本番の場所 |
| `docs/audio-list.md`（この文書） | 状態欄（§9）を更新して進み具合を残す |

元ファイルは容量が大きいので Git に入れない（提案）。必要なら別途バックアップ。

### 1.4 一覧表の読み方
- **優先度**: ◎=最初の版に必須 / ○=あると良い / △=後回し可
- **ツール**: J=jsfxr / E=ElevenLabs / S=Suno
- **長さ**: 目安。効果音は短いほど良い。
- 指示文（英語）は §4 に、ID ごとにまとめてあります。

---

## 2. 音の一覧（効果音）

### 2.1 戦闘・攻撃（約14）
| ID | 場面 | 長さ | 雰囲気 | 優先 | ツール |
|---|---|---|---|---|---|
| sfx_battle_slash | 斬る系カード（剣・短剣・鎌） | 0.4s | 鋭い風切りと金属 | ◎ | E |
| sfx_battle_blunt | 打つ系（槌・拳・杖打ち） | 0.4s | 重い鈍い衝撃 | ◎ | E |
| sfx_battle_pierce | 突く系（槍・短剣突き） | 0.4s | 鋭く短い刺突 | ○ | E |
| sfx_battle_shoot | 射る系（弓） | 0.5s | 弦の鳴りと風切り | ○ | E |
| sfx_battle_gun | 銃（機工士） | 0.4s | 乾いた発砲、軽め | ○ | E |
| sfx_magic_fire | 火の魔法 | 0.8s | 燃え上がる、ごう | ◎ | E |
| sfx_magic_ice | 氷の魔法 | 0.8s | 結晶が凍る、きらん | ○ | E |
| sfx_magic_thunder | 雷の魔法 | 0.7s | 電撃のばりっ | ○ | E |
| sfx_magic_wind | 風の魔法 | 0.7s | 渦巻く風 | ○ | E |
| sfx_magic_light | 光の魔法 | 0.8s | 澄んだ輝き、神聖 | ○ | E |
| sfx_magic_dark | 闇の魔法 | 0.9s | 低くうねる不穏さ | ○ | E |
| sfx_battle_summon | 召喚 | 1.2s | 魔法陣が開き何かが現れる | ○ | E |
| sfx_battle_self | 自分に使う（構え・祈り） | 0.6s | 内側に力が集まる | ○ | E |
| sfx_battle_card_play | カードを出す共通音 | 0.25s | 紙が空を切る軽い音 | ◎ | J |

### 2.2 ダメージ・防御（約9）
| ID | 場面 | 長さ | 雰囲気 | 優先 | ツール |
|---|---|---|---|---|---|
| sfx_hit_small | 命中（小） | 0.25s | 軽い打撃 | ◎ | E |
| sfx_hit_mid | 命中（中） | 0.3s | 手応えのある打撃 | ◎ | E |
| sfx_hit_big | 命中（大） | 0.5s | 大きく響く衝撃 | ◎ | E |
| sfx_hurt_small | 被弾（小） | 0.3s | 痛いが軽い | ◎ | E |
| sfx_hurt_mid | 被弾（中） | 0.4s | ずしっと痛い | ◎ | E |
| sfx_hurt_big | 被弾（大） | 0.6s | 重く、画面が揺れる感じ | ◎ | E |
| sfx_guard_ok | ブロック成功 | 0.4s | 盾で弾く金属音 | ◎ | E |
| sfx_damage_zero | ダメージ0 | 0.3s | 空振り・カキン | ○ | J |
| sfx_enemy_down | 敵撃破 | 0.8s | 崩れて消える、すっきり | ◎ | E |

### 2.3 回復・状態（約8）
| ID | 場面 | 長さ | 雰囲気 | 優先 | ツール |
|---|---|---|---|---|---|
| sfx_status_heal | 回復 | 0.9s | やさしい上昇キラキラ | ◎ | E |
| sfx_status_block_gain | ブロック獲得 | 0.4s | 盾が張られる | ◎ | J |
| sfx_status_buff | 強化 | 0.6s | 力が湧く上昇音 | ○ | J |
| sfx_status_debuff | 弱体 | 0.6s | 力が抜ける下降音 | ○ | J |
| sfx_status_ailment | 状態異常（毒・麻痺など） | 0.6s | ぬめっと不快 | ○ | E |
| sfx_status_focus | フォーカス獲得 | 0.4s | 集中、ぴんと張る | ○ | J |
| sfx_status_mana | マナ獲得 | 0.4s | 水晶がきらり | ○ | J |
| sfx_status_cleanse | 状態異常が治る | 0.6s | 澄んだ浄化 | △ | J |

### 2.4 敵・ターン（約8）
| ID | 場面 | 長さ | 雰囲気 | 優先 | ツール |
|---|---|---|---|---|---|
| sfx_enemy_attack_start | 敵の攻撃開始（予備動作） | 0.5s | 威嚇、ぐっと迫る | ○ | E |
| sfx_boss_phase | ボス形態変化 | 2.0s | 咆哮と地鳴り、不穏 | ○ | E |
| sfx_turn_start | ターン開始 | 0.5s | 小さな鐘、切替 | ○ | J |
| sfx_turn_enemy | 敵のターンに移る | 0.5s | 低い短い警告 | △ | J |
| sfx_enemy_appear | 敵が現れる | 0.8s | 気配、がさっ | △ | E |
| sfx_battle_start | 戦闘開始 | 1.0s | 剣を抜く、始まりの合図 | ○ | E |
| (jgl_victory / jgl_defeat は §3 BGM・ジングル) | 勝利・敗北 | | | | |

### 2.5 スロット（約8）
| ID | 場面 | 長さ | 雰囲気 | 優先 | ツール |
|---|---|---|---|---|---|
| sfx_slot_spin | 回転開始〜回転中 | 0.8s ループ可 | カラカラ回る | ◎ | J |
| sfx_slot_stop | リール停止 | 0.15s | こつん、小気味よい | ◎ | J |
| sfx_slot_success | 成功 | 0.6s | ぴろりん、前向き | ◎ | J |
| sfx_slot_great | 完全成功（段階1） | 0.9s | 華やか | ◎ | E/J |
| sfx_slot_great2 | 完全成功（段階2） | 1.2s | さらに豪華 | ○ | E/J |
| sfx_slot_great3 | 完全成功（段階3） | 1.8s | 最高潮、ファンファーレ寄り | ○ | E |
| sfx_slot_fail | 失敗 | 0.6s | しょんぼり下降 | ◎ | J |
| sfx_slot_reach | リーチ（あと1つ） | 1.0s | どきどき高まる | ○ | J |

### 2.6 宝箱・報酬（約10）
| ID | 場面 | 長さ | 雰囲気 | 優先 | ツール |
|---|---|---|---|---|---|
| sfx_chest_shake | 宝箱が揺れる | 0.8s | がたがた | ○ | E |
| sfx_chest_glow1〜4 | 光が段階的に強まる（4音） | 各0.6s | 段ごとに音が高く豪華に | ○ | J/E |
| sfx_chest_reach | リーチ演出 | 1.2s | 期待が高まる | ○ | E |
| sfx_chest_legend | レジェンド確定 | 2.5s | 神々しい鐘とコーラス | ○ | E |
| sfx_card_flip | カードをめくる（通常） | 0.4s | ぱりっ | ○ | J |
| sfx_card_flip_rare | カードをめくる（レア） | 0.8s | きらめく | ○ | E/J |

### 2.7 画面操作（約15）
| ID | 場面 | 長さ | 雰囲気 | 優先 | ツール |
|---|---|---|---|---|---|
| sfx_ui_tap | タップ | 0.08s | 小さく軽い | ◎ | J |
| sfx_ui_ok | 決定 | 0.2s | 前向きな短い音 | ◎ | J |
| sfx_ui_cancel | キャンセル・戻る | 0.2s | 低めの短い音 | ◎ | J |
| sfx_ui_deny | 使えない | 0.25s | ぶっ、拒否 | ◎ | J |
| sfx_ui_card_select | カード選択 | 0.15s | ぱっ | ◎ | J |
| sfx_ui_detail | 詳細を開く | 0.2s | ふわっと広がる | ○ | J |
| sfx_ui_notice | お知らせ・通知 | 0.5s | ぽーん | ○ | J |
| sfx_ui_screen | 画面切替 | 0.3s | すっと | ○ | J |
| sfx_ui_classchange | 転職 | 2.0s | 光に包まれ生まれ変わる | ○ | E |
| sfx_ui_buy | 購入 | 0.4s | 会計、ちゃりん | ○ | J |
| sfx_ui_coin | お金を受け取る | 0.4s | コイン | ○ | J |
| sfx_ui_levelup | レベルアップ | 1.2s | 上昇アルペジオ | ○ | J/E |
| sfx_ui_equip | 装備する | 0.3s | かちゃっ | △ | J |
| sfx_ui_toggle | スイッチ切替 | 0.1s | かちっ | △ | J |
| sfx_ui_error | エラー・通信切れ | 0.4s | 低い2音 | △ | J |

### 2.8 世界マップ（約14）
| ID | 場面 | 長さ | 雰囲気 | 優先 | ツール |
|---|---|---|---|---|---|
| sfx_step_grass | 足音（草） | 0.25s | さくさく | ◎ | E |
| sfx_step_sand | 足音（砂） | 0.25s | ざくざく柔らかい | ○ | E |
| sfx_step_snow | 足音（雪） | 0.25s | きゅっきゅっ | ○ | E |
| sfx_step_stone | 足音（石） | 0.25s | こつこつ | ○ | E |
| sfx_world_arrive | マスに到着 | 0.3s | とん | ○ | J |
| sfx_world_dice | サイコロ | 1.0s | ころころ転がる | ◎ | E/J |
| sfx_world_camp | 野営 | 3.0s | 焚き火のぱちぱち | ○ | E |
| sfx_world_night | 夜になる | 1.5s | 静かな切替、虫の音 | △ | E |
| sfx_world_enter_town | 町に入る | 1.2s | にぎわいの入口 | ○ | E |
| sfx_world_enter_dungeon | ダンジョンに入る | 1.5s | 重い扉、反響 | ○ | E |
| sfx_world_fog_clear | 霧が晴れる | 1.2s | ふわっと開ける | △ | E |
| sfx_world_event | イベントマス | 0.6s | ?!という予感 | △ | J |
| sfx_world_shrine | 祠・神殿に着く | 1.5s | 厳か、鈴 | △ | E |
| sfx_world_rest | 休憩部屋 | 1.5s | ほっとする | △ | E |

### 2.9 お供（約15）
鳴き声12種は §5。ほかに:
| ID | 場面 | 長さ | 雰囲気 | 優先 | ツール |
|---|---|---|---|---|---|
| sfx_pet_cutin | お供の能力カットイン | 1.0s | ぴょん、きらり | ○ | J |
| sfx_pet_heart | 懐き度♡が上がる（ハート） | 0.8s | ほわっと温かい | ○ | J/E |
| sfx_pet_ribbon | リボン獲得（♡3） | 0.8s | しゅるっときらり | △ | J |

---

## 3. BGM・ジングル（約19）

### 3.1 一覧（場面別）
| ID | 場面 | 長さ（ループ） | 雰囲気・テンポ | 優先 |
|---|---|---|---|---|
| bgm_title | タイトル | 約90s | 壮大で少しもの悲しい冒険の始まり。BPM 80前後 | ◎ |
| bgm_town | 町 | 約90s | あたたかく賑やか、笛とリュート。BPM 100 | ◎ |
| bgm_world_day | 世界マップ（昼） | 約120s | のびやか、旅の高揚。BPM 105 | ◎ |
| bgm_world_night | 世界マップ（夜） | 約120s | 静か、月夜。BPM 70 | ○ |
| bgm_dungeon | ダンジョン（一人称） | 約120s | 不安、低いドローン、緊張。BPM 70 | ◎ |
| bgm_battle | 通常戦闘 | 約90s | 疾走感、弦とドラム。BPM 150 | ◎ |
| bgm_boss | ボス戦 | 約100s | 重厚、合唱、緊迫。BPM 140 | ◎ |
| bgm_camp | 休憩・野営 | 約90s | 焚き火のそばの安らぎ、アコースティック。BPM 70 | ○ |
| bgm_chest | 宝箱 | 約45s | わくわくの期待、控えめ。BPM 100 | △ |
| jgl_victory | 勝利 | 約6s | 晴れやかなファンファーレ | ◎ |
| jgl_defeat | 敗北 | 約8s | 静かな悲しみ、しかし重すぎない | ◎ |
| jgl_ending | エンディング | 約60s | 感動、旅の締めくくり | ○ |
| bgm_sc1〜sc7 | シナリオ別（7本） | 各約90s | シナリオの世界観に合わせる。**最初は共通曲で代用（提案）** | △ |

シナリオ別BGMの割り当ては、シナリオデータ（K4）には書かず、音の側の表（`src/audio/` に1か所）で決める案。シナリオごとの雰囲気は、シナリオ名が確定してから指示文を作る。

### 3.2 BGM共通のルール（提案）
- ボーカルなし（コーラス「ああ」は可）。歌詞付きは作らない（著作権・言語の面で面倒）。
- 同じ系統の楽器でそろえ、ゲーム全体のまとまりを出す: ファンタジー、生楽器寄りのオーケストラ＋ケルト風アコースティック。
- スマホのスピーカーで聞くので、低音を盛りすぎない。
- 戦闘中は効果音が目立つよう、中音域を空ける。

---

## 4. 指示文（1つずつ）

書き方: **英語プロンプト**（そのまま貼る）＋ **日本語の説明**。
- ElevenLabs（Sound Effects）: 文章で指示。長さ（duration）を指定できる。Loop が必要なら設定を使う。
- Suno: スタイル欄に英語のスタイル文、歌詞欄は `[Instrumental]`。
- jsfxr: 文章では指示できない → **プリセット名と調整の方針**を書く。出力は wav を書き出す。
- 指示文は例です。気に入らなければ数回作り直して選んでください（1音につき3〜5案を出して選ぶ案）。

### 4.1 戦闘・攻撃（ElevenLabs）
| ID | 英語プロンプト | 日本語の説明 |
|---|---|---|
| sfx_battle_slash | `A sharp sword slash, quick whoosh with a bright metallic ring, fantasy game, dry, no reverb, 0.4 seconds` | 剣で斬る鋭い音。残響なし |
| sfx_battle_blunt | `A heavy hammer blow, deep thud with a short impact crack, fantasy game, dry, 0.4 seconds` | 重い打撃 |
| sfx_battle_pierce | `A fast spear thrust, short whoosh followed by a sharp stab, fantasy game, dry, 0.4 seconds` | 突き |
| sfx_battle_shoot | `A wooden bow shot, string twang and arrow whistle, fantasy game, dry, 0.5 seconds` | 弓 |
| sfx_battle_gun | `A single flintlock pistol shot, crisp and light, steampunk fantasy game, short tail, 0.4 seconds` | 銃。軽めに、うるさくしない |
| sfx_magic_fire | `A fire spell cast, roaring flame burst with crackling, fantasy game, 0.8 seconds` | 火 |
| sfx_magic_ice | `An ice spell cast, glassy crystals forming and a sharp frozen crack, fantasy game, 0.8 seconds` | 氷 |
| sfx_magic_thunder | `A lightning spell, electric zap and sharp thunder crack, fantasy game, 0.7 seconds` | 雷 |
| sfx_magic_wind | `A wind spell, swirling gust with a rising whoosh, fantasy game, 0.7 seconds` | 風 |
| sfx_magic_light | `A holy light spell, bright shimmering chime with a soft choir swell, fantasy game, 0.8 seconds` | 光 |
| sfx_magic_dark | `A dark magic spell, low rumbling swell with a whispering distorted tone, fantasy game, 0.9 seconds` | 闇 |
| sfx_battle_summon | `A summoning circle opening, magical hum rising then a burst as a creature appears, fantasy game, 1.2 seconds` | 召喚 |
| sfx_battle_self | `A self buff, soft rising energy gathering inward with gentle sparkle, fantasy game, 0.6 seconds` | 自分に使う |
| sfx_battle_card_play | **jsfxr**: プリセット「Blip/Select」を元に、波形はノイズ寄り、立ち上がり速く、短く（0.2秒）。紙が空を切る軽さ | カードを出す |

### 4.2 ダメージ・防御
| ID | 英語プロンプト（E）／jsfxr方針 | 日本語の説明 |
|---|---|---|
| sfx_hit_small | `A light punch impact, short dry thump, fantasy game, 0.25 seconds` | 小さな命中 |
| sfx_hit_mid | `A solid weapon impact on armor, punchy thud with a slight metallic edge, 0.3 seconds` | 中 |
| sfx_hit_big | `A massive impact, deep boom with a crack and short rumble, fantasy game, 0.5 seconds` | 大 |
| sfx_hurt_small | `A small hit taken, short dull thump with a tiny pained whoosh, no voice, 0.3 seconds` | 被弾（小）。声は入れない |
| sfx_hurt_mid | `A heavy hit taken, thud with a body-slam feel and brief low rumble, no voice, 0.4 seconds` | 中 |
| sfx_hurt_big | `A devastating hit taken, deep impact boom with a ringing aftermath, no voice, 0.6 seconds` | 大 |
| sfx_guard_ok | `A shield block, loud metallic clang with a short ring, fantasy game, 0.4 seconds` | 盾で弾く |
| sfx_damage_zero | jsfxr「Hit/Hurt」を高い音程・短く・音量小で。「カキン」と弾かれる感じ | 0ダメージ |
| sfx_enemy_down | `A monster defeated, fading groan-free collapse with a magical dissolve shimmer, fantasy game, 0.8 seconds` | 撃破。うめき声なしで消える |

### 4.3 回復・状態
| ID | 英語プロンプト（E）／jsfxr方針 | 日本語の説明 |
|---|---|---|
| sfx_status_heal | `A gentle healing spell, warm rising sparkles with a soft chime, fantasy game, 0.9 seconds` | やさしい回復 |
| sfx_status_block_gain | jsfxr「Powerup」を低め・短く、金属質の矩形波。盾が張られる | |
| sfx_status_buff | jsfxr「Powerup」で音程が上昇、0.6秒 | 強化 |
| sfx_status_debuff | jsfxr「Powerup」を逆向き（下降）にして濁らせる、0.6秒 | 弱体 |
| sfx_status_ailment | `A poison or curse affliction, bubbling slimy swell with a low warble, fantasy game, 0.6 seconds` | 状態異常 |
| sfx_status_focus | jsfxr「Blip」で高めの1音、余韻短め | フォーカス |
| sfx_status_mana | jsfxr「Pickup/Coin」を澄んだ正弦波に、きらりと | マナ |
| sfx_status_cleanse | jsfxr「Powerup」を正弦波で上昇、澄んだ音、0.6秒 | 浄化 |

### 4.4 敵・ターン
| ID | 英語プロンプト（E）／jsfxr方針 | 日本語の説明 |
|---|---|---|
| sfx_enemy_attack_start | `A monster winding up an attack, low menacing growl-free swell with a tense whoosh, 0.5 seconds` | 威嚇。うなり声は入れない |
| sfx_boss_phase | `A boss transformation, huge roar-free rumble with a distorted rising drone and a deep boom, epic fantasy, 2 seconds` | ボス形態変化 |
| sfx_turn_start | jsfxr「Blip」で小さな鐘のような2音（高→低） | ターン開始 |
| sfx_turn_enemy | jsfxr 低い矩形波の短い1音、警告 | |
| sfx_enemy_appear | `Something rustling out of the bushes, quick leafy rustle and a low presence, 0.8 seconds` | 敵が現れる |
| sfx_battle_start | `A sword drawn from its scabbard with a bright metallic ring, heroic, 1 second` | 戦闘開始 |

### 4.5 スロット（jsfxr中心）
| ID | jsfxr方針 | 日本語の説明 |
|---|---|---|
| sfx_slot_spin | 矩形波の高速な連続クリック、ループ可能に末尾をつなぐ（0.8秒） | カラカラ |
| sfx_slot_stop | 「Hit/Hurt」を短く、中音で「こつん」、0.15秒 | リール停止 |
| sfx_slot_success | 「Pickup/Coin」を2音上昇 | 成功 |
| sfx_slot_great | 「Powerup」を3音上昇、きらびやか、0.9秒。または ElevenLabs: `A bright slot machine win jingle, short sparkling arpeggio, 0.9 seconds` | 完全成功1 |
| sfx_slot_great2 | 上の拡張版（音数を増やし、1.2秒）。`A bigger slot machine win, arpeggio with bells and a shimmer, 1.2 seconds` | 完全成功2 |
| sfx_slot_great3 | ElevenLabs: `A jackpot win fanfare, triumphant brass stabs with coins and bells, fantasy game, 1.8 seconds` | 完全成功3 |
| sfx_slot_fail | 「Hit/Hurt」を下降する2音、0.6秒 | 失敗 |
| sfx_slot_reach | 低い脈動が少しずつ速くなる音、0.8〜1.0秒 | リーチ |

### 4.6 宝箱・報酬
| ID | 英語プロンプト（E）／jsfxr方針 | 日本語の説明 |
|---|---|---|
| sfx_chest_shake | `A wooden treasure chest rattling and shaking, creaking with a faint magical hum, 0.8 seconds` | 揺れる |
| sfx_chest_glow1 | jsfxr 正弦波、ド、0.5秒 | 光1段（弱い） |
| sfx_chest_glow2 | 同上、ミに上げる＋少し長く | 光2段 |
| sfx_chest_glow3 | 同上、ソに上げる＋きらめきを足す | 光3段 |
| sfx_chest_glow4 | 同上、高いドで豪華に。または E: `A radiant magical glow swelling, bright shimmering rise, 0.8 seconds` | 光4段（最高） |
| sfx_chest_reach | `Tense magical anticipation, rising shimmer with a heartbeat pulse, 1.2 seconds` | リーチ |
| sfx_chest_legend | `A legendary reveal, majestic bell strike with a heavenly choir swell and sparkles, 2.5 seconds` | レジェンド確定 |
| sfx_card_flip | jsfxr ノイズ寄りで短い「ぱりっ」、0.3秒 | めくる |
| sfx_card_flip_rare | E: `A rare card reveal, crisp card flip followed by a magical chime, 0.8 seconds` | レア |

### 4.7 画面操作（jsfxr）
全部 jsfxr。音程は **すべて同じ音階（Cメジャー）** でそろえる（提案）と、聞き心地が統一される。
| ID | 方針 |
|---|---|
| sfx_ui_tap | 「Blip」正弦波、高め、0.08秒、とても小さく |
| sfx_ui_ok | 「Pickup」2音上昇（ド→ソ）、0.2秒 |
| sfx_ui_cancel | 「Blip」下降（ソ→ド）、0.2秒 |
| sfx_ui_deny | 低い矩形波、ぶっと短く、0.25秒 |
| sfx_ui_card_select | 「Blip」ミ、0.15秒、軽く |
| sfx_ui_detail | 正弦波で上昇スイープ、ふわっと、0.2秒 |
| sfx_ui_notice | 澄んだ正弦波の2音（ソ→高いド）、0.5秒 |
| sfx_ui_screen | ノイズ少し＋スイープ、すっと、0.3秒 |
| sfx_ui_classchange | E: `A magical rebirth, rising choir shimmer with a bright chime burst, fantasy game, 2 seconds` |
| sfx_ui_buy | 「Pickup/Coin」2連、0.4秒 |
| sfx_ui_coin | 「Pickup/Coin」1音、きらり、0.4秒 |
| sfx_ui_levelup | 4音の上昇アルペジオ、1.2秒（E でも可: `A cheerful level up jingle, rising four-note arpeggio, 1.2 seconds`） |
| sfx_ui_equip | 短い金属質の「かちゃ」、0.3秒 |
| sfx_ui_toggle | 極短い「かち」、0.1秒 |
| sfx_ui_error | 低い2音の下降、0.4秒 |

### 4.8 世界マップ（ElevenLabs）
| ID | 英語プロンプト | 日本語の説明 |
|---|---|---|
| sfx_step_grass | `A single footstep on grass, soft crunchy step, dry, 0.25 seconds` | 草 |
| sfx_step_sand | `A single footstep on sand, soft grainy step, 0.25 seconds` | 砂 |
| sfx_step_snow | `A single footstep on fresh snow, squeaky crunch, 0.25 seconds` | 雪 |
| sfx_step_stone | `A single footstep on a stone floor, hard tap with slight echo, 0.25 seconds` | 石 |
| sfx_world_arrive | jsfxr「Blip」低め、とん、0.3秒 | 到着 |
| sfx_world_dice | `A wooden die rolling and tumbling on a table, then settling, 1 second` | サイコロ |
| sfx_world_camp | `A crackling campfire in the night, gentle wood pops, loopable, 3 seconds` | 野営。ループ可 |
| sfx_world_night | `Evening transition, quiet crickets and a soft low wind, 1.5 seconds` | 夜 |
| sfx_world_enter_town | `Distant bustling medieval town, murmuring crowd and a soft bell, 1.2 seconds` | 町 |
| sfx_world_enter_dungeon | `A heavy stone door grinding open in a cavern with echo, 1.5 seconds` | ダンジョン |
| sfx_world_fog_clear | `Mist lifting, a soft airy whoosh with a gentle shimmer, 1.2 seconds` | 霧が晴れる |
| sfx_world_event | jsfxr 2音「ぴん、ぽん」疑問符のように上昇、0.6秒 | イベント |
| sfx_world_shrine | `A sacred shrine, small bell chimes with a soft airy tone, 1.5 seconds` | 祠・神殿 |
| sfx_world_rest | `A cozy resting place, gentle exhale-like warm tone with a faint wooden creak, 1.5 seconds` | 休憩部屋 |

### 4.9 お供（その他）
| ID | 方針 |
|---|---|
| sfx_pet_cutin | jsfxr 「Jump」＋きらり、1.0秒。ぴょんと跳ねる |
| sfx_pet_heart | E: `A warm heart sparkle, soft glowing chime with a gentle pop, cute, 0.8 seconds` |
| sfx_pet_ribbon | jsfxr 「Powerup」を正弦波で、リボンがほどける感じ、0.8秒 |

### 4.10 BGM（Suno）
スタイル欄に貼る英語プロンプト。歌詞欄は `[Instrumental]`。ループ用の編集方法は §6.2。
| ID | スタイル文（英語） | 日本語の説明 |
|---|---|---|
| bgm_title | `epic fantasy orchestral, melancholic yet hopeful, strings and French horn, slow build, 80 bpm, instrumental, cinematic adventure title theme` | 壮大で少しもの悲しい |
| bgm_town | `warm medieval folk, lute, flute and light percussion, cheerful and cozy, 100 bpm, instrumental, fantasy RPG town theme` | 町。あたたかく賑やか |
| bgm_world_day | `adventurous fantasy orchestral, acoustic guitar and flute, uplifting journey, 105 bpm, instrumental, RPG overworld theme` | 昼の旅 |
| bgm_world_night | `calm night ambient fantasy, soft piano and harp, moonlit, 70 bpm, instrumental, RPG overworld night theme` | 夜 |
| bgm_dungeon | `dark ambient dungeon, low drones, sparse echoing percussion, tense and eerie, 70 bpm, instrumental, fantasy RPG dungeon` | ダンジョン |
| bgm_battle | `fast-paced fantasy battle, driving strings and taiko-like drums, 150 bpm, instrumental, energetic RPG battle theme` | 戦闘 |
| bgm_boss | `epic boss battle, heavy orchestra with choir, brass hits, intense, 140 bpm, instrumental, fantasy RPG boss theme` | ボス |
| bgm_camp | `peaceful campfire acoustic, fingerstyle guitar and soft flute, relaxing, 70 bpm, instrumental, RPG rest theme` | 休憩 |
| bgm_chest | `playful anticipation, pizzicato strings and glockenspiel, light suspense, 100 bpm, instrumental, treasure theme` | 宝箱 |
| jgl_victory | `short triumphant fanfare, brass and strings, 6 seconds, instrumental, RPG victory jingle` | 勝利（Suno は長く作りがちなので冒頭を切る） |
| jgl_defeat | `short sorrowful piano and strings, slow, 8 seconds, instrumental, RPG game over jingle` | 敗北 |
| jgl_ending | `emotional fantasy orchestral ending, gentle piano then full strings, hopeful resolution, instrumental, RPG ending theme` | エンディング |

---

## 5. お供の鳴き声12種（提案: かわいくデフォルメ）

方針（提案）:
- 本物そっくりではなく、**小さな画面の絵に合う、かわいくデフォルメした音**にする。短く（0.5〜1.0秒）、耳に刺さらない高さに抑える。
- 「普通の鳴き声」を基本にして、**うれしい時（♡が上がる時）は同じ声を少し高く・弾ませた版**も作ると愛着が出る（これは任意・△）。
- 声は **人の声に聞こえない** こと（言葉に聞こえるとゲームの雰囲気を崩す）。
- 本物の録音（CC0 など）を使う場合は §8 を確認。
- ファイル名はお供IDに合わせる（`src/content/common/pets/pets.ts` の id を作成時に確認し、下の仮名を直す。この文書では pets.ts は触らない）。

| ID（仮） | お供 | 長さ | 英語プロンプト（ElevenLabs） | 日本語の説明 |
|---|---|---|---|---|
| pet_okame | オカメインコ | 0.8s | `A cute cockatiel chirp, a soft rising two-note whistle "pee-yo", cheerful and gentle, 0.8 seconds` | 「ぴーよ」とやさしく上がる口笛。**いちばん大切に**。数案作って選ぶ |
| pet_wolf | 子狼 | 0.8s | `A tiny wolf pup whimper-howl, short cute high squeaky "awoo", 0.8 seconds` | ちいさな「あうー」 |
| pet_cat | 黒猫 | 0.6s | `A small cat meow, soft and cute, short "mew", 0.6 seconds` | やわらかい「にゃ」 |
| pet_turtle | 子亀 | 0.5s | `A tiny cartoon turtle squeak, soft rubbery "pip", 0.5 seconds` | 実際は鳴かないのでデフォルメの「ぴっ」 |
| pet_dragon | 小竜 | 0.8s | `A baby dragon cry, cute squeaky chirp with a tiny rasp, fantasy, 0.8 seconds` | かわいい「きゅあ」 |
| pet_rabbit | うさぎ | 0.5s | `A soft cute rabbit squeak and tiny nose-snuffle, 0.5 seconds` | 小さな「ぷぅ」 |
| pet_owl | フクロウ | 0.9s | `A soft cute owl hoot, gentle two-note "hoo-hoo", warm, 0.9 seconds` | やさしい「ほーほー」 |
| pet_fox | 子狐 | 0.7s | `A baby fox yip, cute high-pitched short "kon", 0.7 seconds` | 「こん」と短く |
| pet_bunting | 文鳥 | 0.7s | `A cute Java sparrow chirp, soft bell-like tweet, gentle, 0.7 seconds` | 鈴のような「ちゅる」。オカメインコと**聞き分けられる**ように、高く短く |
| pet_budgie | セキセイインコ | 0.8s | `A cheerful budgerigar chatter, quick bubbly chirps, but no human words, 0.8 seconds` | にぎやかな「ぴぴぴ」。言葉にしない |
| pet_nagae | シマエナガ | 0.6s | `A tiny fluffy bird tweet, very soft and high "chi-chi", cute, 0.6 seconds` | 小さく「ちっちっ」。いちばん小さな声 |
| pet_redpanda | レッサーパンダ | 0.7s | `A cute red panda chirp, soft squeaky whistle-like call, 0.7 seconds` | 「ぴゅい」と口笛風 |

注意: 文鳥とオカメインコは絵も同じ🐦で見分けにくいので、**音で区別**できるようにする。

---

## 6. BGMの作り方（提案）

### 6.1 場面の切り替え
- 世界マップは昼と夜で曲を切り替える（クロスフェード1〜2秒）。
- 戦闘に入る時は前の曲を止めて戦闘曲。終わったらジングル → 元の曲（頭から）。
- 町・ダンジョン・休憩・宝箱は場面に入った時に切り替える。
- 画面が裏に回ったら止め、戻ったら再開。

### 6.2 ループの作り方
Suno は継ぎ目のないループが苦手。次のどれかで作る（Claude が編集）:
1. 曲の途中から「1周分」を切り出し、頭と尻を数十ミリ秒クロスフェードでつなぐ。
2. 曲の終わりを意図的にフェードさせ、頭に戻す形（簡易）。
3. 生成時に「intro ＋ ループ部」の構成で作り、ループ部だけを繰り返す（ファイルを2つに分ける）。
最初は 1 で試す。

---

## 7. 最初に作る10音の試し（提案）

目的: 各ツールの品質・手間・ファイル加工の流れを確かめ、全体の方向を決める。ライセンスが固まる前の試作なので、**製品には入れず仮音扱い**にする。

| 順 | ID | ツール | 確かめたいこと |
|---|---|---|---|
| 1 | sfx_ui_tap | jsfxr | 取り出しの手順、音量の基準 |
| 2 | sfx_battle_card_play | jsfxr | 戦闘で鳴らして違和感がないか |
| 3 | sfx_battle_slash | ElevenLabs | 効果音AIの品質、長さの指定が効くか |
| 4 | sfx_magic_fire | ElevenLabs | 魔法系の雰囲気 |
| 5 | sfx_hurt_mid | ElevenLabs | 声なしで痛みが伝わるか |
| 6 | sfx_status_heal | ElevenLabs | やさしい音が作れるか |
| 7 | sfx_slot_stop | jsfxr | 小気味よさ（連続して鳴る） |
| 8 | sfx_slot_great | jsfxr か ElevenLabs | 完全成功の盛り上がり。2案比較 |
| 9 | sfx_step_grass | ElevenLabs | 足音のリズム（連続で自然か） |
| 10 | pet_okame | ElevenLabs | かわいさ。数案作って選ぶ |

おまけ（任意）: BGM1曲目として `bgm_world_day` を Suno で3案。ループ編集（§6.2 の1）まで試す。

試しのあとにオーナーが決めること: ElevenLabs / Suno を有料にするか、jsfxr 中心でいくか。

---

## 8. ライセンスの確認項目（提案）

規約は変わります。**契約した時点の規約を画面保存（PDF/スクリーンショット）して `docs/licenses/` に残す**案。確認する項目:

### 8.1 共通
- [ ] ゲームを無料で公開する場合でも、広告・課金があると「商用」扱いになりうる。商用の予定をはっきりさせる（§0-1）
- [ ] 生成した日付時点のプラン（無料／有料）を記録する。**無料プランで作った音は商用不可・表記必須のことが多い。** 有料にした後で、無料中に作った分が商用になるとは限らない（多くは「作った時点の規約」）
- [ ] 表記（クレジット）が必要か。必要ならタイトル画面・設定画面のどこに書くか
- [ ] AI生成の音は、国によって著作権が認められないことがある → 他者の無断利用を防げない可能性があることを了解する
- [ ] 他人の曲・声に似すぎていないか（既存の曲に酷似した場合のトラブルを避けるため、BGMは聞いて確かめる）

### 8.2 ツール別
| ツール | 確認すること |
|---|---|
| ElevenLabs | 商用利用が許されるプランの範囲、生成物の権利帰属、解約後の扱い |
| Suno | 商用利用が許されるプラン、**生成した時点のプランで決まる**ので有料にしてから作る。解約後の扱い |
| jsfxr | 出力した音の扱い（自由に使える扱いのことが多い）。念のため配布元の記載を保存 |
| 本物の録音（freesound など） | 1ファイルごとにライセンス（CC0 / CC-BY など）。CC-BY は表記必須。CC-NC（非営利のみ）は使わない |

### 8.3 記録の取り方（提案）
`docs/audio-list.md` の状態表（§9）に **ツール名・作った日・プラン名** を書く。クレジットが必要になった時に一覧を作れるようにするため。

---

## 9. 進み具合（状態表）

作った音から順に更新する。状態: 未 / 作成済み（incoming） / 組み込み済み / 差し替え待ち（仮音）

| ID | ツール | 作った日 | プラン | 状態 | メモ |
|---|---|---|---|---|---|
| （最初は空。§7 の10音から埋める） | | | | | |

---

## 10. 音の数のまとめ（提案）

| 分類 | 数 |
|---|---|
| 戦闘・攻撃 | 14 |
| ダメージ・防御 | 9 |
| 回復・状態 | 8 |
| 敵・ターン | 6（+ ジングル） |
| スロット | 8 |
| 宝箱・報酬 | 10 |
| 画面操作 | 15 |
| 世界マップ | 14 |
| お供 | 12（鳴き声）+ 3 |
| BGM・ジングル | 12 + シナリオ別7（後回し） |
| **合計** | **効果音 約100、BGM 約19** |

仕組み側（`src/audio/`、設定の4つの音量、演出との結び付け）は別の計画に従い、K1〜K4 の後に入れる案。音ファイル作りは仕組みと並行できる。
