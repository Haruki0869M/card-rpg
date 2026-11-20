# 絵の引き継ぎ書（次の端末の、絵のセッションへ・2026-11-20）

オーナーが開発の端末を変える。この文書は、前の端末の「絵と箱庭のセッション」が、**会話とメモ（リポジトリの外にあった物）のうち、絵に関わる事を全部ここに移した**物。
この文書と `docs/art/` の文書だけで、絵の続きができるように書いてある。**最初に最後まで読むこと。**

- 全体の引き継ぎ書は `docs/START-HERE.md`。絵のセッションも、まずそちらを読む（進め方の決まり・押さない事・重い確認の順番待ち）。
- 数は 2026-11-20 に、前の端末で実際に数えた。場所も実在を確かめた。「未確認」と書いた所は確かめていない。
- オーナーへの話は、日本語だけで、やさしく、結論から。決めていない事を自分で決めた時は「提案」と書いて、OK をもらってから作る。

---

## 1. できた物の一覧（ゲームが読む絵）

ゲームは `src/art/images.ts` が `src/assets/art/**/*.webp` を全部自動で読む。**ファイルを置くだけで使われる**（名前 = `<種類>/<ID>`）。

| 種類 | 置き場 | 数 | 作った道具 | メモ |
|---|---|---|---|---|
| 立ち絵（全身） | `hero/<職ID>-<male\|female>.webp` | 96（48職×男女） | 基本職16 = Midjourney（剣士・女だけ ChatGPT で作り直し）／転職の80 = ChatGPT | 「転職しても同じ人に見える」設計 `hero-lineage-design.md`。80枚の記録 `hero-lineage-status.json`（done 80 = 全部済み） |
| 顔 | `hero/<職ID>-<male\|female>-face.webp` | 96 | 立ち絵から切り出し（`build_art.py`） | |
| 駒（世界マップ） | `piece/<基本職ID>-<male\|female>.webp` | 16（基本職8×男女） | ChatGPT（案B「旅の姿」） | 転職しても基本職の駒を使う。武器を持たない。`prompts-chatgpt-pieces-travel.md` |
| 駒の台座と銘板 | `ui/piece-base.webp`・`piece-base-band.webp`・`piece-base-rim.webp`・`piece-plate-<base\|mid\|top\|special>.webp` | 7 | ChatGPT（2枚）＋コードで形を取り出し | `prompts-chatgpt-pedestal.md`。帯をプレイヤーの色、ふちを段の金属の色に染める |
| 画面の飾り | `ui/corner-*.webp`・`ornament-top`・`panel` | 6 | Midjourney（未確認。古い絵） | |
| お供 | `pet/<お供ID>-<色ID>.webp` | 48（12種×4色） | ChatGPT | `prompts-chatgpt-pets-pieces.md`。記録 `chatgpt-piece-status.json` の `petDone`（48 = 全部済み） |
| 敵 | `enemy/<敵ID>.webp`（変身の後 `-<段階>`） | 226 ファイル（そのうち変身の後の絵 35） | Midjourney | 敵 191 体（色違いを除く）は**全部**自分の絵がある（11/20 に数えた）。色違い 62 体は `variantOf` で元の敵の絵を借りる |
| 災厄（8体） | 自分の絵は**無い** | 0 | — | 今は `variantOf` で普通の敵の絵を借りている（例: 白狼王 → frostWolf）。指示文は `prompts-scourges.md`（下の §2） |
| 戦闘の背景 | `bg/<ID>.webp` | 47 | Midjourney | シナリオの札の絵 `card-<シナリオID>` 6枚を含む |
| ダンジョン | `dungeon/<テーマ>-<floor\|ceiling\|door\|bossdoor\|…>.webp` | 145（29テーマ×5） | Midjourney | `prompts-dungeon.md`・`prompts-k4-dungeon-corridors.md` |
| 宝箱 | `chest/<格>.webp` | 4 | Midjourney（未確認） | 開ける動画は `src/assets/video/chest-<格>.mp4`（4本） |
| 武器・道具のアイコン | `item/<アイコンID>.webp` | 26 | Midjourney | `prompts-weapon-icons.md`。駒の銘板の中の武器の絵もここを使う |
| 場所のアイコン | `place/*.webp` | 5 | 未確認 | |
| 地形の模様 | `terrain/<地形ID>.webp`（`road-path` を含む） | 19 | Midjourney／Mose（道の模様 `road-path` は Mose の R1） | 絵の無い地形は、ほかの絵を借りる（`landscape/paint.ts` の `TERRAIN_ART`: 湖の氷 → ice、暗礁・潮の水道 → sea、干潟 → desert） |
| 箱庭の部品（世界マップに立つ物） | `landscape/*.webp` | 81 | シナリオ1の分 = ChatGPT／シナリオ2〜7の分 = Mose／立て札・仮の地平線 = コードで作った | 下の表 |
| BGM | `src/assets/audio/bgm/*.aac` | 10 | OpenTracks の曲（オーナーの OK。音のセッションが入れた） | 元の MP3 とライセンスは `C:\dev\card-rpg-assets\bgm-original\README.md`。**元の MP3 は再配布しない** |
| 効果音・お供の声 | `src/assets/audio/sfx`・`pet` | 101・13 | 音のセッション（コードで作った・無料の素材） | 絵のセッションの持ち場ではない |

