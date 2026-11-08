# K4 作業書：砂塵の王朝 敵28体と絵の指示文（Codex 向け）

シナリオ4「砂塵の王朝」の敵を作る。**先に `docs/tasks/K3-enemies.md`・`docs/tasks/K4-frozen-enemies.md`・`docs/tasks/K4-cursed-enemies.md` を読む**（書き方・亜種の決まり・確認の方法・絵の指示文の形は同じ。この文書は、このシナリオだけの決め事）。

前提: `src/content/scenarios/sandDynasty/` に `scenario.ts`・`map.ts`・`dungeons/`・`towns/`・`quests/`・`shrines/`・`events/`・`items/` がある（Claude が作成済み）。敵の組み合わせは**仮**（共通の敵）。この作業で本物に置き換える。

## 1. 世界観と戦い方

- 舞台は砂漠の国ハルカーン。敵は「砂漠の生き物・ミイラ・石像・盗掘者の亡霊」。
- **火に強く（`resist: ['fire']`）氷に弱い（`weak: ['ice']`）砂漠の生き物**を混ぜる。**ミイラは火と聖が弱点**。石像・土人形は雷が弱点。毒は蠍・蛇が主役。
- 状態異常: 毒・呪い・脆弱。凍結は使わない。
- 数値は侵食の魔王の同じレベルの敵と同じ水準（難しめのまま）。

## 2. 作る28体

置き場所: `src/content/scenarios/sandDynasty/enemies/`。地域ごとに1ファイル（`gate.ts`・`ruins.ts`・`dunes.ts`・`valley.ts`・`palace.ts`）。

### 通常18体（うち亜種4）
| ID | 名前 | 地域 | Lv | メモ |
|---|---|---|---|---|
| `sandScarab` | 砂甲虫 | 入口 | 1 | 硬い（ブロック）。小さい |
| `desertViper` | 砂漠の毒蛇 | 入口・廃墟 | 2 | 毒の噛みつき。耐性: 毒 |
| `jackalWarrior` | ジャッカルの戦士 | 廃墟 | 3 | 槍の連続攻撃 |
| `tombRobber` | 盗掘者の亡霊 | 廃墟 | 3 | 金を奪う行動（ダメージ+ブロックを削る）。聖が弱点 |
| `sandScorpion` | 砂蠍 | 廃墟・砂丘 | 3 | 毒の尾。耐性: 毒、火 |
| `vulture` | 禿鷲 | 砂丘 | 5 | 飛ぶ。2回攻撃。雷が弱点 |
| `mummy` | ミイラ | 砂丘 | 5 | 呪い。火と聖が弱点 |
| `sandSprite` | 砂の精 | 砂丘 | 5 | 脆弱を付ける。氷が弱点、火に耐性 |
| `dustDevil` | 砂旋風 | 砂丘 | 5 | 全体に小ダメージ |
| `sandWorm` | 砂虫 | 谷 | 7 | HPが多い。毒に耐性 |
| `clayGolem` | 土人形 | 谷 | 7 | 硬い。雷と氷が弱点 |
| `mummyArcher` | ミイラの弓兵 | 谷 | 7 | 遠距離。火が弱点 |
| `cursedPriest` | 呪われた神官 | 谷・王宮前 | 7 | 呪いと回復（味方の傷を癒やす）。聖が弱点 |
| `stoneCat` | 石の猫像 | 王宮前 | 9 | 動く像。雷が弱点。反撃の特性 |
| 亜種 `emberSandScorpion` | 熾火の砂蠍 | 砂丘 | 5 | `sandScorpion` の亜種。尾を火属性に。オーラ `ember` |
| 亜種 `cursedMummy` | 呪詛のミイラ | 谷 | 7 | `mummy` の亜種。攻撃を闇属性に。オーラ `shadow` |
| 亜種 `stormVulture` | 雷禿鷲 | 谷 | 7 | `vulture` の亜種。爪を雷属性に。オーラ `storm` |
| 亜種 `venomJackalWarrior` | 毒槍のジャッカル | 王宮前 | 9 | `jackalWarrior` の亜種。槍に毒。オーラ `venom` |

