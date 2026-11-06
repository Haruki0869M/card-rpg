# card-rpg

『For The King』のスロット判定 × 『Slay the Spire』のデッキ構築を掛け合わせた、協力ローグライトRPGのプロトタイプです（現在 M2: タイトル〜キャラクター作成・ダンジョン・装備・成長・宝箱の演出まで）。
Androidスマホのブラウザ（縦画面・タップ操作）を第一に想定しています。仕様は [spec.md](./spec.md) を参照してください。

- 公開URL（GitHub Pages）: https://haruki0869m.github.io/card-rpg/

## 遊び方
- **流れ**: タイトル →「新しい冒険」→ 冒険の準備（シナリオ・難易度・人数1〜4）→ キャラクター作成（職業・性別・名前）→ 冒険の拠点 → ダンジョン
- **拠点（仮）**: 行き先のダンジョンを選ぶ。戻ると全員が全回復する（M3で世界マップに置き換え予定）
- **ダンジョン**: 光っている部屋をタップすると中身（敵のLv・宝箱の格など）が見えるので、「この部屋へ進む」で入る。いつでも撤退できるが、そのダンジョンで最後に手に入れた宝を1つ失う
- **宝箱**: 箱の見た目（木箱・鉄箱・装飾箱・黄金箱）ごとに、中身の格（コモン〜レジェンド）の**確率**が決まっていて、開ける前に帯グラフで見える。運のスロット（3枠）の成功数だけ確率が上の格へずれ、格はその後に1回だけ抽選される。結果は「揺れ → 光の色が段階的に上がる → リーチ（エピック以上） → 伝説（レジェンド）」の演出で見せる（タップで飛ばせる。光や予告は本当の格のときだけ出る）。鍵付きは先に器用で判定（0成功は罠）
- **特殊能力**: エピック以上の武器・防具・装飾品・カードは、必ず特殊能力を持つ（例: 竜鱗の鎧「竜の血」＝ターン開始時にHP3回復、鎧砕き「貫通」＝ブロックを無視）
- **成長**: 戦闘に勝つと経験値・ゴールド・カード報酬（3枚から1枚。裏向きで並び、1枚ずつめくれる。カードの格の確率は画面に表示）。レベルアップで成長ボーナスを1つ選ぶ。武器を装備すると専用カードが山札に加わる
- カードを**タップ**で選択 → 敵をタップで対象を選ぶ（生存している敵が1体なら自動）→ 🌟でフォーカスを注入 → **発動**（同じカードをもう一度タップでも可）
- 何もない場所をタップ / ✕ / Androidの「戻る」でキャンセル（マナ・フォーカスは消費されません）
- カード・敵・インテント・状態異常・味方を**長押し**すると詳細を表示
- 味方の枠をタップで操作キャラを切り替え
- ☰メニュー: 高速モード、振動、戦闘ログ、冒険をやめてタイトルへ（冒険は自動で保存されます）
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
  content/     ゲームの中身（ファイルを置くだけで自動で登場する）
    common/    どのシナリオでも使うもの: classes/ cards/ items/ enemies/ statuses/ weaponTypes/ difficulties/ roomTypes/ encounters/
    scenarios/<シナリオID>/  scenario.ts（説明・開始条件）と、そのシナリオ専用の enemies/ dungeons/ events/
  data/        登録表（src/content を自動で読み込む）・balance.ts（全体の数値）・terms.ts（用語）・theme.ts（色）・contentVersion.ts
  types/       型定義
  engine/      ロジック（Reactに依存しない純粋関数）
    battle/    戦闘の流れ。effects/kinds/ = 効果の部品（1種類1ファイル）、ai/ = 敵の行動の決め方、statuses.ts = 状態異常
    abilities/ 特殊能力（きっかけ＋条件＋効果）。conditions/ = 条件の部品
    game/      冒険（applyGameCommand）。outcomes/kinds/ = イベントの結果の部品、rooms/behaviors/ = 部屋の動き、growth/kinds/ = 成長ボーナス、migrations.ts = 保存データの引き継ぎ
  art/         SVGの絵（enemies/・backgrounds/ はファイルを置くだけで登録）。起動時に画像化して軽く表示
  store/       Zustand ストア（エンジンを呼ぶだけ + 保存 + 敵フェーズのタイマー）
  components/  画面部品（screens/ が各画面、battle/ が戦闘画面、DataCatalog.tsx がデータ一覧）
docs/          追加・変更の手順書（adding-content.md）・絵柄の基準
scripts/       アイコン生成・アート一覧の撮影・レイアウト確認・自動プレイ・性能計測（Playwright）
```

- **職業・敵・カード・装備・状態異常・シナリオなどの足し方・変え方は [docs/adding-content.md](./docs/adding-content.md) にまとめています。** 足したら `npm test` で、参照切れや書き間違いを自動で検査できます。
- 数値の一覧: URL の末尾に `#data` を付けると、全職業・全敵・カード・装備・状態異常・ルールを表で見比べられます（バランス調整用）。
### 画面の確認スクリプト（任意）

```bash
npm run build && npx vite preview --port 4173 &
node scripts/check-layout.mjs   # 幅360/412pxでのはみ出し・44px未満のボタン・12px未満の文字を検出
node scripts/playthrough.mjs    # 1〜4人それぞれで戦闘の勝利・敗北まで自動プレイ
node scripts/adventure.mjs      # キャラ作成からダンジョン制覇・拠点への帰還まで自動プレイ
node scripts/perf.mjs           # CPUを4倍遅くした状態でのフレームレート計測
node scripts/chest-show.mjs     # 宝箱の演出を格ごとに録画（screenshots/chest/ に mp4 とコマ割り画像。ffmpeg と ImageMagick が必要）
```

## GitHub Pages での公開

`main` ブランチが更新されると、GitHub Actions（`.github/workflows/deploy.yml`）が自動でビルドして公開します。
初回だけ、GitHub のリポジトリ画面で **Settings → Pages → Build and deployment → Source** を「**GitHub Actions**」にしてください。