### 箱庭の部品（`landscape/`）の中身
| 群れ | 名前 | 作った道具 |
|---|---|---|
| 平原・森・山・小物 | `tree-*`・`prop-*`・`peak-*`・`tree-dead-*` | ChatGPT（`diorama-prompts-chatgpt.md`。元 `diorama\chatgpt\A〜F`） |
| 施設 | `place-*`（町・王都・祠・神殿・祭壇・ダンジョン・野営・橋・見張り台・商人・宝箱・最後の城 など 15） | ChatGPT（G1・G2）＋ Mose（D9） |
| 地平線 | `skyline-demon-castle`（シナリオ1と、表に無いシナリオ）・`skyline-snow-peak`（シナリオ2）・`skyline-wreck-haze`（シナリオ3の**仮**。難破船の部品をかすませた）・`skyline-great-tree`（**今どこからも使っていない**） | ChatGPT（H1・H2）／仮はコード |
| 侵食 | `blight-*` | ChatGPT（I） |
| シナリオ2〜7の土地 | `snow-*`・`ice-*`・`desert-*`・`swamp-*`・`volcano-*`・`machine-*`・`cloud-*`・`sea-*`（灯台・岩礁2・難破船） | Mose（D1〜D10。`prompts-diorama-mose.md`。記録 `diorama-mose-status.json` = 全部済み） |
| 印 | `spawn-*`（徘徊の敵の出る所など）・`sign-post`・`sign-board`（立て札。8方向に回す） | ChatGPT／立て札はコード（`make_signpost.py`） |

---

## 2. まだ無い物・作りかけ・作り直したい物

| 物 | 状態 | 指示文 | 次の一歩 |
|---|---|---|---|
| **災厄8体の絵**（強欲の盗賊王・瘴気を紡ぐ死霊術師・悪夢の魔獣・氷嵐の魔女・業火の魔人・白狼王・凍て鐘の亡霊・灯を喰らう影） | 指示文だけ。1枚も届いていない | `prompts-scourges.md` §1〜8（最初の姿 = Midjourney、第2形態 = その Midjourney の絵を添付して ChatGPT。オーナーの決定） | 届いたら `enemy/<災厄ID>.webp`（第2形態は `-1`）に置く。**今の作りでは、置いただけでは使われない**（`src/art/index.tsx` の `enemyImage`・`preloadEnemyPhases` が `artIdOf` = `variantOf` を先に見るため。11/20 にコードで確かめた）。自分の絵があればそれを先に使う直しが要る（`src/art/` は持ち場の外なので、主のセッションに言ってから） |
| シナリオ3の災厄3体（渦潮の大海魔・霧を吐く幽霊船・呪い金の亡者船長） | 設計がまだ（主のセッションがオーナーに聞いている最中） | 無い | 設計が決まってから、`prompts-scourges.md` に足す |
| 地平線: 呪われた群島 `skyline-ghost-ship` | 指示文あり。オーナーが ChatGPT で作るのを待っている | `prompts-scourges.md` の「地平線の目印」 | 届いたら `landscape/skyline-ghost-ship.webp` に置くだけ（`LandscapeLayer.tsx` の `SKYLINE_ART` が、仮より先に使う） |
| 地平線: 砂塵の王朝・星降る天空城・機械仕掛けの帝国 | 指示文あり。優先は低い（ゲームではかなり薄く出る） | 同上 | 届いたら置いて、`SKYLINE_ART` に1行足す。シナリオ7（夢の迷宮）の分はまだ指示文が無い |
| 湖の氷の地面 `terrain/lakeIce` | 指示文あり。今は氷原の絵を借りている（つやの線とひびはコードで描いている） | `prompts-scourges.md` の「湖の氷の地面」 | 届いたら置いて、`paint.ts` の `TERRAIN_ART` から `lakeIce` を消す |
| 潮の地形（暗礁・潮の水道・干潟）の自分の模様 | 頼んでいない。今は海・砂漠の絵を借りて、満ち引きの見た目はコードで描いている（`paint.ts` の `paintTide`） | 無い | 作るかどうかはオーナーと相談（提案の段階） |
| シナリオ4〜7の箱庭 | 部品は Mose で全部ある。シナリオ4〜7の作り直し（主のセッション）の時に、新しい地図に合わせて置き方を直す | — | シナリオ2・3と同じく、主のセッションから頼まれたら |

