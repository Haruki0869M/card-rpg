# 2〜7本目の「絵が仮・使い回し」の所の一覧（K4）

2〜7本目のシナリオを作った時点で、ゲームが絵を読む仕組みがあるのに、絵が無い（仮の色・別のシナリオの絵の使い回し・無い時の代わりの絵）所の一覧。指示文は、下の各文書にある。置き場所の名前（ゲームが読む名前）と、読み込みの1行が要る所は、各節に書いた。

絵の読み込みの決まり（`src/art/images.ts` が `src/assets/art/**` を自動で読む）: **ファイルを置くだけで使われる。** 無い絵は、仮の色や、別の絵（平原の背景など）が代わりに出る。

## 一覧（種類ごと）

| 種類 | ゲームが読む名前 | 今の状態（2〜7本目） | 指示文 | 枚数 |
|---|---|---|---|---|
| 敵（2本目 凍てつく王国） | `enemy/<敵ID>.webp` | 指示文あり（`prompts-enemies-frozenKingdom-mj.md`） | 既存 | 28体中23体 |
| 敵（3〜6本目） | `enemy/<敵ID>.webp` | Codex が作業書どおりに指示文を作る（`docs/tasks/K4-*-enemies.md`）。仮は頭文字の丸 | Codex | 各23体 |
| 敵（7本目 夢幻の大迷宮） | `enemy/<敵ID>.webp` | 新しい敵10体だけ（残り18体は絵の使い回し） | `prompts-enemies-dreamLabyrinth-mj.md` | 10体＋ボスの変身2枚 |
| 地形の模様（地図のマス） | `terrain/<地形ID>.webp`（256×256・つなぎ目なし） | 雪原・氷原・砂漠・雲の道・鉄の床・蒸気の地・海は、絵が無く色と小さな模様だけ | `prompts-k4-terrain-backgrounds.md` | 7 |
| 地形の戦闘の背景 | `bg/<ID>.webp`（600×1071） | 新しい名前（snow・desert・cloud・machine・sea）に切り替え済み。絵が無い間は平原の背景が出る | 同上 | 5 |
| シナリオ選択のカードの絵 | `bg/card-<シナリオID>.webp` | `art` が無いので、全シナリオが同じ「title」の絵 | 同上 | 6 |
| ダンジョンの部屋・戦闘の背景 | `bg/<ダンジョンID>.webp` | 別のシナリオの背景（temple・catacomb・volcano・castle・forestCave）の使い回し | 同上 | 24 |
| ダンジョンの通路（壁・床・天井・扉） | `dungeon/<ダンジョンID>-<wall/floor/ceiling/door>.webp` | 通路の絵があるのは temple・volcano・catacomb の3種だけ。castle・forestCave と2〜7本目の24ダンジョンは、仮の色 | `prompts-k4-dungeon-corridors.md` | 24×4 |
| ボスの門（通路の最後の扉） | `dungeon/<ダンジョンID>-bossdoor.webp` | 絵が無く、ふつうの扉を大きくした仮 | 同上（任意） | 6〜24 |
| 町・ダンジョン・名所・祠の地図の印 | `place/<town/capital/dungeon/shrine/landmark>.webp` | 全シナリオ共通の1枚ずつ | 今回は作らない（全シナリオ共通のまま） | — |
| 宝箱 | `chest/<rarity>.webp` | 共通 | 作らない | — |
| 装備のアイコン | `item/<アイコン名>.webp` | 固有装備は、既存のアイコン（axe・staff・dagger・bow・spear・scepter・robe・armor・charm・amulet・ring・crest）を使い回し | 作らない（共通のアイコンで足りる） | — |
| 突発イベント・イベントの絵 | （絵は無く、小さなアイコンだけ） | 文字と小さなアイコンのみ | 作らない | — |

## 読み込みの1行が要る所（絵ができて、組み込む時に Claude が足す）

絵のファイルを置く以外に、次の1行ずつが要る。**絵の担当は、これを意識しなくてよい。** 絵ができた旨を教えてくれれば、Claude が足す。

1. **ダンジョンの背景と通路の絵を使う**: 各ダンジョンのデータ（`src/content/scenarios/<シナリオ>/dungeons/dungeons.ts`）の `background` を、今の共通の名前（temple など）から、そのダンジョンのID（例: `crystalCave`）に変える。あわせて `src/components/dungeon/DungeonView.tsx` の `THEMES`（絵が無い時の仮の色）に、そのIDの色を1行足す。壁の絵の明るさは `scripts/art/build_art.py` が測って `src/art/dungeonTone.ts` に入る（暗い絵の扉を明るく縁取るため）。
2. **シナリオ選択のカード**: 各シナリオの `scenario.ts` に `art: 'card-<シナリオID>'` を1行足す。
3. **ボスの門**: `DungeonView.tsx` の `Door` が `dungeon/<背景>-bossdoor` を読む1行を足す（まとめて1回）。
4. **地形の模様**: 不要（置くだけ）。ただし、模様を絵にした地形は、地図の色の透かし（寒さ・暑さの色）が上に重なる。

## 優先順（提案）

絵の枚数が多いので、1本ずつ、次の順でお願いしたい（ゲームの見た目が大きく変わる順）。

1. 地形の模様 7枚と、地形の戦闘の背景 5枚（全シナリオで使う）
2. シナリオ選択のカード 6枚（選ぶ画面で最初に見える）
3. シナリオ1本ごとに: ダンジョンの通路 4ダンジョン×4枚と、部屋の背景 4枚（1本あたり20枚）
4. ボスの門（任意）

## 今ゲームに入っている同じ種類の絵（`--sref` の見本）

公開中のサイトの絵を指定する（`https://card-rpg-1aa60.web.app/assets/<ファイル名>`）。

| 種類 | ファイル名 |
|---|---|
| 背景（屋外・明るい） | `plains-D5W7nkmg.webp`・`forest-2rei72Bs.webp`・`swamp-DGime6ia.webp` |
| 背景（屋内・暗い） | `temple-B79emr75.webp`・`catacomb-Cxd4mSZo.webp` |
| 背景（暗く赤い） | `volcano-j3JEHGdk.webp`・`castle-RN32dFH7.webp` |
| 地形の模様 | `plains-CbkNqxRY.webp`・`hills-Bf3Klpzf.webp`・`mountain-wduJMFxj.webp`・`water-_dX7a-lt.webp` |
| 通路（壁） | `temple-wall-COJw7_FJ.webp`・`volcano-wall-BRB_XOpQ.webp`・`catacomb-wall-Dfv3RB6Z.webp` |
| 敵 | `forestWolf-Dm6xODDJ.webp`・`treeWarden-D5KJkVfD.webp` |

（ファイル名の最後の英数字は、絵の中身から決まる印。絵が変わっていたら、公開中のサイトで確認する。）
