# K4 作業書：凍てつく王国 手順2「敵28体と絵の指示文」（Codex 向け）

シナリオ2「凍てつく王国」の敵を作る。**先に `docs/archive/tasks/K3-enemies.md` を全部読む**（書き方・亜種の決まり・絵の指示文の書き方は、そちらが正本）。この文書は、凍てつく王国だけの決め事。

前提（Claude が手順1で作成済み）: `src/content/scenarios/frozenKingdom/` に `scenario.ts`・`map.ts`・`dungeons/`・`towns/`・`quests/`・`shrines/`・`events/` がある。いまの敵の組み合わせは**仮**（共通の敵 goblinBrute など）。この作業で本物に置き換える。

## 1. 世界観と戦い方の方針

- 舞台は百年続く冬の王国。敵は「氷・雪・凍った者たち」。**氷（ice）属性と凍結が主役**。
- **氷耐性（`resist: ['ice']`）の敵が多い。火に弱い（`weak: ['fire']`）敵も多い。** 火の武器・カードが活きる。ただし全員を火に弱くしない（雷・聖・闇・毒が弱点の敵も混ぜる）。
- 凍結（`applyStatus` の `freeze`）を使う敵を各地域に1〜2種類。凍結は「行動を休む」状態異常で、重ねすぎると理不尽になる。1回につき1〜2まで。
- 寒さ（世界マップでHPが減る仕組み）で、プレイヤーは最初から少し不利。**敵の数値は侵食の魔王の同じレベルの敵と同じ水準**にそろえる（難しめのまま。やさしくしない）。

## 2. 作る28体（ID・名前・役割）

置き場所: `src/content/scenarios/frozenKingdom/enemies/`。地域ごとに1ファイル（`foothills.ts`・`forest.ts`・`lake.ts`・`range.ts`・`castle.ts`）。既存ファイルは書き換えない。

### 通常18体（うち亜種4）
| ID | 名前 | 出る地域 | baseLevel | 弱点 | 耐性 | メモ |
|---|---|---|---|---|---|---|
| `snowHare` | 雪ウサギ | 麓 | 1 | fire | ice | 弱い。数で来る（組み合わせは3体まで） |
| `frostWolf` | 雪狼 | 麓・雪林 | 2 | fire | ice | 噛みつきと遠吠え（ブロック） |
| `frostSprite` | 霜の精 | 麓・雪林 | 2 | fire | ice | 小さい。凍結を1付ける |
| `iceBat` | 氷の蝙蝠 | 雪林 | 3 | fire, thunder | ice | 速い。2回攻撃 |
| `frozenSoldier` | 凍った兵士 | 雪林 | 3 | fire, holy | ice, dark | 盾（ブロック）を使う。依頼「凍った兵士たち」の相手 |
| `snowOwl` | 白梟 | 雪林 | 3 | thunder | ice | 先制の特性を1つ |
| `icicleBug` | 氷柱の虫 | 雪林 | 3 | fire | ice, poison | 毒は効かない |
| `iceSlime` | 氷結のスライム | 湖 | 5 | fire | ice, poison | 凍結を付ける |
| `frozenGhoul` | 凍える亡者 | 湖 | 5 | fire, holy | ice, dark | 呪い（`curse`）を付ける |
| `iceArcher` | 極寒の弓兵 | 湖 | 5 | thunder | ice | 遠距離。全体に小ダメージ |
| `frostMage` | 霜の魔法使い | 湖 | 5 | fire, dark | ice | 氷属性の大きな一撃と凍結 |
| `yeti` | 雪男 | 山脈 | 7 | fire | ice | 力が強い。HPが多め |
| `blizzardSnake` | 吹雪の蛇 | 山脈 | 7 | fire | ice, poison | 毒と凍結の両方 |
| `iceSwordsman` | 氷の剣士 | 山脈 | 7 | thunder, holy | ice | 連続攻撃 |
| 亜種 `emberFrostWolf` | 熾火の雪狼 | 雪林 | 3 | ice | fire | `frostWolf` の亜種。噛みつきを火属性に。オーラ `ember` |
| 亜種 `cursedFrozenSoldier` | 呪われた凍った兵士 | 湖 | 5 | holy | dark | `frozenSoldier` の亜種。攻撃を闇属性に。オーラ `shadow` |
| 亜種 `venomIceSlime` | 毒氷のスライム | 山脈 | 7 | fire | ice | `iceSlime` の亜種。毒が効く敵に。開幕に毒の特性。オーラ `venom` |
| 亜種 `stormIceArcher` | 雷氷の弓兵 | 山脈 | 7 | fire | ice, thunder | `iceArcher` の亜種。矢を雷属性に。オーラ `storm` |

