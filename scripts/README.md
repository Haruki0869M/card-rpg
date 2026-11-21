# scripts の一覧（2026-11-10）

画面の確認は Playwright。先に `npx vite build && npx vite preview --port <番号> --host 127.0.0.1` を起こし、
`URL=http://127.0.0.1:<番号>/card-rpg/ node scripts/<名前>.mjs` で動かす。このパソコンでは
`node C:/dev/card-rpg-tools/heavy.mjs node scripts/<名前>.mjs` を通して1つずつ（`NODE_PATH`・`PLAYWRIGHT_BROWSERS_PATH` は docs/STATUS.md）。
共通の部品は `lib.mjs`。

## いつも使う確認（変えたら回す）
| スクリプト | 見る物 |
|---|---|
| `check-layout.mjs` | 8通りの画面の大きさで、はみ出し・12px 未満の文字・重なり |
| `playthrough.mjs` | 1〜4人の戦闘が勝ち・負けまで進む |
| `adventure.mjs` | 冒険（キャラ作成→世界マップ→最初のダンジョン→ボス→地上）。`ADVENTURE_SEED`・`ADVENTURE_PARTIES`・`ADVENTURE_OUTPUT`・`ADVENTURE_SCENARIO` |
| `jobchange.mjs` | 転職の流れ |
| `interaction-safety.mjs` | 新しい冒険・カードの対象・星読みの保存再開・共同施設・タップの詳細 |
| `battle-feedback.mjs` | お供・能力・戦闘の表示・設定の保存・4人のトークン |
| `movement-pet-colors.mjs` | 移動→到着→遭遇の順・お供の毛色の保存再開 |
| `final-special-jobs.mjs` | 特殊ジョブ後半5職・星読み・砲台と罠 |
| `pets.mjs` | お供と突発イベント |
| `stepb-battle.mjs` | 戦闘の画面（3つの幅） |
| `enemy-turn-timing.mjs` | 敵の番の間（0.1秒おき） |
| `status-button.mjs` | 世界マップのステータスボタンと P1〜P4 の印 |
| `world-steady-map.mjs` | 世界マップが歩く時にガックンと動かない（前から時々落ちる。何回中何回か見る） |
| `explore.mjs` | 見晴らしの塔・出現スポット |
| `mark-big-actions.mjs` | （道具）強敵・中ボス・ボスの「大技」（BREAK できる予告）の印 `big: true` を、決まりに当てはまる行動に付ける。`--check` で足りない印だけ出す |
| `volume-summary.mjs` | （道具）遊びの長さの測定（`volume.sim.test.ts` の .json）を、段階ごとの記録と同じ形の表にまとめる |
| `gameData.mjs` | （道具）確認スクリプトから、ゲームのデータ（転職のレベル・条件の数）をそのまま読む |
| `ops-save-resume.mjs` | 保存して再開（世界マップ・ダンジョン・戦闘・報酬。再開しても保存が同じ／同じ操作で同じ結果。360・390・480） |
| `ops-first15.mjs` | 運用テスト T1「最初の15分」。何も保存されていない端末で、最初の戦闘の勝利までのタップ数・読む文字数・用語・案内の段を数える（390×844・録画つき。結果は `screenshots/ops/first15/`） |
| `dice-shots.mjs` | 移動のサイコロ |
| `dungeon-view.mjs` | 扉を選ぶダンジョン（扉の絵とボタンが同じ並び・扉の予兆・周囲の警戒と先読み・中ボスの重い扉・封魔の宝箱（扉・封印を解く・番人）・休憩所の3択と技を磨く） |
| `break-combo.mjs` | 戦闘の表示（見直しの段階3）: 大技の印・BREAK の手がかりと結果・完全成功の状態異常の手がかり・連携の段階（360・390・480） |
| `dungeon-frames.mjs` | （旧）ダンジョンの歩く演出のチカチカ。見直しの段階2で歩く演出が無くなったので、今は「歩く演出なし」と出て通るだけ |
| `chest-show.mjs` | 宝箱の演出 |
| `scenario2-map-events.mjs` | シナリオ2だけの地図のイベント4種類（釣り小屋・番小屋・炉あと・灯籠）: 3つの画面で選択肢が届く・帆そりの +3・薪の束・武器なしの炉あと |
| `online.mjs`・`dungeon-coop.mjs`・`coop-talk.mjs` | オンライン協力（Firebase のエミュレーター `npm run emulators` が要る。本番には書かない） |
| `perf.mjs`・`world-perf.mjs` | 重さ（CPU を4倍遅くしたフレーム時間） |
| `load-size.mjs` | 最初の読み込みの量 |

