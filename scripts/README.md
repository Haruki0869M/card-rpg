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
| `ops-save-resume.mjs` | 保存して再開（世界マップ・ダンジョン・戦闘・報酬。再開しても保存が同じ／同じ操作で同じ結果。360・390・480） |
| `dice-shots.mjs` | 移動のサイコロ |
| `dungeon-view.mjs` | 扉を選ぶダンジョン |
| `dungeon-frames.mjs` | ダンジョンの歩く演出のチカチカ |
| `chest-show.mjs` | 宝箱の演出 |
| `online.mjs`・`dungeon-coop.mjs`・`coop-talk.mjs` | オンライン協力（Firebase のエミュレーター `npm run emulators` が要る。本番には書かない） |
| `perf.mjs`・`world-perf.mjs` | 重さ（CPU を4倍遅くしたフレーム時間） |
| `load-size.mjs` | 最初の読み込みの量 |

## その時の作業の確認（画面を変えた時に、関係する物だけ）
`boss-door`・`card-pick`・`companion-move-agree`・`detail-popup`・`help-guide`・`lorebook`・`sanctuaries`・`special-jobs`・`stepb-world`・`stepc`・`town-ux`・`turn-cutin`・`vibration-test`・`world-camera`・`world-move-stability`・`world-zoom`

## 撮影・絵の見比べ（確認の役目は無い）
`diorama-compare`・`diorama-shots`・`enemy-art`・`gemini-battle-shots`・`hero-art`・`pet-gallery`・`piece-art`・`shot-art`・`weapon-icons`・`make-icons`（PWA のアイコンを作る）

## フォルダ
- `gemini-verify/` … 録画（`rec.mjs`）とまとめ（`montage.mjs`）。運用テスト（docs/tasks/ops-test-plan.md）で使う。
- `art/` … 絵の加工（`build_art.py` = 背景の切り抜き・WebP 化）。
- `audio/` … 音の合成・変換。
- `archive/playtest/` … Gemini のテストプレイの記録（一回きり。今は使わない）。
