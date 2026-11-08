# K3 追加の敵：目標の約230体に足りない約60体を増やす（Codex 向け指示書・提案）

作業書の元: `docs/tasks/K3-enemies.md`（敵のデータの書き方・亜種の決まり）。**この文書は「足りない分をどこに置くか」と手順だけを決める。** 敵の書き方・亜種・オーラ・絵の指示文の基本は K3-enemies.md を先に読む。
（この文書の割り振りはすべて Claude の提案。オーナーの確認前は、A のみ着手してよい。）

## 1. 数の見直し（2026-11-08 時点の主ブランチ fed89f2）

| 区分 | 今 | 予定 | 備考 |
|---|---|---|---|
| 共通（どのシナリオでも出る） | 5 | 5 | |
| 侵食の魔王 | 15 | 15 | |
| 凍てつく王国 | 28 | 28 | 亜種5 |
| 呪われた群島 | 0 | 28 | Codex の T4 で作成中 |
| 砂塵の王朝・星降る天空城・機械仕掛けの帝国 | 0 | 各28 | K4 の各シナリオで作成 |
| 夢幻の大迷宮 | 0 | 約10 | 新しい絵が要る敵のみ。残りは再登場（同じ絵の強化版） |
| **合計** | **48** | **約170** | 目標 約230 まで **約60体不足** |

## 2. 約60体の割り振り（提案）

| 区分 | 増やす数 | 置き場所 | 内容 |
|---|---|---|---|
| A. 侵食の魔王を28体にする | +13 | `src/content/scenarios/corruptionKing/enemies/` | 最初のシナリオで一番遊ばれる。通常18・エリート6・ボス4にそろえる（今は通常6・エリート5・ボス4）。通常 +12・エリート +1 |
| B. 共通の敵を20体にする | +15 | `src/content/common/enemies/` | どのシナリオの徘徊・突発イベントにも出る敵。地域に依存しない獣・盗賊・魔物 |
| C. 隠し・レアの敵 | +14 | `src/content/common/enemies/` | 徘徊の小確率・イベントの隠しボスで出る。通常より強く、報酬が多い |
| D. 各シナリオを31体にする | +15（凍てつく王国・呪われた群島・砂塵の王朝・星降る天空城・機械仕掛けの帝国 各+3） | 各シナリオの `enemies/` に **`extra.ts`**（新しいファイル） | 通常 +3。地域ごとの組み合わせの幅を増やす |
| E. 夢幻の大迷宮の新しい敵 | +3 | 夢幻の大迷宮の `enemies/`（K4 で作る時） | 約10体を約13体に |
| **合計** | **+60** | | **48 + 60 + 計画済み 約122 = 約230** |

亜種は全体の2割（約46体）まで。今の予定は 凍てつく王国5 + 呪われた群島5 + 砂塵5 + 天空5 + 機械5 = 25。**この60体の中の亜種は最大12体**（A:3・B:3・D:6）。合計は約37体（16%）で、2割以下。

絵が新しく要る数: 約60 − 亜種12 = 約48体 + 変身後の絵。既存で絵が無い `goldenThief`・`guardDog`（B の仲間）は、`prompts-enemies-common.md` に指示文がある。

## 3. 作業の順番（ぶつからないために）

K4 の各シナリオの作業（T4 など）が **`map.ts`・`dungeons/pools.ts`・`towns/`・`events/`** を編集している。同じファイルを同時に触らないよう、次の順にする。

1. **T-A 侵食の魔王 +13体**（敵の定義の新ファイル + `pools.ts`・`map.ts` の配置まで）。侵食の魔王は K4 が触っていないので、すぐ着手してよい。
2. **T-B 共通 +15体、T-D の「定義だけ」**（`extra.ts` を作る。**配置は書かない**）。ファイルが新規なので衝突しない。
3. **T-配置**（最後。K4 の全シナリオが主ブランチに入った後）: B・C・D の敵を、各シナリオの `pools.ts`・`map.ts` の `encounters`・突発イベントへ置く。
4. **T-C 隠し・レア**は **Claude の土台作業（下の§5）が済んでから**。

