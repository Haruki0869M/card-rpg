# プログラム全体の点検と最適化（2026-11-10・Claude・optimize のセッション）

ブランチ: `claude/optimize-2ccd47`（本体 63ca024 から）。
**この文書は点検の結果と計画。オーナーの OK の前は、コードを変えていない。**
「提案」と書いた所は、指示に無く Claude が決めた所。

決まり: ゲームの数値・難しさ・乱数の順番・保存データ（v17）の形は変えない。動きが変わる最適化はしない。迷ったら残して報告。
変えない物: `vite.config.ts` の `base`・`src/net/firebaseConfig.ts`・`package-lock.json`・`firebase.json` の `database`。

---

## A. 使っていないコード（消す）

調べ方: すべての `export` について、ほかのファイル（テストを除く）から使われているかを数え、同じファイルの中でも1回しか出てこない（＝定義だけ）物を「使っていない」とした。型チェックの `noUnusedLocals` はもともと有効なので、ファイルの中だけの使い残しは無い。

| # | 何 | どこ | どうする | 理由 |
|---|---|---|---|---|
| A1 | `hasEnemyArt`・`hasBackground` | `src/art/index.tsx` | 消す | どこからも呼ばれていない |
| A2 | `mirror` | `src/art/kit.tsx` | 消す | 同上 |
| A3 | `RarityAura`・`CardTitle` | `src/components/ui/CardFace.tsx` | 消す（ファイルの中で使われていない部分だけ） | 同上（カードの見た目は CardBody に移っている） |
| A4 | `useFreshRoll`・`SpinRollStrip` | `src/components/ui/CheckPanel.tsx` | 消す | 同上（サイコロに変えた時に使わなくなった） |
| A5 | `itemDef` | `src/components/ui/game.tsx` | 消す | 同上 |
| A6 | `darken`・`roadPath` | `src/components/world/diorama.ts` | 消す | 同上 |
| A7 | `propOf`・`TerrainProp`（と、それだけが使う表） | `src/components/world/MapMiniatures.tsx` | 消す | 同上（箱庭の絵に変わった） |
| A8 | `difficultyName` | `src/components/screens/OnlineScreens.tsx` | 消す | 同上 |
| A9 | `PLAYER_LABEL` | `src/data/terms.ts` | 消す | 同上 |
| A10 | `activePassiveNames` | `src/engine/abilities/index.ts` | 消す | 同上 |
| A11 | `needsEnemyTarget` | `src/engine/battle/battle.ts` | 消す | 同上 |
| A12 | `effectKinds` | `src/engine/battle/effects/index.ts` | 消す | 同上 |
| A13 | `livingEnemies` | `src/engine/battle/intents.ts` | 消す | 同上 |
| A14 | `itemTags` | `src/engine/game/cardTags.ts` | 消す | 同上 |
| A15 | `raiseRarity` | `src/engine/game/dungeon.ts` | 消す | 同上 |
| A16 | `FACING_NAME`・`doorAhead` | `src/engine/game/dungeonMap.ts` | 消す | 同上（一人称の歩きの名残り） |
| A17 | `isBattleRoom` | `src/engine/game/rooms/index.ts` | 消す | 同上 |
| A18 | `heroesInTown` | `src/engine/game/world/town.ts` | 消す | 同上 |
| A19 | `isMapEvent` | `src/engine/game/world/world.ts` | 消す | 同上 |
| A20 | `mySeat` | `src/store/onlineStore.ts` | 消す | 同上 |
| A21 | 消した後に連鎖して使われなくなった物 | 上のファイル | 型チェックで見つけて消す | 同上 |

残す物（報告だけ）:
- テストだけが使う `export`（`hasSound`・`playSounds`・`hasConditionKind`・`hasEffectKind`・`playToEnd` など約60個）… テストの道具なので残す。
- ファイルの中だけで使っている `export`（約170個）… 実害が無く、外すと差分が大きくなるので残す（提案）。
- `src/art/enemies/*`・`src/art/backgrounds/*` の部品名… 一覧に自動で集める仕組み（`import.meta.glob`）で使われているので残す。

## B. 使っていない CSS（消す）

| # | 何 | どこ | どうする | 理由 |
|---|---|---|---|---|
| B1 | `.idle-bob` | `src/index.css` | 消す（動作軽減の行からも外す） | どの画面も使っていない |
| B2 | `.token-hop` と `@keyframes token-hop` | `src/index.css` | 消す | 同上 |
| B3 | `.hex-rise` | `src/index.css` | 消す | 同上 |