### `*-status.json` の読み方
- どれも「オーナーが作って、Claude が素材にし終わった物」の一覧。ファイル名の ID が `done` にあれば済み。
- `hero-lineage-status.json`: 転職の立ち絵80枚。`done` が 80 = **全部済み**。
- `diorama-mose-status.json`: Mose の箱庭の部品 D1〜D10・道の模様 R1。**全部済み**。
- `chatgpt-piece-status.json`:
  - `petDone` 48 = お供は**全部済み**。
  - `done` 27・`redo` 18 は、**前の案（全部のジョブの駒を、武器を持たせて作る）の記録で、今は使わない**。2026-11-14 に「駒は基本職16人分だけ」と決まり、旅の姿の16枚に置きかえた。`redo` の物は作らなくて良い。

---

## 3. オーナーが決めた事（日付順）

| 日付 | 決めた事 |
|---|---|
| 11/10 | 世界マップの箱庭の部品は ChatGPT でまとめて作る。絵柄は「墨の線＋やわらかい水彩」（見本 `C:\dev\card-rpg-assets\diorama\chatgpt\try-tree.png`・`try-town.png`）。前の Midjourney 用の箱庭の指示文（`diorama-prompts.md`）は使わない |
| 11/12 | 立ち絵は Midjourney（同じ `--sref`）。お供・駒・箱庭の部品（デフォルメした方が良い物）は ChatGPT。駒は「ちびキャラ」をやめ、チェスの駒のような立体感のあるミニチュアに。お供48枚・駒を ChatGPT で全部作り直す（試しの3枚が合格） |
| 11/13 | 転職しても同じ人に見える立ち絵（`hero-lineage-design.md` §5）。中位は表情だけ、最上位・特殊は少し大人びる。先に剣士と僧侶の系統 |
| 11/14 | 剣士・女を新しい人物（赤橙のポニーテール・小さな毛皮の肩掛け・黒い胸当て）にした。**駒は基本職の16人分だけ。転職しても基本職の駒を使う**。ChatGPT が止まっている間は Mose で作る |
| 11/14 | 絵は ChatGPT。使えない時は Mose。**Gemini に絵は頼まない** |
| 11/15 | 駒は**案B「旅の姿」**（武器を持たない・おそろいの短いマント・水晶のブローチ・腰のかばん）で16枚。オーナーの言葉:「お試しで作ったら結構良かったので、Bで全て作った」 |
| 11/15 | 狩人・女は**2本の三つ編み**（「狩人は三つ編みだよね」） |
| 11/15 | 台座をしっかり作る: 台座の本体＋前の銘板＋段が上がるほど豪華（基本 = 銅・中位 = 銀・最上位 = 金・特殊 = 紫の水晶）。銘板の中は今のジョブの得意な武器のアイコン。側面の帯 = プレイヤーの色 |
| 11/15 | 台座は**薄い方**。高くした版を見た後で「ごめんやっぱり薄い方を採用して」（`build_pedestal.py` の `TALL` は 1.0） |
| 11/15 | 町の名前の札は、駒がいる時は駒の上に出す（案B） |
| 11/16 | 街道の描き直し（幅・3層・行き止まりを丸めない）は「一旦OK 気になったらまた言う」。立て札は「角度もこれでよい」 |
| 11/16 | 新しい敵の絵は Midjourney。第2形態以降は、その Midjourney の絵を添付して ChatGPT で作る |
| いつも | お供は特に大切に（オーナーのパートナーが動物好き。特にオカメインコ）。可愛さと愛着を最優先。音は静かでやわらかく |
| いつも | お金のかかる道具・サービスは増やさない |