（14体＋亜種4体＝18体）

### エリート6体（うち亜種1）
| ID | 名前 | 出る場所 | Lv | メモ |
|---|---|---|---|---|
| `royalGuardMummy` | 王家の衛兵ミイラ | 砂丘・蠍の墓所 | 5 | HP 約55。盾（ブロック高め）。火が弱点 |
| `scribeShade` | 書記官の影 | 砂丘・影の書庫 | 5 | HP 約50。脆弱と呪い。聖が弱点 |
| `sphinxCub` | スフィンクスの子 | 谷 | 8 | HP 約80。謎かけの行動（フォーカスを奪う） |
| `sandSerpentLord` | 砂の大蛇 | 谷・石像の神殿 | 8 | HP 約90。毒と締め付け |
| `colossusStatue` | 石像の巨兵 | 王宮前・砂塵の王宮 | 9 | HP 約100。ブロックが高い。雷が弱点 |
| 亜種 `cursedScribeShade` | 呪詛の書記官の影 | 影の書庫 | 5 | `scribeShade` の亜種。属性を闇に。オーラ `shadow` |

### ボス4体（`phases` あり）
| ID | 名前 | 場所 | Lv | HP目安 | メモ |
|---|---|---|---|---|---|
| `sandScorpionKing` | 砂蠍王 | 蠍の墓所 | 5 | 150 | 毒の尾と大きなはさみ。50%以下で全体の毒 |
| `shadowVizier` | 影の宰相 | 影の書庫 | 7 | 210 | 呪いと脆弱。50%以下で影の分身（ブロック） |
| `stoneGuardianBeast` | 砂の守護獣 | 石像の神殿 | 9 | 270 | 一撃が重い。50%以下で石の咆哮（全体攻撃） |
| `sandPharaoh` | 砂塵の王 | 砂塵の王宮 | 11 | 400 | 3段階（100〜60% / 60〜30% / 30%以下）。最後は砂嵐で全体攻撃。物語（民を救うために永遠の命を求めた王）を行動名に込める |

## 3. ダンジョンと地域に置く

- `dungeons/dungeons.ts` の `POOLS` を、ダンジョンごとの本物に分ける。蠍の墓所は廃墟の敵とエリート `royalGuardMummy`、`boss: ['sandScorpionKing']`。影の書庫は砂丘の敵と `scribeShade`・`cursedScribeShade`、`boss: ['shadowVizier']`。石像の神殿は谷の敵と `sphinxCub`・`sandSerpentLord`、`boss: ['stoneGuardianBeast']`。砂塵の王宮は王宮前の敵と `colossusStatue`、`boss: ['sandPharaoh']`。`sandCave`（ランダム）の `boss` は `['sandSerpentLord', 'sphinxCub']`。
- `map.ts` の `encounters` も本物に置き換える。入口は砂甲虫・毒蛇、廃墟はジャッカル・盗掘者・蠍、砂丘は禿鷲・ミイラ・砂の精・砂旋風、谷は砂虫・土人形・ミイラの弓兵・神官、王宮前は石の猫像とエリート。組み合わせは2〜3体で、弱点が同じ敵だけにならないようにする。
- 暑さと夜の寒さで、プレイヤーは砂漠のマスで少しずつHPを失う。敵の数値は上の水準を保つ（やさしくしない）。

## 4. 絵の指示文

`docs/art/prompts-enemies-sandDynasty.md` に書く（亜種は絵を使い回すので不要。**23体分**）。形は `docs/tasks/K4-cursed-enemies.md` の §4 と同じ（`--sref` 付き。持たせない物は `--no`）。このシナリオの雰囲気: 金色の砂、褪せた赤土、古い青銅と包帯の白。ミイラは包帯と錆びた金の装飾。石像は砂岩の質感。

## 5. 確認と報告

K4-frozen-enemies.md の §5 と同じ。自動プレイは `SIM_SCENARIO=sandDynasty` で、目安は侵食の魔王（2人・ふつう: 約9日・34戦闘）に近いこと。