`door-open-right` は名前を組み立てて使っている（`door-open-${side}`）ので残す。

## C. 使っていない素材・ファイル

| # | 何 | どこ | どうする | 理由 |
|---|---|---|---|---|
| C1 | 画面の四隅の飾り4枚（約17KB） | `src/assets/art/ui/corner-*.webp` | 消す | どこからも使っていないのに、起動の時に先読みしている（`ui/` は全部すぐ読む決まり） |
| C2 | `tsconfig.tsbuildinfo` | リポジトリの一番上 | Git の管理から外し、`.gitignore` に足す（提案） | 型チェックが作る一時ファイル。最初のコミットから入ったまま |
| C3 | 絵（957枚）・音（125個）・動画（4個）のほかの物 | `src/assets` | 残す | 名前を組み立てて読む物も含め、すべて使い道があった |
| C4 | `public/`（アイコンと manifest） | `public` | 残す | 使っている |

## D. 古いスクリプト

| # | 何 | どこ | どうする | 理由 |
|---|---|---|---|---|
| D1 | Gemini のテストプレイの記録用（36個） | `scripts/playtest/` | `scripts/archive/playtest/` に移す（提案。`../lib.mjs` の読み込みを `../../lib.mjs` に直す） | 一回きりの撮影と記録。今の確認には使わない |
| D2 | Gemini の検証の撮影用（10個） | `scripts/gemini-verify/` | `scripts/archive/gemini-verify/` に移す（提案。同上） | 同上 |
| D3 | ほかの `scripts/*.mjs`（約50個） | `scripts/` | 残す。`scripts/README.md` を作り「いつも使う確認」「撮影・一回きり」に分けて書く（提案） | まとめ役の運用確認で使う物があるので、場所を変えない |

## E. 重い処理・最初に読み込む大きさ

最初に読む JavaScript は約2.1MB（gzip 約640KB）。中身はゲームのデータ（カード・敵など）・React・framer-motion・Firebase。

| # | 何 | どこ | どうする | 理由 |
|---|---|---|---|---|
| E1 | オンラインの通信の部品（Firebase）を、最初から全部読んでいる | `src/store/onlineStore.ts` → `src/net/firebaseBackend.ts` | オンラインを始める時だけ読むように変える（提案。`onlineAvailable`・`emulatorFromUrl` の小さな関数だけ別のファイルに分ける。接続はもともと「待つ」作りなので、流れは同じ） | 1人で遊ぶ人は使わない。最初の読み込みが軽くなる（見込み 150KB 前後。測って表にする） |
| E2 | 使っていない画像の先読み | C1 と同じ | C1 で解決 | — |
| E3 | 毎フレームの処理 | `LandscapeLayer.tsx`（景色を少しずつ描く）・`WorldMap.tsx`（カメラ）・`AbilityCutins.tsx` | 残す | どれも「必要な間だけ」動き、終われば止まる作りだった。無駄な計算は見つからなかった |
| E4 | ゲームのデータが大きい（format の塊 約690KB） | `src/content` | 残す | データそのもの。分けると読み込みの順番が変わり、危ないので触らない |

## F. 設計書の更新で見つかった食い違い（8件）