敵の定義の新ファイル名の例: `forest2.ts`・`swamp2.ts`・`volcano2.ts`・`castle2.ts`（A）、`wild1.ts`・`bandits.ts`・`beasts2.ts`（B）、`rare1.ts`（C）、`extra.ts`（D）。**既存の敵ファイルは書き換えない。**

## 4. 各区分の作り方

### A. 侵食の魔王（+13）
- 今の敵（森: forestWolf・toxicShroom・treeWarden・treantKing、沼: bogGhoul・mireSlime・bogWraith・mordea、火山: fireSalamander・ashBat・magmaGolem・ignavarl、魔王城: darkKnight・gatekeeper・valgrim）と、同じ地域の雰囲気で作る。
- 地域ごとの目安: 森 +3（通常）、沼 +3（通常 +2、エリート +1）、火山 +3（通常）、魔王城の荒野 +3（通常）、ランダムの森 +1（通常）。
- 通常は HP 18〜60（`baseLevel` 3〜9）。今の同じ地域の敵と並べて、強さを揃える。難しめを保つ。
- 亜種を作る時は、`makeVariant` を使い、元の敵が **同じファイルか既存ファイル** にあること。亜種は最大3体。
- 配置: `dungeons/pools.ts` の `battle` / `elite` と、`map.ts` の地域の `encounters` に、新しい敵が出るよう組み合わせを足す。**既存の組み合わせは消さず、足す。**

### B. 共通の敵（+15）
- 地域に依存しない敵（獣・盗賊・魔物・亡霊の類）。名前・見た目は特定のシナリオの世界観に寄せすぎない。
- レベルの幅が広くても出るよう、`baseLevel` は3〜9で作る（出る場所のレベルで補正される）。
- 通常 12、エリート 3（予定）。亜種は最大3体。
- 置き場所は最後の「T-配置」で決める。それまでは**定義だけ**書き、どこにも出さない（テストは通る）。

### C. 隠し・レアの敵（+14）
- 承認済みの方針（初期値）: **徘徊の小確率で出るレア**と、**イベントの戦闘に置く隠しボス**。ダンジョンの `pools` に `rare` 枠は作らない。
- **通常のレアの敵 10体、隠しボス 4体**（提案）。
- レアの敵: 同じ地域の通常の敵より HP・攻撃が約1.5倍、経験値・ゴールド約3倍、特殊能力を1つ持つ。見た目は「普段と違う色・飾りの付いた別の種」にして、絵は新しく作る。
- 隠しボス: エリート〜ボスの強さ。専用の物語を持つ（名前と1〜2行の説明）。報酬は装備（レア以上が必ず出る）。
- **仕組みは Claude が先に作る（§5）。** Codex は仕組みが主ブランチに入ってから、敵の定義を書く。

### D. 各シナリオを31体に（+3ずつ）
- 5つのシナリオそれぞれに、通常の敵を3体足す（通常18 → 21）。地域の組み合わせを増やすのが目的。
- 新しいファイル `extra.ts`。**配置は書かない。** 亜種は各シナリオ最大1〜2体（全体で6体まで）。
- シナリオの作業（K4）がまだ進行中のものは、そのシナリオの敵が全部入ってから行う（呪われた群島は T4 の完了後、砂塵の王朝・天空・機械は各シナリオの敵の作業の完了後）。

### E. 夢幻の大迷宮（+3）
- K4 で夢幻の大迷宮を作る時に、新しい絵が必要な敵を約13体にする。この文書では扱わない（K4-scenarios-4to7-plans.md に従う）。

## 5. Claude が先に作る土台（隠し・レア）

Codex は触らない。Claude が主ブランチに足す。

1. `EnemyDef` に `rare?: true` と `rareOf?: string`（レアの元になる通常の敵のID）を足す。
2. 徘徊の敵を作る時、地域の `encounters` の通常の敵を、小さな確率（提案: 6%）で、そのレアの敵に置き換える。地域の設定に `rareWanderers?: { enemies: string[][]; chance: number }` を足す（省略可）。
3. 隠しボス: 突発イベント・名所のイベントの戦闘（`battle`）に置く。仕組みは既存の `battle` の結果（`event.battle`）で足りる。
4. 倒した時の報酬を増やす項目（`rareReward`）。
5. テスト: レアが出る確率・乱数が全員で同じになること（オンラインで同じ結果）・保存して再開しても同じ。
6. 画面: 敵の名前の横に「レア」の印（短く）。