### エリート6体（うち亜種1）
| ID | 名前 | 出る場所 | baseLevel | メモ |
|---|---|---|---|---|
| `iceKnight` | 氷の騎士 | 湖・氷の城（中ボス枠） | 8 | HP 約70。ブロックと大打撃 |
| `snowWitch` | 雪の魔女 | 雪林・湖 | 5 | HP 約48。凍結と呪い |
| `blizzardBeast` | 吹雪の獣 | 山脈 | 8 | HP 約80。全体攻撃 |
| `frostGuardian` | 霜の守護者 | 氷の城の荒野 | 9 | HP 約90。ブロック高め |
| `frostDrakeling` | 凍土の竜の幼体 | 山脈・氷の城 | 9 | HP 約95。氷のブレス（全体） |
| 亜種 `shadowSnowWitch` | 闇の雪の魔女 | 湖 | 5 | `snowWitch` の亜種。属性を闇に。オーラ `shadow` |

### ボス4体（`phases` あり。侵食の魔王の同じ段のボスと同じ水準）
| ID | 名前 | 場所 | baseLevel | HP目安 | メモ |
|---|---|---|---|---|---|
| `crystalLord` | 氷晶の主 | 氷晶の洞 | 5 | 150 | 氷柱で全体攻撃。50%以下で氷晶を増やす（ブロック） |
| `frozenBishop` | 凍れる司教 | 沈んだ聖堂 | 7 | 210 | 聖と氷の混ざった攻撃。50%以下で祈りの凍結 |
| `frostGiant` | 霜の巨人 | 霜の巨人の鉱山 | 9 | 270 | 一撃が重い。50%以下で怒り |
| `whiteQueen` | 白の女王 | 氷の城 | 11 | 400 | 3段階（100〜60% / 60〜30% / 30%以下）。最後は大技で全体攻撃。弱点は fire（少しだけ）。物語（姫が氷に呑まれた）を行動名に込める |

数値の目安（侵食の魔王と同水準）: 通常 HP 20〜60・1回のダメージ 5〜12。エリート HP 48〜95。`exp`・`gold` は `baseLevel` が同じ侵食の魔王の敵と同じくらい。`size` は通常 0.8〜1.1、エリート 1.2、ボス 1.4〜1.6。

## 3. ダンジョンと地域に置く

- `dungeons/pools.ts` の仮の組み合わせを書き換える。`CRYSTAL_POOLS`（氷晶の洞）は雪林の敵とエリート、`boss: ['crystalLord']`。`CATHEDRAL_POOLS` は湖の敵、`boss: ['frozenBishop']`。`MINE_POOLS` は山脈の敵、`boss: ['frostGiant']`。`CASTLE_POOLS` は荒野の敵と `iceKnight`（`elite` 枠）、`boss: ['whiteQueen']`。`frozenCave`（ランダム）の `boss` は `['frostDrakeling', 'snowWitch']`。
- `map.ts` の各地域の `encounters`（徘徊する敵）も本物に置き換える。麓は snowHare・frostWolf・frostSprite、雪林は iceBat・frozenSoldier・snowOwl・icicleBug、湖は iceSlime・frozenGhoul・iceArcher・frostMage、山脈は yeti・blizzardSnake・iceSwordsman、荒野はエリートと通常の組み合わせ。組み合わせは2〜3体、**同じ氷耐性の敵だけにならない**ようにする（弱点が違う敵を混ぜる）。
- 亜種は、徘徊と部屋の戦闘の両方に出してよい（組み合わせの中の1枠）。

## 4. 絵の指示文

`docs/art/prompts-enemies-frozenKingdom.md` に新しく書く（亜種は絵を使い回すので不要。28体のうち亜種は5体なので、**23体分**）。書き方は K3-enemies.md の §5 に従う。このシナリオ共通の雰囲気: 青白い光、氷の結晶、雪、冷たい影。持たせる物・持たせない物を必ず書く（例: 氷の騎士は「氷の剣を1本だけ持つ。盾・弓は持たない」）。ボスは堂々と大きく。ボスの第2段階以降の姿も書く。

## 5. 確認と報告

1. `npx tsc --noEmit`、`npx vitest run`（`data.test.ts`・`k2k3Foundation.test.ts` が参照切れ・亜種の決まり・エリート以上の特殊能力を見る。重い確認は `node C:/dev/card-rpg-tools/heavy.mjs <コマンド>` を通す）。
2. `SIM=1 SIM_SCENARIO=frozenKingdom SIM_SEEDS=10 SIM_PARTY=2人 SIM_DIFF=normal node C:/dev/card-rpg-tools/heavy.mjs npx vitest run balance` を実行して、`screenshots/balance.md` の結果を報告する。目安: かかった日数・戦闘数・部屋数が、侵食の魔王（2人・ふつう: 約9日・34戦闘・31部屋）に近い。クリア率は侵食の魔王（約67%）を**大きく下回らない**。
3. 報告に書くこと: 追加した敵の数（通常・エリート・ボス・亜種の内訳と比率）、数値で自分で決めた所、絵の指示文の数、テストと自動プレイの結果。
