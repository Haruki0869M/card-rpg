# K4 作業書：夢幻の大迷宮（総集編）敵28体と絵の指示文（Codex 向け）

シナリオ7「夢幻の大迷宮」の敵を作る。**この作業は、1〜6本目の敵がすべて入ってから始める**（過去の敵を再登場させるため）。先に `docs/tasks/K3-enemies.md`・`K4-frozen-enemies.md`・`K4-cursed-enemies.md` を読む（書き方・亜種の決まり・確認の方法・絵の指示文の形は同じ）。

前提: `src/content/scenarios/dreamLabyrinth/` に `scenario.ts`・`map.ts`・`dungeons/`・`towns/`・`quests/`・`shrines/`・`events/`・`items/` がある（Claude が作成済み）。敵の組み合わせは**仮**（共通の敵）。この作業で本物に置き換える。

## 1. 総集編の方針（オーナー承認済み）

- 28体のうち、**18体は過去のシナリオの敵の「夢の再来」**。`makeVariant`（`src/data/enemyVariant.ts`）で、元の敵から作り、**絵は元の敵のものを使い回す**。新しく絵を描く敵は**10体**だけ。
- **亜種「2割まで」の決まりは、このシナリオの再来には適用しない**（オーナー承認済みの例外）。`k2k3Foundation.test.ts` の検査は、`dreamLabyrinth` の再来を数えないように直してよい（どう直したかを報告に書く）。ただし、再来も「属性か開幕の特性を必ず1つ変える」「オーラの色を属性に合わせる」「亜種の亜種は作らない」の決まりは守る。
- 再来の敵は、夢らしく**少し強い**（元の敵と同じ `baseLevel` で、HP+10%・行動のダメージ+1 くらい）。名前は「夢の」を付ける（例: 夢の雪狼）。
- 数値は侵食の魔王の同じレベルの敵と同じ水準（難しめのまま）。

## 2. 作る28体

置き場所: `src/content/scenarios/dreamLabyrinth/enemies/`。地域ごとに1ファイル（`meadow.ts`・`forest.ts`・`ice.ts`・`sand.ts`・`sky.ts`・`core.ts`）。

### 新しい敵（絵を描く）10体
| ID | 名前 | 種類 | Lv | メモ |
|---|---|---|---|---|
| `nightmareMote` | 悪夢の綿毛 | 通常 | 1 | ふわふわ。眠気（脆弱）を付ける。聖が弱点 |
| `sleepwalker` | 夢遊病者 | 通常 | 3 | 目を閉じて歩く人。ふらふらの攻撃。闇に耐性 |
| `pillowGolem` | 枕のゴーレム | 通常 | 5 | 柔らかく、HPが多い。火が弱点 |
| `lullabyBird` | 子守歌の鳥 | 通常 | 5 | 歌で味方を癒やす。雷が弱点 |
| `shadowChild` | 影の子 | 通常 | 7 | 小さな影。呪い。聖が弱点、闇に耐性 |
| `lostMemory` | 迷子の記憶 | 通常 | 8 | 半透明の幽霊。聖が弱点。ブロックを無視する攻撃 |
| `mirrorKnight` | 鏡の騎士 | エリート | 7 | HP 約85。受けた属性を返す（反撃） |
| `dreamWeaver` | 夢織り | エリート | 8 | HP 約75。眠気と呪い。聖が弱点 |
| `memoryEater` | 記憶喰い | エリート | 10 | HP 約110。味方のフォーカスを奪う |
| `dreamEater` | 夢喰い | ボス | 12 | HP 約450。3段階（100〜60% / 60〜30% / 30%以下）。「食べる」「忘れさせる」「思い出す」など物語を行動名に。最後は全員の記憶（フォーカス）を奪う大技 |

### 夢の再来（絵は使い回す）18体
元の敵のIDから、`makeVariant` で作る。IDは `echo` + 元のID（頭文字を大文字）にする（例: `echoFrostWolf`）。

