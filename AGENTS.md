# AGENTS.md — このリポジトリで作業するAIエージェントへ

スマホ向けの協力ローグライトRPG「DESTINY OF CRYSTALIA」（React + TypeScript + Vite）。
オーナーは日本語で指示します。**返事・コメント・コミットメッセージは日本語**で書いてください。

## まず読むもの
1. `spec.md` … 仕様書（とくに §2 デザイン指針、§6 ジョブ・転職・お供、§8 世界マップ）
2. `docs/adding-content.md` … どこに何を書けば追加できるか
3. `docs/tasks/` … 今やる作業の指示書（例: `docs/tasks/J3c-top-jobs.md`）

## 作業の進め方（オーナーとの約束）
- 作業の前に、何をするかを**日本語でわかりやすく**説明して、オーナーの「OK」を待つ。
- 仕様にない判断をした時、指示どおりにできなかった時は、最後の報告で**理由と一緒に**伝える。
- 難易度は今のまま（難しめが良い）。勝手に簡単にしない。

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
npx vitest run         # テスト（全部通ること）
npx vite build         # ビルド
npm run dev            # 開発サーバー（ブラウザで http://localhost:5173/card-rpg/ ）
```
画面の自動確認（任意。Playwright が必要）: `npx vite build && npx vite preview --port 4173` を起こしてから
`node scripts/check-layout.mjs` / `node scripts/playthrough.mjs` / `node scripts/adventure.mjs` / `node scripts/jobchange.mjs` / `node scripts/pets.mjs`

## Git
- 作業ブランチ: `ccr-d64a1cfc-debli5`
- GitHub はオーナーのアカウントが審査中のため、**push しない**。コミットだけする。
- 区切りごとにコミット（メッセージは日本語。何を・なぜ）。
- 作業が終わったら、Claude に戻すためにバックアップを作る:
  `git bundle create ../card-rpg-from-codex.bundle --all`

## 今の進み具合
- 済: 戦闘・ダンジョン・世界マップ・シナリオ1・オンライン協力・UI刷新・転職の土台・基本8職・中位13職・スマート抽選・お供12種類・突発イベント11個
- 次: J3c 最上位13職（`docs/tasks/J3c-top-jobs.md`）→ J3d 特殊10職 → J4 Midjourney の指示文 → K1〜K7（カード・装備・敵・シナリオの量産、伝承の書、効果音、調整）
