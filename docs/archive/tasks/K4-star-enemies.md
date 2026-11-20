# K4 作業書：星降る天空城 敵28体と絵の指示文（Codex 向け）

シナリオ5「星降る天空城」の敵を作る。**先に `docs/archive/tasks/K3-enemies.md`・`K4-frozen-enemies.md`・`K4-cursed-enemies.md` を読む**（書き方・亜種の決まり・確認の方法・絵の指示文の形は同じ）。

前提: `src/content/scenarios/starCastle/` に `scenario.ts`・`map.ts`・`dungeons/`・`towns/`・`quests/`・`shrines/`・`events/`・`items/` がある（Claude が作成済み）。敵の組み合わせは**仮**（共通の敵）。この作業で本物に置き換える。

## 1. 世界観と戦い方

- 舞台は雲の上の王国。敵は「星のかけらに操られた天の生き物・時計仕掛けの兵・天使の像・月の獣」。
- **聖（holy）と闇（dark）、雷（thunder）が主役。** 天使系は闇が弱点・聖に耐性、闇の生き物（月の獣・影）は聖が弱点・闇に耐性、時計仕掛けは雷が弱点・毒に耐性。火と氷はあまり使わない。
- **夜に強い敵**: 月の獣と星のかけら系は夜に出やすい（組み合わせは `seaEncounters` のような夜専用の仕組みは無いので、地域の `encounters` に混ぜるだけでよい）。
- 状態異常: 脆弱・呪い・麻痺。凍結は使わない。数値は侵食の魔王の同じレベルの敵と同じ水準（難しめのまま）。

## 2. 作る28体

置き場所: `src/content/scenarios/starCastle/enemies/`。地域ごとに1ファイル（`harbor.ts`・`corridor.ts`・`hill.ts`・`garden.ts`・`castle.ts`）。

### 通常18体（うち亜種4）
| ID | 名前 | 地域 | Lv | メモ |
|---|---|---|---|---|
| `cloudSheep` | 雲羊 | 港 | 1 | やわらかい。突進。雷が弱点 |
| `skyGull` | 空カモメ | 港 | 2 | 2回攻撃。雷が弱点 |
| `windSprite` | 風の精 | 回廊 | 3 | 風で脆弱。雷に耐性 |
| `clockworkSoldier` | 時計仕掛けの兵 | 回廊 | 3 | 規則的な行動（sequence）。雷が弱点、毒に耐性 |
| `starJelly` | 星くらげ | 回廊 | 3 | 麻痺。闇が弱点 |
| `gearBeetle` | 歯車の甲虫 | 回廊・丘 | 3 | 硬い。雷が弱点 |
| `shootingStarBird` | 流れ星の鳥 | 丘 | 5 | 速い。聖属性の突進 |
| `moonRabbit` | 月のウサギ | 丘 | 5 | 呪いを付ける。聖が弱点、闇に耐性 |
| `angelStatue` | 天使の像 | 丘 | 5 | 反撃。闇が弱点、聖に耐性 |
| `starFragment` | 星のかけら | 丘 | 5 | 小さい。全体に小ダメージ。聖と闇の両方に耐性 |
| `moonWolf` | 月の狼 | 庭園 | 7 | 夜に強い（開幕に自分にブロック）。聖が弱点 |
| `thornFairy` | 茨の妖精 | 庭園 | 7 | 脆弱と毒。火が弱点 |
| `hourglassGolem` | 砂時計のゴーレム | 庭園 | 7 | HPが多い。行動を遅らせる |
| `skyKnight` | 空の騎士 | 前庭 | 9 | 槍の突撃。闇が弱点 |
| 亜種 `stormWindSprite` | 嵐の風の精 | 回廊 | 3 | `windSprite` の亜種。風を雷属性に。オーラ `storm` |
| 亜種 `shadowMoonRabbit` | 影のウサギ | 庭園 | 7 | `moonRabbit` の亜種。攻撃を闇属性に。オーラ `shadow` |
| 亜種 `holyAngelStatue` | 輝く天使の像 | 前庭 | 9 | `angelStatue` の亜種。攻撃を聖属性に。オーラ `holy` |
| 亜種 `venomThornFairy` | 毒茨の妖精 | 前庭 | 9 | `thornFairy` の亜種。毒を強く。オーラ `venom` |

