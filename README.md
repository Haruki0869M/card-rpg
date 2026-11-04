# card-rpg

『For The King』のスロット判定 × 『Slay the Spire』のデッキ構築を掛け合わせた、協力ローグライトRPGのプロトタイプ（コア戦闘のMVP）です。
Androidスマホのブラウザ（縦画面・タップ操作）を第一に想定しています。仕様は [spec.md](./spec.md) を参照してください。

- 公開URL（GitHub Pages）: https://haruki0869m.github.io/card-rpg/

## 遊び方
- ☰メニュー →「テスト戦闘の設定」で、パーティ（1〜4人・職業・性別）と敵の組み合わせを選べます（タイトル〜キャラクター作成は M2 で追加予定）
- カードを**タップ**で選択 → 敵をタップで対象を選ぶ（生存している敵が1体なら自動）→ 🌟でフォーカスを注入 → **発動**（同じカードをもう一度タップでも可）
- 何もない場所をタップ / ✕ / Androidの「戻る」でキャンセル（マナ・フォーカスは消費されません）
- カード・敵・インテント・状態異常・味方を**長押し**すると詳細を表示
- 味方の枠をタップで操作キャラを切り替え
- ☰メニュー: テスト戦闘の設定、高速モード、振動、シード表示・同じシードで再戦、戦闘ログ、バトルリセット
- アートの一覧: URL の末尾に `#art` を付けると、職業・敵・背景の絵を一覧できます

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm test           # Vitest（戦闘ロジックの単体テスト）
npm run typecheck  # tsc --noEmit
npm run build      # 型チェック + 本番ビルド（dist/）
```

### ディレクトリ構成

```
src/
  types/       型定義（職業・カード・敵・状態・コマンド）
  data/        データ（balance.ts に調整用の数値を集約）
    classes/   職業（1職業 = 1ファイル。index.ts の登録表に並べるだけで登場）
    enemies/   敵と遭遇の組み合わせ（同上）
    cards/     カード
  engine/      ロジック（Reactに依存しない純粋関数。applyCommand(state, command)）
    battle/    戦闘   abilities/  職業の特殊能力   stats.ts  能力値
  art/         SVGの絵（味方は共通の部品＋職業ごとの見た目、敵は1体ずつ）。起動時に画像化して軽く表示
  store/       Zustand ストア（エンジンを呼ぶだけ + 保存 + 敵フェーズのタイマー）
  components/  画面部品（battle/ が戦闘画面）
  hooks/       長押し・戻るボタン・要素の大きさ
scripts/       アイコン生成・アート一覧の撮影・レイアウト確認・自動プレイ・性能計測（Playwright）
docs/art/      絵柄の基準（試作）
```

- 職業や敵を増やすときは、データのファイルを足して登録表に1行追加するだけです。絵が無い場合は仮の絵が自動で使われます（絵は `src/art` に追加）。
- 乱数はシード付き（mulberry32）で、`Math.random()` は使っていません。
- プレイヤーの操作は `{ type: 'PLAY_CARD', playerId, characterId, cardInstanceId, targetId, focusUsed }` のようなシリアライズ可能なコマンドです。
- 戦闘の途中状態は `localStorage` に保存され、開き直すと続きから遊べます。

### 画面の確認スクリプト（任意）

```bash
npm run build && npx vite preview --port 4173 &
node scripts/check-layout.mjs   # 幅360/412pxでのはみ出し・44px未満のボタン・12px未満の文字を検出
node scripts/playthrough.mjs    # 1〜4人それぞれで勝利・敗北まで自動プレイ
node scripts/perf.mjs           # CPUを4倍遅くした状態でのフレームレート計測
```

## GitHub Pages での公開

`main` ブランチが更新されると、GitHub Actions（`.github/workflows/deploy.yml`）が自動でビルドして公開します。
初回だけ、GitHub のリポジトリ画面で **Settings → Pages → Build and deployment → Source** を「**GitHub Actions**」にしてください。
