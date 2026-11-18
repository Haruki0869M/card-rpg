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
| `online.mjs`・`dungeon-coop.mjs`・`coop-talk.mjs` | オンライン協力（Firebase のエミュレーター `npm run emulators` が要る。本番には書かない） |
| `perf.mjs`・`world-perf.mjs` | 重さ（CPU を4倍遅くしたフレーム時間） |
| `load-size.mjs` | 最初の読み込みの量 |

## 賢いマルチプレイ検証 bot（`smart-online-coop.mjs`・中身は `smart-coop/`。計画 docs/tasks/smart-coop-bot-detail-plan.md）
2〜4台（P1 390×844・P2 390×540・P3 360×640・P4 412×860）で、全部画面のボタンを押して遊び、押す前にかぶさり・窓の潰れ・はみ出しを調べ、毎ステップ全端末の状態の印を比べる。
今は区切り 1-J（新しい冒険 → 世界マップを歩いて最初の鍵のダンジョン → 最初の戦闘 → 報酬を受け取り終えるまで。頭は `brain/common`・`brain/world`（歩くだけ）・`brain/provisional`（仮: まっすぐ進む＋先頭のカード））。本当の作戦・揺さぶり・網羅の表は後の区切り。
- 自己テスト（ゲームもエミュレーターも要らない）: `node scripts/smart-coop/selftest.mjs`（または `SMART_MODE=selftest node scripts/smart-online-coop.mjs`）
- 部屋の用意: ビルド → `npx vite preview --host 127.0.0.1 --port 4192 --strictPort` と `npm run emulators`（JDK 21。docs/STATUS.md）を起こし、
  `URL=http://127.0.0.1:4192/card-rpg/ PEOPLE=2 SEED=7 node C:/dev/card-rpg-tools/heavy.mjs node scripts/smart-online-coop.mjs`
  （`PEOPLE` 2 か 4・`SEED`・`SCENARIO`・`EMU_HOST`・`SMART_OUTPUT`・`SMART_MIN_FREE_GB` = 始める前のメモリの空きの目安・`SMART_MODE` = first-reward（既定）／lobby／selftest・`SMART_LIMIT_MIN`・
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