（14体＋亜種4体＝18体）

### エリート6体（うち亜種1）
| ID | 名前 | 出る場所 | Lv | メモ |
|---|---|---|---|---|
| `windGuardianHawk` | 風の守りの鷹 | 回廊・風車の塔 | 5 | HP 約50。素早い。雷が弱点 |
| `starDustScribe` | 星屑の書記 | 丘・天文台 | 5 | HP 約55。脆弱と呪い。聖が弱点 |
| `clockworkKnight` | 時計仕掛けの騎士 | 庭園・天文台 | 8 | HP 約85。ブロックが高い。雷が弱点 |
| `moonGardener` | 月の庭師 | 庭園 | 8 | HP 約75。茨で全体攻撃 |
| `skyPaladin` | 空の聖騎士 | 前庭・天空城 | 9 | HP 約100。聖属性。闇が弱点 |
| 亜種 `shadowStarDustScribe` | 影の星屑の書記 | 天文台 | 5 | `starDustScribe` の亜種。属性を闇に。オーラ `shadow` |

### ボス4体（`phases` あり）
| ID | 名前 | 場所 | Lv | HP目安 | メモ |
|---|---|---|---|---|---|
| `windKeeper` | 風の番人 | 風車の塔 | 5 | 150 | 風で全体攻撃。50%以下で竜巻（ブロックと脆弱） |
| `starLibrarian` | 星の司書 | 星見の天文台 | 7 | 210 | 呪いと脆弱。50%以下で星の雨（全体攻撃） |
| `moonMaiden` | 月の乙女 | 月光の庭 | 9 | 270 | 月光（聖属性）と茨。50%以下で満月の力（全体強化） |
| `starSeerQueen` | 星読みの女王 | 天空城 | 11 | 400 | 3段階（100〜60% / 60〜30% / 30%以下）。未来を見る行動名（「予知」「星の涙」）。最後は流星群で全体攻撃 |

### 部品の使い方（Claude が追加済み。見本は `src/content/scenarios/cursedArchipelago/enemies/`）
- 反撃（`angelStatue`・亜種の `holyAngelStatue` も引き継ぐ）: `abilities: [{ name: '…', effect: { when: 'hurt', do: [{ kind: 'retaliate', amount: 3, perTurn: 2 }] } }]`。攻撃してきた相手にだけ返す。見本は貝の騎士 `conchKnight`。
- 行動を遅らせる（`hourglassGolem`）: 行動に `{ kind: 'applyStatus', status: 'delay', amount: 1 }`（状態異常「遅延」。次のターンに引くカードが1枚につき1枚減る・最大2・引いた時に消える）。凍結・痺れとは別。重ねすぎないよう1回1まで・全体（`to: 'foes'`）にはしない。

## 3. ダンジョンと地域に置く

- `dungeons/dungeons.ts` の `POOLS` を、ダンジョンごとの本物に分ける。風車の塔は回廊の敵と `windGuardianHawk`、`boss: ['windKeeper']`。星見の天文台は丘の敵と `starDustScribe`・`shadowStarDustScribe`・`clockworkKnight`、`boss: ['starLibrarian']`。月光の庭は庭園の敵と `moonGardener`、`boss: ['moonMaiden']`。天空城は前庭の敵と `skyPaladin`、`boss: ['starSeerQueen']`。`starDustCave`（ランダム）の `boss` は `['clockworkKnight', 'moonGardener']`。
- `map.ts` の `encounters` も本物に置き換える。組み合わせは2〜3体で、弱点が同じ敵だけにならないようにする。

## 4. 絵の指示文

`docs/art/prompts-enemies-starCastle.md` に書く（亜種は絵を使い回すので不要。**23体分**）。形は `K4-cursed-enemies.md` の §4 と同じ（`--sref` 付き。持たせない物は `--no`）。このシナリオの雰囲気: 夜空の紺と金、白い雲、淡い月光。天使の像は白い大理石と金の縁。時計仕掛けは真鍮と歯車。

## 5. 確認と報告

K4-frozen-enemies.md の §5 と同じ。自動プレイは `SIM_SCENARIO=starCastle` で、目安は侵食の魔王（2人85%・4人90%、40シード）に ±10 ポイント。