## 賢いマルチプレイ検証 bot（`smart-online-coop.mjs`・中身は `smart-coop/`。計画 docs/tasks/smart-coop-bot-detail-plan.md）
2〜4台（P1 390×844・P2 390×540・P3 360×640・P4 412×860）で、全部画面のボタンを押して遊び、押す前にかぶさり・窓の潰れ・はみ出しを調べ、毎ステップ全端末の状態の印を比べる。
区切り 4 で足した物: `SMART_UNTIL=first-dungeon`（full の短い通し。最初の鍵のダンジョンを制覇して全端末が世界マップに戻ったら終える）・侵食度の上がり方の記録 `corruption.log`（上がった時の直前の操作と、直前12手に揺さぶり S10 があったか）・節目の保存 `checkpoints/*.json`（ホストの状態の写しを読むだけで取る。`SMART_CHECKPOINTS=0` で書かない）・4人の揺さぶり（S1 は P2 と P3 が交代・S13 は2台ずつ順に回す。報告に S13 の種類ごとの OK/NG）・`SMART_MODE=scenes`（場面から。`scenes.mjs`。`SCENE` = scourge・peddler・special・top・altar、`SCENE_FROM` = 節目の保存。新しい部屋を画面のボタンで作り、保存を差し込む所だけ確認用の入口 inject・resync を使い、すぐ書く入口を封じて、後は全部画面のボタン。書き換えた中身は報告の「書き換え:」の行）。
区切り 3-S で揺さぶり S1〜S13（`smart-coop/shake.mjs`。計画 §5・直し3）を足した。`SMART_MODE=full` では既定で全部入る（`SMART_SHAKE=none` で入れない）。順番は種と周期で決まる（同じ種なら同じ）。確かめが NG なら失敗「揺さぶりの確かめ NG」。報告の「揺さぶり」に機会・起きた回数・確かめの OK/NG、網羅の表に S1〜S13 と実機の不具合の確かめ6行が出る。`SMART_STOP_ON`（失敗の種類か字の正規表現）に当たる失敗を見つけたら、そこで終える（見逃しの証明で、壊した版に当てる時に使う）。
区切り 2-Sb で `SMART_MODE=full`（新しい冒険 → エンディングかゲームオーバーまで。ゲームオーバーなら新しい冒険で網羅の表の残りを続ける。`SMART_RESTARTS` = やり直しの上限・既定 2）を足した。頭は `brain/world`（網羅の表から行き先・道探し・遭遇）・`brain/town`（町・祠・神殿・転職・装備）、網羅の表は `coverage.mjs`（ゲームのデータから作る）。報告に網羅の表・回ごとの結果・転職の時期・終わりの侵食度が出る。
区切り 2-Sa（`SMART_MODE=first-dungeon` = 新しい冒険 → 最初の鍵のダンジョンをボスまで制覇して世界マップに戻るまで）。頭は `brain/battle`（予告を読む: BREAK・連携・回復・手数読み）・`brain/reward`（成長 → カード → 取り合い）・`brain/dungeon`（扉の種類・休憩・イベントの2段の合意・宝箱の開け役・漂流物の山・キャラの作業・制覇の後）・`brain/common`・`brain/world`（歩くだけ）・`brain/provisional`（残りの場面の仮の頭）。説明書き（カード・ジョブ・装備）は `content/`（始める前に vite で src を読む）。網羅の表・町・揺さぶりは後の区切り。
- 自己テスト（ゲームもエミュレーターも要らない）: `node scripts/smart-coop/selftest.mjs`（または `SMART_MODE=selftest node scripts/smart-online-coop.mjs`）
- 部屋の用意: ビルド → `npx vite preview --host 127.0.0.1 --port 4192 --strictPort` と `npm run emulators`（JDK 21。docs/STATUS.md）を起こし、
  `URL=http://127.0.0.1:4192/card-rpg/ PEOPLE=2 SEED=7 node C:/dev/card-rpg-tools/heavy.mjs node scripts/smart-online-coop.mjs`
  （`PEOPLE` 2 か 4・`SEED`・`SCENARIO`・`EMU_HOST`・`SMART_OUTPUT`・`SMART_MIN_FREE_GB` = 始める前のメモリの空きの目安・`SMART_MODE` = first-reward（既定）／first-dungeon／lobby／selftest・`SMART_LIMIT_MIN`・
  `SMART_SHAKE=sheet-wait` = 誘いの返事を待たせている間に P2 がパーティ・装備のシートを開いて×で閉じる・`SMART_INDUCE=cover` = わざと失敗させて証拠が残るかを見る）
- 同じ種で2回流したら `actions.log`（1行1手: 端末・画面・何を・どこを・結果）を `diff` で比べる（時刻・座標は actions.json だけ）。
- 結果: `screenshots/smart-coop/s<シナリオ>-<人数>p-<種>/report.md`（失敗ごとに全端末の写真・DOM・操作の記録）・`actions.log`・`actions.json`。報告に、着いた順・メモリの最大・1手の時間・取り直しの記録・種。失敗なしで着いた 0・それ以外 1。
- 守り: `?emu=` が手元（127.0.0.1・localhost）でなければ動かない。ブラウザは手元以外に届かない設定。`window.__online` を読むのは `judge.mjs` だけ（自己テストが字で確かめる）。

## その時の作業の確認（画面を変えた時に、関係する物だけ）
`boss-door`・`card-pick`・`companion-move-agree`・`detail-popup`・`help-guide`・`lorebook`・`sanctuaries`・`special-jobs`・`stepb-world`・`stepc`・`town-ux`・`turn-cutin`・`vibration-test`・`world-camera`・`world-move-stability`・`world-zoom`

## 撮影・絵の見比べ（確認の役目は無い）
`diorama-compare`・`diorama-shots`・`enemy-art`・`gemini-battle-shots`・`hero-art`・`pet-gallery`・`piece-art`・`shot-art`・`weapon-icons`・`make-icons`（PWA のアイコンを作る）

## フォルダ
- `gemini-verify/` … 録画（`rec.mjs`）とまとめ（`montage.mjs`）。運用テスト（docs/tasks/ops-test-plan.md）で使う。
- `art/` … 絵の加工（`build_art.py` = 背景の切り抜き・WebP 化）。
- `audio/` … 音の合成・変換。
- `archive/playtest/` … Gemini のテストプレイの記録（一回きり。今は使わない）。
