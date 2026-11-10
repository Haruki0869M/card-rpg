# K4 作業書：機械仕掛けの帝国 敵28体と絵の指示文（Codex 向け）

シナリオ6「機械仕掛けの帝国」の敵を作る。**先に `docs/archive/tasks/K3-enemies.md`・`K4-frozen-enemies.md`・`K4-cursed-enemies.md` を読む**（書き方・亜種の決まり・確認の方法・絵の指示文の形は同じ）。

前提: `src/content/scenarios/clockworkEmpire/` に `scenario.ts`・`map.ts`・`dungeons/`・`towns/`・`quests/`・`shrines/`・`events/`・`items/` がある（Claude が作成済み）。敵の組み合わせは**仮**（共通の敵）。この作業で本物に置き換える。

## 1. 世界観と戦い方

- 舞台は蒸気と鋼の帝国。敵は「暴走した機械・人形・蒸気の精・歯車の虫」。
- **雷（thunder）が主な弱点**。機械は**毒に耐性**（`resist: ['poison']`）、砲台や炉の敵は**火に耐性**で氷に弱い。人形・木製の敵は火に弱い。聖と闇はあまり使わない。
- 状態異常: 麻痺・脆弱・火傷。凍結・呪いは使わない（他のシナリオと差をつける）。
- 数値は侵食の魔王の同じレベルの敵と同じ水準（難しめのまま）。罠・砲台は「次のターンの攻撃を予告する」ような単純な行動の並び（`sequence`）にする。

## 2. 作る28体

置き場所: `src/content/scenarios/clockworkEmpire/enemies/`。地域ごとに1ファイル（`town.ts`・`factory.ts`・`valley.ts`・`plant.ts`・`heart.ts`）。

### 通常18体（うち亜種4）
| ID | 名前 | 地域 | Lv | メモ |
|---|---|---|---|---|
| `gearBug` | 歯車の虫 | 街 | 1 | 小さい。かじる。雷が弱点 |
| `steamRat` | 蒸気ネズミ | 街 | 2 | 速い。火傷を付ける |
| `brokenAutomaton` | 壊れた人形 | 街・工場 | 2 | ぎくしゃく動く。火が弱点 |
| `conveyorBot` | ベルトコンベアの機械兵 | 工場 | 3 | 規則的な行動。雷が弱点、毒に耐性 |
| `riveter` | 鋲打ち機 | 工場 | 3 | 一撃が重い。ブロックを貫く行動 |
| `oilSlime` | 油スライム | 工場 | 3 | 火が弱点（燃えやすい）。脆弱を付ける |
| `sparkTurret` | 火花の砲台 | 工場・谷 | 3 | 動かない。雷属性の砲撃。氷が弱点 |
| `steamSprite` | 蒸気の精 | 谷 | 5 | 火傷。氷が弱点、火に耐性 |
| `boilerCrab` | ボイラーの蟹 | 谷 | 5 | 硬い。火に耐性 |
| `wrenchGolem` | スパナのゴーレム | 谷 | 5 | 殴る。雷が弱点 |
| `clockworkDog` | ゼンマイの犬 | 谷 | 5 | 連続噛みつき。ネジが切れると休む特性 |
| `pistonFist` | ピストン拳 | 炉 | 7 | 全体へ衝撃。雷が弱点 |
| `furnaceImp` | 炉の小鬼 | 炉 | 7 | 火属性。氷が弱点、火に耐性 |
| `copperKnight` | 銅の騎士 | 心臓部 | 9 | 槍の突撃。雷が弱点 |
| 亜種 `voltGearBug` | 電気歯車の虫 | 工場 | 3 | `gearBug` の亜種。かじりを雷属性に。オーラ `storm` |
| 亜種 `emberOilSlime` | 熾火の油スライム | 谷 | 5 | `oilSlime` の亜種。攻撃を火属性に。オーラ `ember` |
| 亜種 `venomBoilerCrab` | 毒液の蟹 | 炉 | 7 | `boilerCrab` の亜種。はさみに毒。オーラ `venom` |
| 亜種 `ironCopperKnight` | 鋼の銅騎士 | 心臓部 | 9 | `copperKnight` の亜種。開幕にブロック。オーラ `iron` |

（14体＋亜種4体＝18体）

### エリート6体（うち亜種1）
| ID | 名前 | 出る場所 | Lv | メモ |
|---|---|---|---|---|
| `foremanBot` | 現場監督ロボ | 工場 | 5 | HP 約55。号令で味方を強化 |
| `steamTurretLord` | 蒸気砲台長 | 谷・蒸気の発電所 | 5 | HP 約60。全体砲撃。氷が弱点 |
| `ironButler` | 鉄の執事 | 炉 | 8 | HP 約80。ブロックが高い。雷が弱点 |
| `chainSaw` | 回転ノコギリ | 炉・時計塔 | 8 | HP 約75。連続攻撃 |
| `furnaceGolem` | 炉のゴーレム | 心臓部・大機械の心臓 | 9 | HP 約100。火属性。氷が弱点 |
| 亜種 `stormForemanBot` | 雷の現場監督 | 工場 | 5 | `foremanBot` の亜種。属性を雷に。オーラ `storm` |

### ボス4体（`phases` あり）
| ID | 名前 | 場所 | Lv | HP目安 | メモ |
|---|---|---|---|---|---|
| `foremanGolem` | 工場長ゴーレム | 歯車の工場 | 5 | 150 | 命令（味方強化）と殴打。50%以下で暴走（連続攻撃） |
| `runawayBoiler` | 暴走ボイラー | 蒸気の発電所 | 7 | 210 | 蒸気で全体火傷。50%以下で爆発寸前（全体攻撃） |
| `clockworkSage` | 時計仕掛けの賢者 | 時計塔 | 9 | 270 | 時間を操る行動名（「逆回し」「加速」）。50%以下で針が早まる |
| `greatMachine` | 大機械 | 大機械の心臓 | 11 | 400 | 3段階（100〜60% / 60〜30% / 30%以下）。「部品にする」「繋ぐ」など物語を行動名に。最後は全力稼働で全体攻撃 |

## 3. ダンジョンと地域に置く

- `dungeons/dungeons.ts` の `POOLS` を、ダンジョンごとの本物に分ける。歯車の工場は工場の敵と `foremanBot`、`boss: ['foremanGolem']`。蒸気の発電所は谷の敵と `steamTurretLord`、`boss: ['runawayBoiler']`。時計塔は炉の敵と `ironButler`・`chainSaw`、`boss: ['clockworkSage']`。大機械の心臓は心臓部の敵と `furnaceGolem`、`boss: ['greatMachine']`。`scrapCave`（ランダム）の `boss` は `['ironButler', 'chainSaw']`。
- `map.ts` の `encounters` も本物に置き換える。組み合わせは2〜3体で、雷だけが弱点の敵ばかりにならないようにする（火・氷の弱点の敵を混ぜる）。

## 4. 絵の指示文

`docs/art/prompts-enemies-clockworkEmpire.md` に書く（亜種は絵を使い回すので不要。**23体分**）。形は `K4-cursed-enemies.md` の §4 と同じ（`--sref` 付き。持たせない物は `--no`）。このシナリオの雰囲気: 煤けた真鍮と銅、白い蒸気、赤く光る炉。機械兵は人の形でも、顔は無表情な仮面。

## 5. 確認と報告

K4-frozen-enemies.md の §5 と同じ。自動プレイは `SIM_SCENARIO=clockworkEmpire` で、目安は侵食の魔王（2人85%・4人90%、40シード）に ±10 ポイント。