| 元の敵 | 元のシナリオ | 再来の名前 | 変える所（例） |
|---|---|---|---|
| `forestWolf` | 侵食の魔王 | 夢の森の狼 | 噛みつきを闇属性に。オーラ `shadow` |
| `bogGhoul` | 侵食の魔王 | 夢の沼の亡者 | 攻撃を聖属性に。オーラ `holy` |
| `frostWolf` | 凍てつく王国 | 夢の雪狼 | 噛みつきを闇属性に。オーラ `shadow` |
| `iceSwordsman` | 凍てつく王国 | 夢の氷の剣士 | 剣を雷属性に。オーラ `storm` |
| `shark` | 呪われた群島 | 夢の鮫 | 牙に毒。オーラ `venom` |
| `drownedSailor` | 呪われた群島 | 夢の溺れた水夫 | 攻撃を氷属性に。オーラ `frost` |
| `mummy` | 砂塵の王朝 | 夢のミイラ | 攻撃を火属性に。オーラ `ember` |
| `sandScorpion` | 砂塵の王朝 | 夢の砂蠍 | 尾を雷属性に。オーラ `storm` |
| `angelStatue` | 星降る天空城 | 夢の天使の像 | 攻撃を闇属性に。オーラ `shadow` |
| `moonRabbit` | 星降る天空城 | 夢の月ウサギ | 開幕にブロック。オーラ `iron` |
| `conveyorBot` | 機械仕掛けの帝国 | 夢の機械兵 | 攻撃を氷属性に。オーラ `frost` |
| `wrenchGolem` | 機械仕掛けの帝国 | 夢のスパナのゴーレム | 開幕に自分にブロックと反撃。オーラ `iron` |
| `iceKnight`（エリート） | 凍てつく王国 | 夢の氷の騎士 | 剣を闇属性に。オーラ `shadow` |
| `seaWitch`（エリート） | 呪われた群島 | 夢の海の魔女 | 呪いの代わりに火傷。オーラ `ember` |
| `colossusStatue`（エリート） | 砂塵の王朝 | 夢の石像の巨兵 | 攻撃を聖属性に。オーラ `holy` |
| `whiteQueen`（ボス） | 凍てつく王国 | 夢の白の女王 | 2段階。氷の技に闇属性を足す。最後は「吹雪の涙」 |
| `sandPharaoh`（ボス） | 砂塵の王朝 | 夢の砂塵の王 | 2段階。砂嵐に毒を足す。最後は「永遠の砂」 |
| `ghostAdmiral`（ボス） | 呪われた群島 | 夢の亡霊提督 | 2段階。大砲に雷を足す。最後は「婚礼の鐘」 |

（通常12＋エリート3＋ボス3＝18体。新しい10体と合わせて28体。内訳: 通常18・エリート6・ボス4）

再来のボスは**元のボスの絵を使い回す**（第2段階の絵もそのまま）。新しい敵の元IDが、他のシナリオの作業中に変わっていたら、いまのIDに合わせる。

## 3. ダンジョンと地域に置く

- `dungeons/dungeons.ts` の `POOLS` を本物に分ける。氷の記憶の洞は氷・森の敵と `echoIceKnight`、`boss: ['echoWhiteQueen']`。砂の幻影の墓は砂・機械の敵と `echoColossusStatue`・`mirrorKnight`、`boss: ['echoSandPharaoh']`。幽霊船の悪夢は海・星の敵と `echoSeaWitch`・`dreamWeaver`、`boss: ['echoGhostAdmiral']`。夢喰いの巣は夢の敵と `memoryEater`、`boss: ['dreamEater']`。`dreamCave`（ランダム）の `boss` は `['mirrorKnight', 'memoryEater']`。
- `map.ts` の `encounters` も本物に置き換える。地域ごとに、その世界の再来の敵と新しい夢の敵を混ぜる。組み合わせは2〜3体で、弱点が同じ敵だけにならないようにする。

## 4. 絵の指示文

`docs/art/prompts-enemies-dreamLabyrinth.md` に書く。**新しい敵の10体分だけ**（再来は絵を使い回す。ボス `dreamEater` は段階ごとの姿も書く）。形は `K4-cursed-enemies.md` の §4 と同じ（`--sref` 付き。持たせない物は `--no`）。このシナリオの雰囲気: 淡い紫と紺、ぼやけた輪郭、星のような小さな光。

## 5. 確認と報告

K4-frozen-enemies.md の §5 と同じ。自動プレイは `SIM_SCENARIO=dreamLabyrinth` で、目安は侵食の魔王（2人85%・4人90%、40シード）に ±10 ポイント。報告には、亜種の検査をどう直したかも書く。