### 見送った案と理由
- 駒の案A（武器を外すだけ・服はそのまま）: 案B の方が、転職しても違和感が少なかったため（オーナーが見比べて B）。
- 駒の案C（台座に今のジョブの札）を**絵**で作る案: 札はジョブが変わるたびに変わるので、プログラムで描く事にした。その後、11/15 の台座の作り直しで「銘板に武器のアイコン」として入った。
- 全部のジョブの駒を作る案（武器を持たせた 96 枚）: 転職のたびに駒が別人に見えるので、基本職16人に絞った（11/14）。
- 台座を高くする案: オーナーが見て、薄い方を選んだ（11/15）。
- カード1枚ずつの専用の絵: 見送り（属性・種類ごとの絵を使い回す。`CLAUDE.md` §4）。
- 箱庭の Midjourney 版（`diorama-prompts.md`）: 箱庭の設計が変わり、ChatGPT 版に置きかえた。

---

## 4. 作り方の手順

### 4-1. いつもの流れ
1. **指示文を書く**（`docs/art/prompts-*.md`）。日本語で良い（ChatGPT・Mose は日本語で通じ、オーナーが読んで直せる）。必ず書く事: 持つ物・持たせない物、背景は透明（できなければ真っ白の無地。**市松模様は描かない**）、大きさ、絵柄の見本の添付。
2. **オーナーが作る**（ChatGPT／Mose／Midjourney）。新しいチャットで1枚ずつ、10枚ごとくらいにチャットを新しくする（絵柄がずれやすい）。
3. **元の画像を置く**: `C:\dev\card-rpg-assets\<フォルダ>\`（§5 の表）。保存の名前は指示文に書いた名前。
4. **切り抜き・縮小**: `scripts/art/` のスクリプト（下の表）。Python は `py`（Windows）。要る物: `pip install "rembg[cpu]" opencv-python-headless pillow numpy`。
5. **素材の置き場**: `src/assets/art/<種類>/<ID>.webp`。置くだけでゲームが読む。
6. **写真で確かめる**: ビルドして `npx vite preview` で見る（`scripts/small-screen.mjs` など。重い確認は `node scripts/tools/heavy.mjs` で順番待ち。**見終わったら preview のサーバーをすぐ止める**）。
7. コミットして、主のセッションに知らせる（**push しない・公開しない**）。

### 4-2. スクリプトの使い方
| スクリプト | 何をする | 使い方 |
|---|---|---|
| `build_art.py` | Midjourney／ChatGPT の元の画像の背景を消し（rembg）、余白を切り、大きさをそろえて webp にする。立ち絵・顔・敵・駒・お供・武器のアイコン | `SRC=<元のフォルダ> py scripts/art/build_art.py [名前の一部…]`。切り抜きは `<SRC>/.cut/` に作り置き（消せば作り直す） |
| `build_k4_art.py` | シナリオ2〜7の背景・ダンジョン・地形（切り抜き無し） | `SRC=<元のフォルダ> py scripts/art/build_k4_art.py [名前の一部…]` |
| `precut_pieces.py` | ChatGPT の駒の背景（透明・真っ黒・市松模様の絵の3通り）を先に消して、`build_art.py` の作り置きに置く | `py scripts/art/precut_pieces.py <SRC>`（`<SRC>/piece/*.png`）→ その後 `SRC=<SRC> py scripts/art/build_art.py piece/` |
| `build_pedestal.py` | 台座と銘板 | `py scripts/art/build_pedestal.py C:/dev/card-rpg-assets/chatgpt-pedestal`。出てくる「上面のだ円の寸法」を `HeroPiece.tsx` の `BASE_ART` に写す |
| `split_diorama.py` | 箱庭の部品（白い背景に物が並んだ1枚）を1つずつに切り分ける | `py scripts/art/split_diorama.py <元の絵> <大きさpx> <名前1> <名前2> …`（上の段の左から。`-` を付けた名前は捨てる） |
| `make_skyline_from_sprite.py` | 部品の絵から、かすんだ仮の地平線を作る | `py scripts/art/make_skyline_from_sprite.py sea-wreck skyline-wreck-haze 150,165,190` |
| `make_signpost.py` | 立て札の柱と板を、今の看板の絵から取り出す | 引数なし |
| `checker_cut.py` | 絵に描きこまれた市松模様（透明のふり）を消す | ファイルの先頭を読む |
| `fix_thin_cut.py` | 細い槍などが薄くなった切り抜きを直す | `py scripts/art/fix_thin_cut.py <元のフォルダ> <名前> [広げるpx] [しきい値]`（先に `build_art.py` を1回） |
| `fill-holes.mjs` | 切り抜きで体の中に穴があいた絵を直す（Node＋ffmpeg） | `node scripts/art/fill-holes.mjs [--src …] [--cache …] [--dry] [名前の一部…]` |

### 4-3. つまずいた所
- ChatGPT は「透明の背景」と頼んでも、**市松模様を絵として描きこむ**事がある → `precut_pieces.py`／`checker_cut.py`。真っ黒の背景で来る事もある。
- 光のもやが描きこまれた台座は、色だけでは切れない → rembg（`isnet-general-use`）で台座だけにした。
- 台座の金のふちの形を色で取る時、上面の木（赤茶）が入りやすい → 緑の少ない赤茶を除いた。
- 銘板の武器のアイコンがはみ出した → 銘板の形で切り（clipPath）、アイコンを小さくした。
- Python をコマンドの中に直接書くと、引用符で壊れやすい → スクリプトをファイルに書いてから動かす。
- 新しい地図では、町のすぐとなりに海が無い事がある → 灯台は「町から2マス以内の海か暗礁」に立てる（`scatter.ts`）。
- 箱庭の部品の絵は、置き方（`scatter.ts`）と大きさ（`sprites.ts` の `ART_SCALE`）を足さないと地図に出ない。

---

## 5. リポジトリの外にある物（`C:\dev\card-rpg-assets`）

11/20 に数えて**約2.1GB**。ゲームが使う素材は全部リポジトリの `src/assets/` に入っているので、**このフォルダが無くても、ゲームとコードの作業は続けられる**。要るのは、絵を切り直す・作り直す時だけ。
`.cut`（rembg の切り抜きの作り置き。合わせて約390MB）は、どれも消して良い（スクリプトが作り直す）。

| フォルダ | 中身 | 元の画像か |
|---|---|---|
| `chatgpt-hero-lineage/new/` | 転職の立ち絵80枚（＋1）の元（ChatGPT） | **元**（要る） |
| `chatgpt-hero-lineage/new-base/` | 剣士・女の新しい元（`43.png`） | **元**（要る） |
| `chatgpt-hero-lineage/`（直下）・`chatgpt-hero-lineage-hq/` | ChatGPT に添付した「人物」の見本（hq は高画質の写しと jpg） | 添付用。ゲームの立ち絵から作り直せる |
| `chatgpt-pieces-travel/piece/` | 今の駒16枚の元（旅の姿） | **元**（要る） |
| `chatgpt-pieces/piece/`・`piece-weapon/` | 前の、武器を持った駒の元（使っていない） | 元だが、今は使わない |
| `chatgpt-piece-refs/` | 駒を頼む時に添付した立ち絵 | 添付用 |
| `chatgpt-pedestal/` | 台座・銘板の元（2枚） | **元**（要る） |
| `chatgpt-pets/` | お供48枚の元 | **元**（要る） |
| `diorama/chatgpt/`・`diorama/mose/` | 箱庭の部品の元（A〜I・try-tree・try-town／D1〜D10・R1） | **元**（要る。絵柄の見本もここ） |
| `enemy/`（`_hold` を含む） | 敵の元（Midjourney）。`_corner-text.txt` はメモ | **元**（要る） |
| `dungeon/`・`bg/`（`_hold`・`_notes.txt` を含む） | ダンジョン・背景の元（Midjourney）。`bg/_notes.txt` に直したい所のメモ | **元**（要る） |
| `j4/`（`piece`・`piece-trial1`） | 基本職の立ち絵ほか（Midjourney・J4 の時）。駒の古い試し | **元**（立ち絵は要る。駒の試しは不要） |
| `new-jobs/` | 新ジョブ4職の立ち絵の元（Midjourney） | **元**（要る） |
| `terrain/` | 地形の模様の元7枚 | **元**（要る） |
| `chest-video/` | 宝箱の動画の元（mp4 4本） | **元**（要る） |
| `bgm-original/` | BGM の元の MP3 と出どころ・ライセンス（`README.md`） | **元**。再配布しない |
| `chatgpt-trial/`・`chibi-pieces/` | 前の試し（見比べの写真など） | 不要 |

**新しい端末に運ぶ最低限（提案）**: 上の表で「**元**（要る）」の物。`.cut`・添付用・試し・前の駒は運ばなくて良い。全部運べるなら、全部が一番安心（AI で作った絵は、同じ物を二度と作れない）。

---

## 6. コードの持ち場（絵のセッション）

主のセッションと決めた持ち場: `src/components/world/landscape/`・`src/components/world/HeroPiece.tsx`・`src/assets/art/`。
`WorldMap.tsx`・`WorldScreen.tsx` はほかの作業者も触るので、**触る前に主のセッションに言う**。`src/content/` は読むだけ。

| ファイル | 役目 |
|---|---|
| `landscape/LandscapeLayer.tsx` | 地面の絵（canvas）を描く層。潮の今を見て描き直す。地平線の表 `SKYLINE_ART`。確認用の透明なマスの層 `HexShapes` |
| `landscape/paint.ts`・`paint.worker.ts` | 地形の塗り・模様・街道（3層・先細りの行き止まり・施設の広場）・湖の氷・潮の地形（`paintTide`）。重いので worker でも描く |
| `landscape/scatter.ts` | マスごとに立てる物（木・岩・山・灯台・岩礁・難破船…）を、ハッシュで決める（乱数は使わない） |
| `landscape/sprites.ts` | 部品の名前 → 絵（`ART`）・大きさ（`ART_SCALE`）・絵が無い時の代わりの描き方 |
| `world/diorama.ts` | 地形の高さ（`LEVEL`）・街道のつながり（`roadLinks`） |
| `world/DepthFront.tsx` | 駒より手前の木・山を、駒の上にもう一度描く（奥行き）。駒が立つマスの山は描き直さない（`ownMountain`） |
| `world/HeroPiece.tsx` | 駒と台座（`BASE_ART`・段の金属 `TIER_METAL`・`pedestalLook`） |
| `world/ExploreMarks.tsx` | 立て札（柱＋回る板、8方向） |
| `world/WorldMap.tsx` の一部（主のセッションに言ってから触った所） | 町の名前の札の位置・夜の町の明かり（`LitTowns`）・道のマスの行ける所の色・暖かさの ♨ |

### 主のセッションと決めた事
- **賢い検証 bot のためのマスの印（2026-11-18・オーナーの OK「2A」）**: `HexShapes` の見えているマス（`data-hex`）に、`data-terrain`（地形の id）・`data-road`（道のマスだけ）・`data-tide`（潮で開く地形だけ。**そのマスが開く潮** = 潮の水道 `high`・干潟 `low`。今の潮ではない。暗礁は付かない）。**霧のマスには付けない**。見た目は変えない。テスト `landscape/hexShapes.test.ts`。この印を消したり名前を変えたりしない。
- 入り江・盆地（潮で閉じても中からは出られる）に、見た目の印は付けない。決まりはマスの説明の文で伝える（主のセッションの持ち場）。
- 前の端末の絵のブランチ `claude/art-gen-9b438c` は、全部 main に統合済み。

---

## 7. 次にやる予定だった事（順番つき）

1. **オーナーの返事待ち**: 幽霊船の地平線（ChatGPT）→ 届いたら置くだけ。
2. **オーナーの返事待ち**: 災厄8体の絵（Midjourney＋ChatGPT）→ 届いたら置き、自分の絵を先に使うように直す（§2。主のセッションに言ってから）。
3. シナリオ3の災厄3体の設計が決まったら、その指示文を書く。
4. 湖の氷の地面（ChatGPT）→ 届いたら置いて `TERRAIN_ART` から外す。
5. **オーナーに聞く**（主のセッションが「先に聞く」と言った）: 4人の時に段の金属の違いが見分けられるか・低い画面で銘板のアイコンが小さすぎないか。
6. シナリオ4〜7の作り直しに合わせて、箱庭の置き方・地平線を直す（主のセッションから頼まれたら）。
7. 世界マップの奥行きの重なりの直し（オーナーが「後で」と言った。全体の宿題でもある）。

## 8. 確かめていない事
- 夜・夕方の色（町の明かり・潮の砂）を、スマホの実機で見ていない。
- シナリオ3の仮の地平線は、写真では霧に隠れて見えなかった。
- 表の「未確認」の所（画面の飾り・宝箱・場所のアイコンを何で作ったか）。
- `skyline-great-tree` がどこからも使われていない理由（前の案で使っていた物か）。
- 運ぶフォルダの「要る・要らない」は、絵のセッションの見立て。消す前にオーナーに聞く。