## 6. 絵の指示文（`--sref` 付きの形）

新しい敵（亜種を除く）ごとに、**`docs/art/prompts-enemies-<区分>-mj.md`** に1体1ブロックで書く。手本は `docs/art/prompts-enemies-frozenKingdom-mj.md`（ブランチ `claude/j4-prompts-9ade08` のコミット bb920ce。主ブランチに入っていなければ、そのコミットを読む）と、`prompts-enemies-common.md`。

区分ごとのファイル名: A = `prompts-enemies-corruptionKing-mj.md`、B・C = `prompts-enemies-common-mj.md`（`prompts-enemies-common.md` とは別の新規ファイル。既存を書き換えない）、D = 各シナリオの `prompts-enemies-<シナリオID>-extra-mj.md`。

書式（1体分）:

````markdown
### <敵ID> <名前>（<シナリオまたは共通>・<地域>・<通常/エリート/ボス/レア/隠しボス>・size <値>）
置き場所: src/assets/art/enemy/<敵ID>.webp
元画像: `C:\dev\card-rpg-assets\enemy\<敵ID>.png`

```
full body creature illustration of <1体の姿。持たせる物は具体的に>, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with <地域の色調>, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no <持たせない物>, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```
````

決まり:
- 文の中に `no ...` と書かない。持たせない物は最後の `--no` にまとめる。
- 1体のみ・全身・左向き3/4・白い無地の背景。
- 第2段階のあるボス・隠しボスは `-1` の指示文も書く（姿が変わる）。
- 武器・体の特徴は具体的に。亜種は書かない（絵を使い回す）。
- 元画像の置き場所 `C:\dev\card-rpg-assets\enemy\` はオーナーが画像を置く場所。Codex は画像を作らない。

## 7. 各タスクの報告と確認

- `docs/tasks/K3-enemies.md` §6 の通り（型チェック・全テスト・追加数・亜種の比率・自分で決めた数値・絵の指示文の数）。
- 追加テスト: `k3MoreEnemies.test.ts`（新規）。次を確かめる。
  - 全体の敵数と亜種の比率（2割以下）。
  - 各シナリオ（侵食の魔王）が通常18・エリート6・ボス4になっていること（A の完了後）。
  - 新しい敵の参照切れがないこと（`pools.ts`・`map.ts`・`events`）。
  - 亜種が属性か開幕特性を変えていること（`k2k3Foundation.test.ts` の検査と同じ）。
- 侵食の魔王に敵を足した後は、自動プレイ（`SIM=1 SIM_SEEDS=10 SIM_PARTY=2人 SIM_DIFF=normal npx vitest run balance`、重い確認は `node C:/dev/card-rpg-tools/heavy.mjs ...` を通す）で、クリア率が大きく変わらないこと（±15%）を報告する。難しくしすぎない・易しくしすぎない。

## 8. K4・K2・K7 とぶつかるファイル

| ファイル | 誰がぶつかるか | 対策 |
|---|---|---|
| `scenarios/<id>/enemies/*.ts`（既存） | K4（各シナリオの敵） | 既存は書き換えない。新しいファイル名（`extra.ts` など）にする |
| `scenarios/<id>/dungeons/pools.ts`・`map.ts` | K4 | 侵食の魔王だけ先に編集してよい。ほかのシナリオは K4 完了後の「T-配置」で編集する |
| `common/randomEvents/randomEvents.ts` | K7（突発イベント） | 共通の敵を突発イベントで使う時は、K7 と調整する（最後の配置で行う） |
| `src/types/index.ts`（`EnemyDef` の `rare` など） | 土台（Claude） | Codex は型を変えない |
| `engine/__tests__/data.test.ts` | 全員 | 追加テストは新しいファイルにする |
| `docs/STATUS.md` | 全員 | 更新はまとめ役がまとめて行う |