| # | 何 | どこ | どうする |
|---|---|---|---|
| F1 | `BALANCE.dungeonWatchSteps`（値0）を使っていない | `src/data/balance.ts`・テスト1か所 | 消す。テストは「警戒しても扉の数が変わらない」と直接確かめる形に直す |
| F2 | 竜騎士の探索の能力が `slots: 2`（動きは +1） | `src/content/common/classes/dragoon.ts` | `slots: 1` に直す（動きは同じ。`moveSlots` は「1以上なら +1」なので） |
| F3 | `TIMING.rollSpin` の説明が古い | `src/data/balance.ts` | 「ほかの判定（CheckPanel）のスロットが回る時間」に直す |
| F4 | 侵食度の説明「0.25 刻み」 | `src/data/balance.ts`・`corruptionShown.ts` | 「今の値は 0.5 刻み」に直す（説明だけ） |
| F5 | 画面から使わない操作 `DUNGEON_STEP`・`DUNGEON_TURN`・`DUNGEON_WALK` | `types/game.ts`・`engine/game/game.ts` | **残す（提案）**。テスト約20か所が「キャラの位置を動かす道具」として使っていて、消すとテストを大きく書き換え、ダンジョンの通路のテストも減る。説明に「画面からは使わない。テストで位置を動かすために残す」と書く |
| F5b | サイコロの操作の `focusUsed`（使わない項目） | `WORLD_ROLL_MOVE`・`EXPLORE_ROLL` の型 | 消す。テスト約30か所から `focusUsed: 0` などを消す（エンジンは見ていないので、動きは同じ。古い端末が送ってきても無視されるだけ） |
| F6 | ダンジョンのデータの説明「8行」「9行」「10行」 | `src/content/scenarios/*/dungeons/dungeons.ts`（6本・約20か所） | 「（元は8行。今は鍵40行・最後52行に広げる）」が分かる書き方に直す |
| F7 | `AGENTS.md` の「今の進み具合」「確認のコマンド」が古い | `AGENTS.md` | 今の状態（44職・7シナリオ・保存 v17 など）と、heavy.mjs の決まりに直す |
| F8 | ジョブの時間の表が、転職レベルを変える前のまま | `docs/tasks/volume-measure.md` | 表の上に「転職レベル 6/5/7 の時の測定。今は 9/7/9。新しい数字は STATUS の節」と書き、新しい数字の表を足す |

## G. 古い作業書（docs/tasks）

`docs/archive/tasks/` に移す（消さない）。ほかの文書・コメントの中のリンクも新しい場所に直す。

- 移す（済んだ物・19個）: `J3c-top-jobs`・`J3d-special-jobs`・`K2-equipment`・`K3-enemies`・`K3-more-enemies`・`K4-clockwork-enemies`・`K4-cursed-enemies`・`K4-dream-enemies`・`K4-frozen-enemies`・`K4-sand-enemies`・`K4-scenarios-4to7-plans`・`K4-star-enemies`・`interaction-feel`・`interaction-safety`・`phase2-plan`・`phase3-plan`・`play-feedback-plan`・`stage3-dungeon-plan`・`turn-cutin`
- 残す: `diorama-design-request`・`diorama-design`（シナリオ2〜7の絵がまだ）・`ops-test-plan`（これから使う）・`volume-measure`（F8 で直す）・`ref/`・この文書

## H. npm のパッケージ（報告だけ。足さない・消さない・lock を変えない）

| パッケージ | 使っている所 | 判断 |
|---|---|---|
| react・react-dom | 全体 | 必要 |
| zustand | store（6ファイル） | 必要 |
| framer-motion | 画面の動き（33ファイル） | 必要。最初の読み込みで約160KB と大きいが、置き換えは大工事なので触らない |
| lucide-react | アイコン（41ファイル） | 必要（使う分だけ入る） |
| firebase | オンライン（1ファイル） | 必要。E1 で後から読むようにする |
| @fontsource/zen-antique・cinzel-decorative | 文字（main.tsx の CSS） | 必要 |
| 開発用（vite・vitest・typescript・tailwind・@types など） | ビルドとテスト | 必要 |

使っていないパッケージは無かった。

## I. 前と後の確認（同じ物を両方で。結果は表にする）

1. `npx tsc --noEmit`・`npx vitest run`・`npm run build`（JavaScript・CSS・全体の大きさ）
2. 画面の確認（`HANDOFF.md §4` の物＋指示の物）: `check-layout`・`playthrough`・`jobchange`・`interaction-safety`・`battle-feedback`・`movement-pet-colors`・`final-special-jobs`・`pets`・`stepb-battle`・`enemy-turn-timing`・`status-button`・`world-steady-map`（3回ずつ・何回中何回通ったか）・`explore`・`dice-shots`・`dungeon-view`・`dungeon-frames`・`chest-show`
3. `adventure.mjs`: 種を決めて、第1シナリオを2人と4人
4. `VOL=1` の volume.sim の第1シナリオ
5. `online.mjs`（と `dungeon-coop`・`coop-talk`）をエミュレーターで（本番には書かない）
6. `perf.mjs`・`world-perf.mjs` の fps
- 重い確認は `node C:/dev/card-rpg-tools/heavy.mjs` を通して1つずつ（同時1本）。
- 「撮影・一回きり」のスクリプト（`hero-art`・`diorama-shots` など約25個）は、確認の役目が無いので回さない（提案）。
