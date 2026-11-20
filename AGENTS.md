# AGENTS.md — このリポジトリで作業するAIエージェントへ

スマホ向けの協力ローグライトRPG「DESTINY OF CRYSTALIA」（React + TypeScript + Vite）。
オーナーは日本語で指示します。**返事・コメント・コミットメッセージは日本語**で書いてください。

## まず読むもの（この順で）
0. **`docs/CHARTER.md` … マスター設計憲章（オーナーが 2026-11-11 に決めた絶対の基準）。ほかの文書と食い違う時は憲章が勝つ。計画と報告の前に §4 のチェック表を確かめる**
1. **`docs/HANDOFF.md` … 引き継ぎ書。残りの作業・品質の目安・つまずきやすい所。最初に全部読む**
2. `spec.md` … 仕様書（とくに §2 デザイン指針、§6 ジョブ・転職・お供、§8 世界マップ）
3. `docs/design-v2.md` … 量の目標・転職・お供・突発イベントの決定事項
4. `docs/adding-content.md` … どこに何を書けば追加できるか
5. `docs/STATUS.md` … 今の進み具合と決定事項（先頭の節が最新）
6. `docs/tasks/` … 今やる作業の指示書・計画（済んだ物は `docs/archive/tasks/` に移してある）

## 作業の進め方（オーナーとの約束）
- 作業の前に、何をするかを**日本語でわかりやすく**説明して、オーナーの「OK」を待つ。
- 仕様にない判断をした時、指示どおりにできなかった時は、最後の報告で**理由と一緒に**伝える。
- 難易度は今のまま（難しめが良い）。勝手に簡単にしない。
- **水増しをしない**（行や戦闘を増やして時間を合わせる・名前や数字だけ違う物を増やす・直行 bot が勝てるように敵を弱める）。目標の数字を水増しでしか満たせない時は、作らずに止まってオーナーに相談する（`docs/CHARTER.md`）。

## 守るルール
- **データ駆動**: カード・ジョブ・敵・アイテム・イベントは `src/content/` にファイルを置くだけで自動で登録される（`import.meta.glob`）。登録表に手で書き足さない。
- **ジョブIDや能力名で分岐するコードを書かない。** 能力は「きっかけ（when）＋条件（if）＋効果（do）」か常時型（modifier）のデータで書く。
  - 新しい条件 → `src/engine/abilities/conditions/` に1ファイル
  - 新しい効果 → `src/engine/battle/effects/kinds/` に1ファイル
  - 新しいイベントの結果 → `src/engine/game/outcomes/kinds/` に1ファイル
- **エンジンは純粋関数**（`applyGameCommand` / `applyCommand`）。乱数は種から作る `Rng` だけを使う（`Math.random` 禁止）。オンライン協力で全員の結果が同じになるため。
- エピック以上のカード・装備は必ず特殊能力（`trait` / `ability`）を持つ（テストで確かめている）。
- 画面の文字は12px以上。スマホ縦画面（幅360〜480px）で崩れないこと。
- 数値の調整は `src/data/balance.ts` に集める。

## 確認のコマンド（変えたら必ず全部通す）
```
npm install            # 最初の1回
npx tsc --noEmit       # 型チェック
npx vitest run         # テスト（全部通ること。2026-11-10 時点で 924件成功・6件スキップ）
npx vite build         # ビルド
npm run dev            # 開発サーバー（ブラウザで http://localhost:5173/card-rpg/ ）
```
- このパソコンでは、重い確認（vitest の全体・ビルド・Playwright の画面の確認）は `node C:/dev/card-rpg-tools/heavy.mjs <コマンド>` を通して順番に動かす（同時に動かす数はオーナーの指示に従う）。
- 画面の自動確認（Playwright）: `npx vite build && npx vite preview --port <自分の番号>` を起こしてから `URL=http://127.0.0.1:<番号>/card-rpg/ node scripts/<名前>.mjs`。どのスクリプトが何を見るかは `scripts/README.md` と `docs/HANDOFF.md` §4。
- オンラインの確認（`online.mjs` など）は Firebase のエミュレーター（`npm run emulators`。Java 21 以上が要る）で。本番の Firebase には書かない。

## Git
- 作業ブランチ: `ccr-d64a1cfc-debli5`
- GitHub はオーナーのアカウントが審査中のため、**push しない**。コミットだけする。
- 区切りごとにコミット（メッセージは日本語。何を・なぜ）。
- 作業が終わったら、Claude に戻すためにバックアップを作る:
  `git bundle create ../card-rpg-from-codex.bundle --all`

## 今の進み具合（2026-11-10）
- 済: ジョブ44（基本8・中位13・最上位13・特殊10）・カード・装備・敵の量産・シナリオ7本・伝承の書・効果音とBGM・突発イベント20個・オンライン協力・扉を選ぶダンジョンと移動のサイコロ・見晴らしの塔と出現スポット（保存 v17）・箱庭の世界マップ（シナリオ1）・戦闘の見た目の改修。公開は Firebase Hosting で10回。
- 次・残り: 運用テスト（いまはシナリオ1まで）・シナリオ2〜7の箱庭の絵・侵食度・経験値・転職の提案の値の最終決定（オーナーが遊んでから）。
- 細かい最新の状態は `docs/STATUS.md` の先頭の節と `docs/HANDOFF.md` §3 を見る。
