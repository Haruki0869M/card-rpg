# 立ち絵（40職×男女）とお供（12種×4色）の Midjourney 指示文（J4）

この文書は、まだ絵が無いキャラの**立ち絵 80枚**と、**お供 48枚**を Midjourney で作るための指示文の一覧です。
最後に、組み込みの手順と、できたかどうかの確認表があります。

- 立ち絵が既にある8枚（剣士・守護者・魔道士・狩人の男女）は作りません。
- ワールドマップの駒（ミニチュア）の指示文は別の文書 [prompts-pieces.md](./prompts-pieces.md) にあります。
- 武器と服のデータは `src/content/common/classes/*.ts`・`src/content/common/items/*.ts` から写しました（2026-11-08 時点）。データを変えたら、この文書も直してください。

## 決めたこと（オーナーの OK 済み・2026-11-08）

| | 決めたこと |
|---|---|
| A | 立ち絵は、**今ゲームに入っている8枚**（細かく描き込んだ手描き風のファンタジー画）に合わせる。指示文の `--sref` で、公開中の今の立ち絵2枚を参照する。お供はちびキャラ風。 |
| B | 顔の絵は立ち絵から切り出す（今の仕組み）。顔だけの指示文は作らない。 |
| C | 最上位13職は、元の中位の職の「最初の武器」をデータの上で引き継いでいる（例: 剣聖＝銅の剣）。それを持たせる。得意な武器の種類とも一致する。 |
| D | お供の絵を読み込むコードは今回作らない。置き場所の名前だけ決める（`src/assets/art/pet/<お供ID>-<色ID>.webp`）。 |
| E | 最上位の職は、武器は最初の武器のまま、**服と飾りを中位より立派に**して見分けやすくする。 |
| F | 盾を持たせるのは、守護者の系統の**聖騎士・聖王だけ**（今の守護者の絵が盾を持っているため）。暗黒騎士を含め、ほかの職は盾なし。 |
| G | 元画像は番号ではなく**名前**で置く（例 `monk-male.png`・`pet-cockatiel-normal.png`）。番号が重ならない。 |

## 共通の決まり

### 立ち絵
- 全身・やや斜め前（3/4）・**無地の明るい背景**（切り抜きやすくするため）・縦長 `--ar 2:3`。
- 大人になりたての若い男女。今の8枚と同じく、落ち着いた色合いに細かい刺繍。
- **持たせる武器は、ゲームの最初の武器と同じ**。各職の「最初の武器」に書いた物だけを持たせます。
- **持たせない物は `--no` に書く。** Midjourney は文の中に「no shield」と書くと、かえって盾を描くことがあります。そのため、持たせない物は最後の `--no` の後ろにまとめました。

### 作風の参照（`--sref`）について
- **立ち絵の指示文には、お手本の URL が最初から入っています。** 公開中のゲーム（Firebase Hosting）にある今の立ち絵2枚（狩人・男、守護者・女）です。
  - `https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp`
  - `https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp`
- そのため、**画面の「Style References」には何も入れません**（入れてあれば ✕ で外します）。画面に入れたままだと、お供にもリアルな作風が付いてしまいます。
- お供の指示文には `--sref` がありません。そのまま貼れば、ちびキャラ風になります。
- 作風が強すぎる・弱すぎる時は、指示文の最後に `--sw 100`（ふつう）〜`--sw 300`（強め）を足して調整します。
- URL の末尾の英数字は、絵の中身から作られます。今の2枚の絵を描き直さない限り変わりません。描き直して公開し直した時は、この URL を新しいものに直します。
- お手本の狩人が矢筒、守護者が槍と盾を持っているため、その職でない立ち絵には `--no` に「bow, arrows, quiver, spear, shield」を入れて、まねされないようにしています（1回目の試しで、召喚士に矢筒が付いたため）。

### お供
- **小さくても分かるデフォルメ（ちびキャラ風）**。正方形 `--ar 1:1`・白い背景。
- 鳥（オカメインコ・文鳥・セキセイインコ・シマエナガ・フクロウ）は肩に乗るので、止まり木に止まる姿勢。小竜は宙に浮く。ほかは地面に座る。
- **リボンとハートは描かない**。懐き度♡3・♡5の印はゲームが付けます。首輪などの飾りも付けません。
- 色違いは色ごとに1枚。データの色（`pets.ts` の `colors`）の名前に合わせました。
- **オカメインコと文鳥を見分けやすくする**ため、オカメインコには「高い冠羽・オレンジのほっぺ」を、文鳥には「お餅のような丸い体・太いピンクのくちばし・赤い目の輪・冠羽なし」を必ず入れています。

## 試す順番（おすすめ）

1. **立ち絵を2枚**: 武闘家・女（素手の職）、召喚士・男（本を持つ職）。今の8枚と並べて、作風・大きさ・武器が合うかを見ます。
2. **お供を2枚**: オカメインコ（ノーマル）と文鳥（白）。小さく表示しても見分けられるかを見ます。
3. 見え方に合わせて、共通の部分（作風の言葉・`--sw` など）をこの文書で直してから、残りをまとめて作ります。

**1回目の試しの結果（2026-11-08）**: 武闘家・女は合格（作風・素手ともに良い）。召喚士・男は本は良いが、お手本の狩人の矢筒が付いた → `--no` に弓・矢・矢筒・槍・盾を追加。お供2枚は、画面の Style References を入れたまま作ったためリアル寄りになった → お手本は指示文の `--sref` だけで指定する形に変更。オカメインコ（ノーマル）は白っぽくなった → 「濃い灰色の体」を強めた。オカメインコと文鳥は、はっきり見分けられた。

**2回目の試しの結果（2026-11-08）**: 召喚士・男は矢筒が消えて合格に近いが、女性にも見えた → 男の立ち絵40本に「masculine face」を追加。オカメインコ（ノーマル）は `--sref` 無しでちびキャラ風になったが、ほぼ黒になった → 「soft medium gray」に変更。

**3回目の試しの結果（2026-11-08）**: 召喚士・男は髪が短くなり男性に見えるようになったが、本を2冊持った → 本の職5つ（召喚士・幻獣使い・幻獣王・時魔道士・占星術師）を「a single」にし、`--no` に second book を追加。オカメインコ（ノーマル）はまだ黒っぽい → オカメインコの灰色の3色を「light silver-gray」にし、`--no` に black feathers を追加。

**4回目の試しの結果（2026-11-08）**: 召喚士・男は本が1冊・男性に見えて**合格**。オカメインコ（ノーマル）は明るい灰色のちびキャラになり**合格**。これで指示文の作り方は決まり。残りは下の「組み込みの手順」の進め方でまとめて作る。

## 立ち絵の指示文（80本）

- 見方: 「最初の武器」はゲームの最初の武器の名前（`items/*.ts` の ID）。「持たせない物」は `--no` に入れてあります。
- 最上位・特殊の職は、元の職の最初の武器・服を引き継いでいます（特殊職は自分の得意な武器に変わる職があります）。

### 基本（残り4職・8枚）

#### 武闘家（`monk`）
- 元の職: —　／　最初の武器: **布の手甲（両手の拳に巻いた布。手には何も持たない）**（`clothWraps`）　／　服: 旅人の服　／　色: 橙
- 見た目: 橙の道着・黒い帯・素手
- 持たせない物: 武器全般（剣・杖・棒・爪）、盾、金属の籠手

男 → 元画像 `monk-male.png`

```
full body character illustration of a young adult male martial artist, masculine face, short spiky black hair, orange sleeveless martial arts gi with a dark sash, bandaged forearms, cloth shoes, both fists wrapped in worn cloth hand wraps, bare hands, orange as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, staff, pole, claws, metal gauntlets, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `monk-female.png`

```
full body character illustration of a young adult female martial artist, black hair in two round buns, orange sleeveless martial arts gi with a dark sash, bandaged forearms, cloth shoes, both fists wrapped in worn cloth hand wraps, bare hands, orange as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, staff, pole, claws, metal gauntlets, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 盗賊（`thief`）
- 元の職: —　／　最初の武器: **古びた短剣（1本だけ）**（`rustyDagger`）　／　服: 旅人の服　／　色: 薄い緑（ミント）
- 見た目: ミント色のフード付き短いマント・革のベスト
- 持たせない物: 2本目の短剣、剣、弓、盾

男 → 元画像 `thief-male.png`

```
full body character illustration of a young adult male nimble thief, masculine face, messy brown hair, mint green hooded short cloak, fitted leather vest, belts with small pouches, holding a single worn short dagger with a slightly chipped blade, mint green as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no second dagger, sword, bow, shield, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `thief-female.png`

```
full body character illustration of a young adult female nimble thief, short ash-blonde bob hair, mint green hooded short cloak, fitted leather vest, belts with small pouches, holding a single worn short dagger with a slightly chipped blade, mint green as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no second dagger, sword, bow, shield, arrows, quiver, spear, text, watermark, scenery
```

#### 僧侶（`priest`）
- 元の職: —　／　最初の武器: **木の錫杖（先に小さな鈴が付いた祈りの杖）**（`woodScepter`）　／　服: 旅人の服　／　色: 淡い黄（クリーム）
- 見た目: 白と淡い金の法衣・鈴の付いた錫杖
- 持たせない物: 剣、槌、本、盾

男 → 元画像 `priest-male.png`

```
full body character illustration of a young adult male gentle priest healer, masculine face, neat light brown hair, white and pale gold clergy robe with a simple stole, small holy symbol pendant, holding a wooden ringed prayer staff (shakujo) with small brass bells and rings at the top, pale cream yellow as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, hammer, mace, book, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `priest-female.png`

```
full body character illustration of a young adult female gentle priest healer, long wavy blonde hair under a short white veil, white and pale gold clergy robe with a simple stole, small holy symbol pendant, holding a wooden ringed prayer staff (shakujo) with small brass bells and rings at the top, pale cream yellow as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, hammer, mace, book, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 召喚士（`summoner`）
- 元の職: —　／　最初の武器: **見習いの魔導書（古い革表紙の本）**（`apprenticeTome`）　／　服: 旅人の服　／　色: 紫
- 見た目: 紫のフード付きローブ・光る紋様
- 持たせない物: 杖、短い杖（ワンド）、剣、盾、動物や召喚獣

男 → 元画像 `summoner-male.png`

```
full body character illustration of a young adult male young summoner, masculine face, silver-lilac hair, violet hooded robe with faintly glowing summoning sigils on the hem, holding only one open leather-bound spellbook in one hand, faint glowing runes on its pages, the other hand empty, violet as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no staff, wand, sword, shield, creatures, animals, bow, arrows, quiver, spear, second book, text, watermark, scenery
```

女 → 元画像 `summoner-female.png`

```
full body character illustration of a young adult female young summoner, long lavender hair, violet hooded robe with faintly glowing summoning sigils on the hem, holding only one open leather-bound spellbook in one hand, faint glowing runes on its pages, the other hand empty, violet as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no staff, wand, sword, shield, creatures, animals, bow, arrows, quiver, spear, second book, text, watermark, scenery
```

### 中位13職（26枚）

#### 剣豪（`swordmaster`）
- 元の職: 剣士　／　最初の武器: **銅の剣（片手剣）**（`copperSword`）　／　服: 皮の鎧　／　色: 赤
- 見た目: 赤い長いコート＋軽い革鎧・落ち着いた構え
- 持たせない物: 盾、刀、2本目の剣

男 → 元画像 `swordmaster-male.png`

```
full body character illustration of a young adult male seasoned swordmaster, masculine face, long dark red hair tied back, long crimson coat over light leather armor, red hair tie, calm focused stance, holding a single plain copper one-handed sword with a simple crossguard, crimson red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, katana, second sword, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `swordmaster-female.png`

```
full body character illustration of a young adult female seasoned swordmaster, high ponytail of crimson hair, long crimson coat over light leather armor, red hair tie, calm focused stance, holding a single plain copper one-handed sword with a simple crossguard, crimson red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, katana, second sword, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 狂戦士（`berserker`）
- 元の職: 剣士　／　最初の武器: **木こりの斧（分厚い刃の重い斧）**（`woodAxe`）　／　服: 皮の鎧　／　色: 濃い赤
- 見た目: 毛皮つきの革鎧・赤い戦化粧・両手で斧
- 持たせない物: 盾、剣、顔を隠す兜

男 → 元画像 `berserker-male.png`

```
full body character illustration of a young adult male wild berserker warrior, masculine face, wild crimson mane of hair, fur-trimmed leather armor with dark red cloth, muscular, battle scars, tribal war paint, holding a heavy thick-bladed woodcutter's axe with a wooden handle, dark blood red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, sword, helmet covering the face, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `berserker-female.png`

```
full body character illustration of a young adult female wild berserker warrior, wild long red hair with small braids, fur-trimmed leather armor with dark red cloth, muscular, battle scars, tribal war paint, holding a heavy thick-bladed woodcutter's axe with a wooden handle, dark blood red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, sword, helmet covering the face, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 闘士（`brawler`）
- 元の職: 武闘家　／　最初の武器: **布の手甲（両手の拳に巻いた布。手には何も持たない）**（`clothWraps`）　／　服: 旅人の服　／　色: 橙
- 見た目: 橙のベスト・赤い鉢巻・拳を構える
- 持たせない物: 武器全般、盾、金属の籠手

男 → 元画像 `brawler-male.png`

```
full body character illustration of a young adult male street-fighting brawler, masculine face, short black hair, open orange vest, wide dark trousers, red headband, fighting stance with raised fists, both fists wrapped in worn cloth hand wraps, bare hands, orange as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, staff, claws, metal gauntlets, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `brawler-female.png`

```
full body character illustration of a young adult female street-fighting brawler, short brown hair, open orange vest, wide dark trousers, red headband, fighting stance with raised fists, both fists wrapped in worn cloth hand wraps, bare hands, orange as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, staff, claws, metal gauntlets, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 大魔導士（`archmage`）
- 元の職: 魔道士　／　最初の武器: **樫の杖（先に小さな紫の宝玉）**（`oakStaff`）　／　服: 旅人の服　／　色: 青紫
- 見た目: 濃い青紫の重ねたローブ・金の星の刺繍
- 持たせない物: 剣、本、盾、ワンド

男 → 元画像 `archmage-male.png`

```
full body character illustration of a young adult male powerful archmage, masculine face, long silver hair, layered deep violet robes with gold star embroidery and a tall high collar, holding a tall gnarled oak wooden staff topped with a small violet crystal, deep blue-violet as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, book, shield, wand, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `archmage-female.png`

```
full body character illustration of a young adult female powerful archmage, long dark blue hair with an ornate circlet, layered deep violet robes with gold star embroidery and a tall high collar, holding a tall gnarled oak wooden staff topped with a small violet crystal, deep blue-violet as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, book, shield, wand, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 呪術師（`hexer`）
- 元の職: 魔道士　／　最初の武器: **錆びた大鎌（刃に黒い染み）**（`rustyScythe`）　／　服: 旅人の服　／　色: 紫
- 見た目: すそのほつれた紫のローブ・骨の飾り
- 持たせない物: 本、杖、剣、盾

男 → 元画像 `hexer-male.png`

```
full body character illustration of a young adult male sinister hexer, masculine face, black hair falling over one eye, tattered dark purple hooded robe with small bone and skull charms, pale skin, holding a large rusty scythe with dark stains on its curved blade, dark purple as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no book, staff, sword, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `hexer-female.png`

```
full body character illustration of a young adult female sinister hexer, long straight black hair, tattered dark purple hooded robe with small bone and skull charms, pale skin, holding a large rusty scythe with dark stains on its curved blade, dark purple as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no book, staff, sword, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 幻獣使い（`phantomTamer`）
- 元の職: 召喚士　／　最初の武器: **見習いの魔導書（古い革表紙の本）**（`apprenticeTome`）　／　服: 旅人の服　／　色: 紫
- 見た目: 紫と白のローブ・羽根の短いマント
- 持たせない物: 杖、剣、盾、動物や幻獣（お供と見分けにくくなるため）

男 → 元画像 `phantomTamer-male.png`

```
full body character illustration of a young adult male phantom beast tamer, masculine face, teal-silver hair, violet and white robe with a feathered short cape and crystal ornaments, holding only one open leather-bound spellbook in one hand, faint glowing runes on its pages, the other hand empty, violet as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no staff, sword, shield, creatures, animals, bow, arrows, quiver, spear, second book, text, watermark, scenery
```

女 → 元画像 `phantomTamer-female.png`

```
full body character illustration of a young adult female phantom beast tamer, long white hair with lavender tips, violet and white robe with a feathered short cape and crystal ornaments, holding only one open leather-bound spellbook in one hand, faint glowing runes on its pages, the other hand empty, violet as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no staff, sword, shield, creatures, animals, bow, arrows, quiver, spear, second book, text, watermark, scenery
```

#### 聖騎士（`paladin`）
- 元の職: 守護者　／　最初の武器: **樫の槌**（`oakHammer`）　／　服: 皮の鎧　／　色: 金
- 見た目: 白と金の鎧・青い陣羽織・丸い盾（提案F: 盾あり）
- 持たせない物: 剣、槍、2本目の武器

男 → 元画像 `paladin-male.png`

```
full body character illustration of a young adult male holy paladin knight, masculine face, short blond hair, white and gold plate armor over leather, blue tabard with a sun emblem, a round knight shield on the other arm, holding a sturdy plain oak wooden war hammer in one hand, gold as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, spear, second weapon, bow, arrows, quiver, text, watermark, scenery
```

女 → 元画像 `paladin-female.png`

```
full body character illustration of a young adult female holy paladin knight, long golden braided hair, white and gold plate armor over leather, blue tabard with a sun emblem, a round knight shield on the other arm, holding a sturdy plain oak wooden war hammer in one hand, gold as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, spear, second weapon, bow, arrows, quiver, text, watermark, scenery
```

#### 槍騎士（`lancer`）
- 元の職: 守護者　／　最初の武器: **鉄の槍**（`ironSpear`）　／　服: 皮の鎧　／　色: 青
- 見た目: 青と鋼の半鎧・短い青いマント
- 持たせない物: 盾、剣

男 → 元画像 `lancer-male.png`

```
full body character illustration of a young adult male lance knight, masculine face, short dark blue hair, blue and steel half-plate armor over leather, short blue cape, winged ornaments, holding a long plain straight iron spear, royal blue as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, sword, bow, arrows, quiver, text, watermark, scenery
```

女 → 元画像 `lancer-female.png`

```
full body character illustration of a young adult female lance knight, long blue hair with a winged hair ornament, blue and steel half-plate armor over leather, short blue cape, winged ornaments, holding a long plain straight iron spear, royal blue as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, sword, bow, arrows, quiver, text, watermark, scenery
```

#### 司祭（`bishop`）
- 元の職: 僧侶　／　最初の武器: **木の錫杖（先に小さな鈴が付いた祈りの杖）**（`woodScepter`）　／　服: 旅人の服　／　色: 淡い黄（クリーム）
- 見た目: 白と金の重ねた祭服・刺繍の襟帯
- 持たせない物: 本、剣、槌、盾

男 → 元画像 `bishop-male.png`

```
full body character illustration of a young adult male high priest bishop, masculine face, short brown hair, layered white and gold vestments with an embroidered stole, holding a wooden ringed prayer staff (shakujo) with small brass bells and rings at the top, pale cream yellow as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no book, sword, hammer, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `bishop-female.png`

```
full body character illustration of a young adult female high priest bishop, long silver-blonde hair under a white veil with gold trim, layered white and gold vestments with an embroidered stole, holding a wooden ringed prayer staff (shakujo) with small brass bells and rings at the top, pale cream yellow as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no book, sword, hammer, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 弓術士（`archer`）
- 元の職: 狩人　／　最初の武器: **狩人の弓**（`hunterBow`）　／　服: 旅人の服　／　色: 緑
- 見た目: 緑の上着・革の腕当て・背中に矢筒
- 持たせない物: 剣、手に持った短剣、盾

男 → 元画像 `archer-male.png`

```
full body character illustration of a young adult male skilled archer, masculine face, short blond hair, fitted forest green tunic, leather bracers, quiver of arrows on the back, holding a simple wooden hunting bow, forest green as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, dagger in hand, shield, spear, text, watermark, scenery
```

女 → 元画像 `archer-female.png`

```
full body character illustration of a young adult female skilled archer, long light blonde hair in a side braid, fitted forest green tunic, leather bracers, quiver of arrows on the back, holding a simple wooden hunting bow, forest green as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, dagger in hand, shield, spear, text, watermark, scenery
```

#### 獣使い（`tamer`）
- 元の職: 狩人　／　最初の武器: **革の鞭（丸めて持つ）**（`leatherWhip`）　／　服: 旅人の服　／　色: 黄緑
- 見た目: 毛皮の襟の黄緑のベスト・牙の首飾り
- 持たせない物: 動物（お供と見分けにくくなるため）、剣、弓、盾

男 → 元画像 `tamer-male.png`

```
full body character illustration of a young adult male beast tamer, masculine face, messy brown hair, fur-collared leaf green vest, rugged trousers and boots, fang necklace, holding a coiled supple leather whip in one hand, leaf green as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no animals, creatures, sword, bow, shield, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `tamer-female.png`

```
full body character illustration of a young adult female beast tamer, short orange-brown hair with a fur hood, fur-collared leaf green vest, rugged trousers and boots, fang necklace, holding a coiled supple leather whip in one hand, leaf green as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no animals, creatures, sword, bow, shield, arrows, quiver, spear, text, watermark, scenery
```

#### 隠密（`shadow`）
- 元の職: 盗賊　／　最初の武器: **古びた短剣（1本だけ）**（`rustyDagger`）　／　服: 旅人の服　／　色: 鈍い青（スレート）
- 見た目: 紺のフード付きの忍び装束・逆手に短剣
- 持たせない物: 刀、2本目の短剣、手裏剣、盾、顔を隠す覆面

男 → 元画像 `shadow-male.png`

```
full body character illustration of a young adult male stealthy shadow agent, masculine face, black hair, dark slate blue fitted hooded garb, face mask lowered around the neck so the face is visible, the dagger held in a reverse grip, holding a single worn short dagger with a slightly chipped blade, slate blue as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no katana, second dagger, shuriken, shield, face mask covering the face, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `shadow-female.png`

```
full body character illustration of a young adult female stealthy shadow agent, black hair in a low ponytail, dark slate blue fitted hooded garb, face mask lowered around the neck so the face is visible, the dagger held in a reverse grip, holding a single worn short dagger with a slightly chipped blade, slate blue as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no katana, second dagger, shuriken, shield, face mask covering the face, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 怪盗（`phantomThief`）
- 元の職: 盗賊　／　最初の武器: **古びた短剣（1本だけ）**（`rustyDagger`）　／　服: 旅人の服　／　色: 金
- 見た目: 金の縁取りの黒い燕尾服・小さなシルクハット
- 持たせない物: 顔を隠す仮面、銃、剣、盾

男 → 元画像 `phantomThief-male.png`

```
full body character illustration of a young adult male elegant phantom thief, masculine face, neat dark hair, black tailcoat with gold trim, short cape, white gloves, small top hat, monocle, holding a single worn short dagger with a slightly chipped blade, gold as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no mask covering the face, gun, sword, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `phantomThief-female.png`

```
full body character illustration of a young adult female elegant phantom thief, black bob hair, black tailcoat with gold trim, short cape, white gloves, small top hat, monocle, holding a single worn short dagger with a slightly chipped blade, gold as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no mask covering the face, gun, sword, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

### 最上位13職（26枚）

#### 剣聖（`swordSaint`）
- 元の職: 剣豪　／　最初の武器: **銅の剣（片手剣）**（`copperSword`）　／　服: 皮の鎧　／　色: 赤
- 見た目: 白と赤の立派な長いコート・金の刺繍
- 持たせない物: 盾、刀、2本目の剣

男 → 元画像 `swordSaint-male.png`

```
full body character illustration of a young adult male legendary sword saint, masculine face, long dark red hair tied back, flowing white and crimson ornate long coat over light armor with gold embroidery, serene master aura, holding a single plain copper one-handed sword with a simple crossguard, crimson red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, katana, second sword, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `swordSaint-female.png`

```
full body character illustration of a young adult female legendary sword saint, very long crimson hair in a high ponytail, flowing white and crimson ornate long coat over light armor with gold embroidery, serene master aura, holding a single plain copper one-handed sword with a simple crossguard, crimson red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, katana, second sword, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 覇王（`overlord`）
- 元の職: 狂戦士　／　最初の武器: **木こりの斧（分厚い刃の重い斧）**（`woodAxe`）　／　服: 皮の鎧　／　色: 濃い赤
- 見た目: 黒と濃い赤の重い鎧・毛皮のマント・角の冠
- 持たせない物: 盾、剣、顔を隠す兜

男 → 元画像 `overlord-male.png`

```
full body character illustration of a young adult male imposing warlord overlord, masculine face, wild crimson mane of hair, black and dark red heavy armor with a thick fur mantle and a horned crown-like circlet, commanding presence, holding a heavy thick-bladed woodcutter's axe with a wooden handle, dark blood red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, sword, helmet covering the face, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `overlord-female.png`

```
full body character illustration of a young adult female imposing warlord overlord, long wild red hair, black and dark red heavy armor with a thick fur mantle and a horned crown-like circlet, commanding presence, holding a heavy thick-bladed woodcutter's axe with a wooden handle, dark blood red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, sword, helmet covering the face, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 拳王（`fistKing`）
- 元の職: 闘士　／　最初の武器: **布の手甲（両手の拳に巻いた布。手には何も持たない）**（`clothWraps`）　／　服: 旅人の服　／　色: 橙
- 見た目: 白と橙の道着・金刺繍の黒帯・長い腰布
- 持たせない物: 武器全般、盾、金属の籠手

男 → 元画像 `fistKing-male.png`

```
full body character illustration of a young adult male martial arts master king of fists, masculine face, short black hair with a red headband, white and orange gi with a gold-embroidered black belt, long flowing sash, powerful stance, both fists wrapped in worn cloth hand wraps, bare hands, orange as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, staff, claws, metal gauntlets, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `fistKing-female.png`

```
full body character illustration of a young adult female martial arts master king of fists, long black hair in a high ponytail with a red headband, white and orange gi with a gold-embroidered black belt, long flowing sash, powerful stance, both fists wrapped in worn cloth hand wraps, bare hands, orange as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, staff, claws, metal gauntlets, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 大賢者（`greatSage`）
- 元の職: 大魔導士　／　最初の武器: **樫の杖（先に小さな紫の宝玉）**（`oakStaff`）　／　服: 旅人の服　／　色: 青紫
- 見た目: 白と濃い青紫の立派なローブ・まわりに光る文字
- 持たせない物: 剣、本、盾、ワンド

男 → 元画像 `greatSage-male.png`

```
full body character illustration of a young adult male great sage, masculine face, long silver hair, grand white and deep violet robes with gold celestial embroidery, small glowing runes floating around, holding a tall gnarled oak wooden staff topped with a small violet crystal, deep blue-violet as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, book, shield, wand, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `greatSage-female.png`

```
full body character illustration of a young adult female great sage, very long dark blue hair with a gold circlet, grand white and deep violet robes with gold celestial embroidery, small glowing runes floating around, holding a tall gnarled oak wooden staff topped with a small violet crystal, deep blue-violet as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, book, shield, wand, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 冥王（`hadesLord`）
- 元の職: 呪術師　／　最初の武器: **錆びた大鎌（刃に黒い染み）**（`rustyScythe`）　／　服: 旅人の服　／　色: 紫
- 見た目: 黒と紫の王のローブ・骨の冠・足もとに黒い霧
- 持たせない物: 本、杖、剣、盾、がいこつの手下

男 → 元画像 `hadesLord-male.png`

```
full body character illustration of a young adult male lord of the underworld, masculine face, black hair falling over one eye, regal black and violet robe with a bone crown and a long dark cape, faint dark mist at the feet, holding a large rusty scythe with dark stains on its curved blade, dark purple as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no book, staff, sword, shield, skeleton minions, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `hadesLord-female.png`

```
full body character illustration of a young adult female lord of the underworld, long straight black hair, regal black and violet robe with a bone crown and a long dark cape, faint dark mist at the feet, holding a large rusty scythe with dark stains on its curved blade, dark purple as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no book, staff, sword, shield, skeleton minions, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 幻獣王（`phantomKing`）
- 元の職: 幻獣使い　／　最初の武器: **見習いの魔導書（古い革表紙の本）**（`apprenticeTome`）　／　服: 旅人の服　／　色: 紫
- 見た目: 紫と白の王のローブ・大きな羽根のマント・金の冠
- 持たせない物: 杖、剣、盾、動物や幻獣

男 → 元画像 `phantomKing-male.png`

```
full body character illustration of a young adult male king of phantom beasts, masculine face, teal-silver hair, regal violet and white robe with a large feathered mantle and a gold circlet, holding only one open leather-bound spellbook in one hand, faint glowing runes on its pages, the other hand empty, violet as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no staff, sword, shield, creatures, animals, bow, arrows, quiver, spear, second book, text, watermark, scenery
```

女 → 元画像 `phantomKing-female.png`

```
full body character illustration of a young adult female king of phantom beasts, long white hair with lavender tips, regal violet and white robe with a large feathered mantle and a gold circlet, holding only one open leather-bound spellbook in one hand, faint glowing runes on its pages, the other hand empty, violet as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no staff, sword, shield, creatures, animals, bow, arrows, quiver, spear, second book, text, watermark, scenery
```

#### 聖王（`holyKing`）
- 元の職: 聖騎士　／　最初の武器: **樫の槌**（`oakHammer`）　／　服: 皮の鎧　／　色: 金
- 見た目: 白と金の立派な鎧・青いマント・小さな冠・丸い盾（提案F）
- 持たせない物: 剣、槍、2本目の武器

男 → 元画像 `holyKing-male.png`

```
full body character illustration of a young adult male radiant holy king, masculine face, short blond hair, radiant white and gold ornate plate armor, royal blue cape, small crown, a round knight shield on the other arm, holding a sturdy plain oak wooden war hammer in one hand, gold as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, spear, second weapon, bow, arrows, quiver, text, watermark, scenery
```

女 → 元画像 `holyKing-female.png`

```
full body character illustration of a young adult female radiant holy king, long golden braided hair, radiant white and gold ornate plate armor, royal blue cape, small crown, a round knight shield on the other arm, holding a sturdy plain oak wooden war hammer in one hand, gold as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, spear, second weapon, bow, arrows, quiver, text, watermark, scenery
```

#### 竜騎士（`dragoon`）
- 元の職: 槍騎士　／　最初の武器: **鉄の槍**（`ironSpear`）　／　服: 皮の鎧　／　色: 青
- 見た目: 濃い青の竜の鱗の鎧・竜の兜は脇に抱える
- 持たせない物: 盾、剣、本物の竜

男 → 元画像 `dragoon-male.png`

```
full body character illustration of a young adult male dragon knight dragoon, masculine face, short dark blue hair, dark blue dragon-scale armor with spiky pauldrons, dragon-head helmet held under the arm so the face is visible, holding a long plain straight iron spear, royal blue as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, sword, dragon creature, bow, arrows, quiver, text, watermark, scenery
```

女 → 元画像 `dragoon-female.png`

```
full body character illustration of a young adult female dragon knight dragoon, long blue hair, dark blue dragon-scale armor with spiky pauldrons, dragon-head helmet held under the arm so the face is visible, holding a long plain straight iron spear, royal blue as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, sword, dragon creature, bow, arrows, quiver, text, watermark, scenery
```

#### 教皇（`pope`）
- 元の職: 司祭　／　最初の武器: **木の錫杖（先に小さな鈴が付いた祈りの杖）**（`woodScepter`）　／　服: 旅人の服　／　色: 淡い黄（クリーム）
- 見た目: 白と金の立派な祭服・高い司教冠
- 持たせない物: 本、剣、槌、盾

男 → 元画像 `pope-male.png`

```
full body character illustration of a young adult male holy pope, masculine face, short brown hair, grand white and gold vestments with a tall mitre and a long embroidered stole, gentle radiant halo light, holding a wooden ringed prayer staff (shakujo) with small brass bells and rings at the top, pale cream yellow as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no book, sword, hammer, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `pope-female.png`

```
full body character illustration of a young adult female holy pope, long silver-blonde hair, grand white and gold vestments with a tall mitre and a long embroidered stole, gentle radiant halo light, holding a wooden ringed prayer staff (shakujo) with small brass bells and rings at the top, pale cream yellow as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no book, sword, hammer, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 弓聖（`bowSaint`）
- 元の職: 弓術士　／　最初の武器: **狩人の弓**（`hunterBow`）　／　服: 旅人の服　／　色: 緑
- 見た目: 緑と白の上品な狩装束・金の葉の刺繍・羽根のマント
- 持たせない物: 剣、手に持った短剣、盾

男 → 元画像 `bowSaint-male.png`

```
full body character illustration of a young adult male legendary bow saint, masculine face, short blond hair, elegant green and white hunter attire with gold leaf embroidery, feathered cape, quiver on the back, holding a simple wooden hunting bow, forest green as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, dagger in hand, shield, spear, text, watermark, scenery
```

女 → 元画像 `bowSaint-female.png`

```
full body character illustration of a young adult female legendary bow saint, long light blonde hair in a side braid, elegant green and white hunter attire with gold leaf embroidery, feathered cape, quiver on the back, holding a simple wooden hunting bow, forest green as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, dagger in hand, shield, spear, text, watermark, scenery
```

#### ビーストマスター（`beastMaster`）
- 元の職: 獣使い　／　最初の武器: **革の鞭（丸めて持つ）**（`leatherWhip`）　／　服: 旅人の服　／　色: 黄緑
- 見た目: 狼の毛皮のマント・骨と牙の飾り
- 持たせない物: 動物、剣、弓、盾

男 → 元画像 `beastMaster-male.png`

```
full body character illustration of a young adult male wild beast master, masculine face, messy brown hair, large wolf-pelt mantle over a leaf green leather outfit, bone and fang accessories, holding a coiled supple leather whip in one hand, leaf green as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no animals, creatures, sword, bow, shield, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `beastMaster-female.png`

```
full body character illustration of a young adult female wild beast master, short orange-brown hair, large wolf-pelt mantle over a leaf green leather outfit, bone and fang accessories, holding a coiled supple leather whip in one hand, leaf green as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no animals, creatures, sword, bow, shield, arrows, quiver, spear, text, watermark, scenery
```

#### 忍者（`ninja`）
- 元の職: 隠密　／　最初の武器: **古びた短剣（1本だけ）**（`rustyDagger`）　／　服: 旅人の服　／　色: 鈍い青（スレート）
- 見た目: 黒と紺の忍び装束・長い赤いマフラー
- 持たせない物: 刀、手裏剣、2本目の刃物、盾、分身

男 → 元画像 `ninja-male.png`

```
full body character illustration of a young adult male master ninja, masculine face, black hair, black and dark slate blue shinobi garb, long flowing red scarf, face visible, the dagger held in a reverse grip, holding a single worn short dagger with a slightly chipped blade, slate blue as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no katana, shuriken, second blade, shield, clones, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `ninja-female.png`

```
full body character illustration of a young adult female master ninja, black hair in a high ponytail, black and dark slate blue shinobi garb, long flowing red scarf, face visible, the dagger held in a reverse grip, holding a single worn short dagger with a slightly chipped blade, slate blue as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no katana, shuriken, second blade, shield, clones, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 大怪盗（`grandThief`）
- 元の職: 怪盗　／　最初の武器: **古びた短剣（1本だけ）**（`rustyDagger`）　／　服: 旅人の服　／　色: 金
- 見た目: 黒と金の燕尾服・裏が赤の長いマント・シルクハット
- 持たせない物: 顔を隠す仮面、銃、剣、盾

男 → 元画像 `grandThief-male.png`

```
full body character illustration of a young adult male legendary grand phantom thief, masculine face, neat dark hair, black and gold tailcoat with a long cape lined in crimson, top hat, monocle, white gloves, holding a single worn short dagger with a slightly chipped blade, gold as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no mask covering the face, gun, sword, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `grandThief-female.png`

```
full body character illustration of a young adult female legendary grand phantom thief, black bob hair, black and gold tailcoat with a long cape lined in crimson, top hat, monocle, white gloves, holding a single worn short dagger with a slightly chipped blade, gold as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no mask covering the face, gun, sword, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

### 特殊10職（20枚）

#### 侍（`samurai`）
- 元の職: 剣豪　／　最初の武器: **無銘の刀（鍔も鞘も飾りのない刀）**（`plainKatana`）　／　服: 皮の鎧　／　色: 赤
- 見た目: 紺の着物と赤い袴・抜く前の居合の構え
- 持たせない物: 2本目の刀、剣、弓、盾

男 → 元画像 `samurai-male.png`

```
full body character illustration of a young adult male calm samurai, masculine face, black hair in a topknot, dark navy kimono and crimson hakama with simple lacquered shoulder plates, ready-to-draw iai stance, a plain unadorned katana in a black scabbard at the waist, one hand resting on the hilt, crimson red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no second sword, western sword, bow, shield, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `samurai-female.png`

```
full body character illustration of a young adult female calm samurai, long black hair tied high with a red cord, dark navy kimono and crimson hakama with simple lacquered shoulder plates, ready-to-draw iai stance, a plain unadorned katana in a black scabbard at the waist, one hand resting on the hilt, crimson red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no second sword, western sword, bow, shield, arrows, quiver, spear, text, watermark, scenery
```

#### 魔剣士（`magicKnight`）
- 元の職: 剣豪　／　最初の武器: **銅の剣（片手剣）**（`copperSword`）　／　服: 皮の鎧　／　色: 赤
- 見た目: 赤と青の鎧のコート・光る文字・刃にうっすら属性の光
- 持たせない物: 杖、盾、本、2本目の剣

男 → 元画像 `magicKnight-male.png`

```
full body character illustration of a young adult male magic swordsman, masculine face, dark red hair, red and blue armored coat with softly glowing elemental rune lines, faint elemental glow along the blade, holding a single plain copper one-handed sword with a simple crossguard, crimson red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no staff, shield, book, second sword, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `magicKnight-female.png`

```
full body character illustration of a young adult female magic swordsman, crimson hair in a braid, red and blue armored coat with softly glowing elemental rune lines, faint elemental glow along the blade, holding a single plain copper one-handed sword with a simple crossguard, crimson red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no staff, shield, book, second sword, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 時魔道士（`timeMage`）
- 元の職: 大魔導士　／　最初の武器: **見習いの魔導書（古い革表紙の本）**（`apprenticeTome`）　／　服: 旅人の服　／　色: 青紫
- 見た目: 濃い青と金のローブ・時計と砂時計の模様
- 持たせない物: 杖、剣、盾、大きな時計

男 → 元画像 `timeMage-male.png`

```
full body character illustration of a young adult male time mage, masculine face, neat silver hair, deep blue and gold robe with clock-face and hourglass motifs, small floating gears of light, holding only one open leather-bound spellbook in one hand, faint glowing runes on its pages, the other hand empty, deep blue-violet as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no staff, sword, shield, large clock, bow, arrows, quiver, spear, second book, text, watermark, scenery
```

女 → 元画像 `timeMage-female.png`

```
full body character illustration of a young adult female time mage, long dark blue hair with a clock-shaped hair ornament, deep blue and gold robe with clock-face and hourglass motifs, small floating gears of light, holding only one open leather-bound spellbook in one hand, faint glowing runes on its pages, the other hand empty, deep blue-violet as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no staff, sword, shield, large clock, bow, arrows, quiver, spear, second book, text, watermark, scenery
```

#### 死霊術師（`necromancer`）
- 元の職: 呪術師　／　最初の武器: **錆びた大鎌（刃に黒い染み）**（`rustyScythe`）　／　服: 旅人の服　／　色: 紫
- 見た目: 黒と淡い緑のぼろのローブ・骨の飾り・青白い霊の光
- 持たせない物: 本、杖、剣、盾、がいこつの手下

男 → 元画像 `necromancer-male.png`

```
full body character illustration of a young adult male necromancer, masculine face, pale skin and white hair, black and sickly green tattered robes with bone ornaments, pale ghostly wisps around, holding a large rusty scythe with dark stains on its curved blade, dark purple as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no book, staff, sword, shield, skeleton minions, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `necromancer-female.png`

```
full body character illustration of a young adult female necromancer, pale skin and long black hair, black and sickly green tattered robes with bone ornaments, pale ghostly wisps around, holding a large rusty scythe with dark stains on its curved blade, dark purple as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no book, staff, sword, shield, skeleton minions, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 暗黒騎士（`darkKnight`）
- 元の職: 聖騎士　／　最初の武器: **銅の剣（片手剣）**（`copperSword`）　／　服: 皮の鎧　／　色: 黒と濃い赤（元の聖騎士の金から変える）
- 見た目: 黒いとげの鎧・ぼろの黒マント・刃に黒いもや
- 持たせない物: 盾（提案F: 暗黒騎士は盾なし）、槌、顔を隠す兜

男 → 元画像 `darkKnight-male.png`

```
full body character illustration of a young adult male dark knight, masculine face, short silver hair, black spiked plate armor with dark red accents and a tattered black cape, face visible, faint dark aura around the blade, holding a single plain copper one-handed sword with a simple crossguard, black with dark red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, hammer, helmet covering the face, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `darkKnight-female.png`

```
full body character illustration of a young adult female dark knight, long black hair, black spiked plate armor with dark red accents and a tattered black cape, face visible, faint dark aura around the blade, holding a single plain copper one-handed sword with a simple crossguard, black with dark red as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no shield, hammer, helmet covering the face, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 巫女（`shrineMaiden`）
- 元の職: 司祭　／　最初の武器: **木の錫杖（先に小さな鈴が付いた祈りの杖）**（`woodScepter`）　／　服: 旅人の服　／　色: 赤と白
- 見た目: 白い小袖と赤い袴（男は神主風の白と赤）
- 持たせない物: 剣、弓、盾、御幣

男 → 元画像 `shrineMaiden-male.png`

```
full body character illustration of a young adult male Shinto shrine attendant, masculine face, black hair tied back with white paper ribbon (male shrine priest attire), white kosode top and red hakama with white ribbons and paper charms, holding a wooden ringed prayer staff (shakujo) with small brass bells and rings at the top, red and white as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, bow, shield, gohei wand, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `shrineMaiden-female.png`

```
full body character illustration of a young adult female Shinto shrine maiden, long straight black hair tied low with a white paper ribbon, white kosode top and red hakama with white ribbons and paper charms, holding a wooden ringed prayer staff (shakujo) with small brass bells and rings at the top, red and white as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, bow, shield, gohei wand, arrows, quiver, spear, text, watermark, scenery
```

#### 占星術師（`astrologer`）
- 元の職: 司祭　／　最初の武器: **見習いの魔導書（古い革表紙の本）**（`apprenticeTome`）　／　服: 旅人の服　／　色: 夜空の紺
- 見た目: 星座模様の紺のローブ・星の冠
- 持たせない物: 杖、望遠鏡、水晶玉、剣、盾

男 → 元画像 `astrologer-male.png`

```
full body character illustration of a young adult male astrologer star reader, masculine face, wavy silver hair, midnight blue robe with constellation patterns and a small star circlet, star chart pages on the book, holding only one open leather-bound spellbook in one hand, faint glowing runes on its pages, the other hand empty, midnight blue as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no staff, telescope, crystal ball, sword, shield, bow, arrows, quiver, spear, second book, text, watermark, scenery
```

女 → 元画像 `astrologer-female.png`

```
full body character illustration of a young adult female astrologer star reader, long wavy navy hair with star hairpins, midnight blue robe with constellation patterns and a small star circlet, star chart pages on the book, holding only one open leather-bound spellbook in one hand, faint glowing runes on its pages, the other hand empty, midnight blue as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no staff, telescope, crystal ball, sword, shield, bow, arrows, quiver, spear, second book, text, watermark, scenery
```

#### 機工士（`machinist`）
- 元の職: 弓術士　／　最初の武器: **古式銃（長い火打ち石式の銃）**（`antiqueGun`）　／　服: 旅人の服　／　色: 真鍮
- 見た目: おでこにゴーグル・茶色の革の作業コート・真鍮の歯車
- 持たせない物: 弓、剣、盾、機械の腕、ピストル2丁

男 → 元画像 `machinist-male.png`

```
full body character illustration of a young adult male clever machinist engineer, masculine face, messy ginger hair, goggles on the forehead, brown leather work coat with brass gears, utility belts with small tools, holding an antique long flintlock rifle with a dark wooden stock and brass fittings, brass and brown as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no bow, sword, shield, mechanical arm, dual pistols, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `machinist-female.png`

```
full body character illustration of a young adult female clever machinist engineer, short ginger hair in a small ponytail, goggles on the forehead, brown leather work coat with brass gears, utility belts with small tools, holding an antique long flintlock rifle with a dark wooden stock and brass fittings, brass and brown as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no bow, sword, shield, mechanical arm, dual pistols, arrows, quiver, spear, text, watermark, scenery
```

#### 吟遊詩人（`bard`）
- 元の職: 怪盗　／　最初の武器: **旅人のリュート（小さな弦楽器）**（`travelerLute`）　／　服: 旅人の服　／　色: 緑と金
- 見た目: 羽根つきのベレー帽・緑と金の旅の服
- 持たせない物: 手に持った短剣、剣、盾、笛

男 → 元画像 `bard-male.png`

```
full body character illustration of a young adult male cheerful traveling bard, masculine face, wavy chestnut hair, feathered beret, colorful green and gold traveling outfit, short cape, holding a small wooden traveling lute, green and gold as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no dagger in hand, sword, shield, flute, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `bard-female.png`

```
full body character illustration of a young adult female cheerful traveling bard, long wavy chestnut hair, feathered beret, colorful green and gold traveling outfit, short cape, holding a small wooden traveling lute, green and gold as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no dagger in hand, sword, shield, flute, bow, arrows, quiver, spear, text, watermark, scenery
```

#### 賭博師（`gambler`）
- 元の職: 怪盗　／　最初の武器: **古びた短剣（1本だけ）**（`rustyDagger`）　／　服: 旅人の服　／　色: 濃い赤と黒
- 見た目: 濃い赤のベスト・帽子にトランプ・腰にサイコロ
- 持たせない物: 銃、剣、2本目の短剣、盾

男 → 元画像 `gambler-male.png`

```
full body character illustration of a young adult male confident gambler, masculine face, slicked-back dark hair, dark red waistcoat over a white shirt with loosened tie, playing cards tucked in the hat band, dice on the belt, holding a single worn short dagger with a slightly chipped blade, dark red and black as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no gun, sword, second dagger, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

女 → 元画像 `gambler-female.png`

```
full body character illustration of a young adult female confident gambler, dark wavy hair, dark red waistcoat over a white shirt with loosened tie, playing cards tucked in the hat band, dice on the belt, holding a single worn short dagger with a slightly chipped blade, dark red and black as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no gun, sword, second dagger, shield, bow, arrows, quiver, spear, text, watermark, scenery
```

## お供の指示文（12種×4色＝48本）

### オカメインコ（`cockatiel`）
- 置き方: 肩に乗る → 止まり木に止まるように座る

ノーマル（`normal`）→ 元画像 `pet-cockatiel-normal.png`

```
adorable chibi cockatiel parrot with a tall upright head crest and round orange cheek patches, light silver-gray body, wings and tail, white wing patches, yellow face and crest, round orange cheek patches, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no black feathers, text, human, ribbon, heart, collar, accessories, background scenery
```

ルチノー（`lutino`）→ 元画像 `pet-cockatiel-lutino.png`

```
adorable chibi cockatiel parrot with a tall upright head crest and round orange cheek patches, creamy white and pale yellow body, yellow face and crest, round orange cheek patches, red-pink eyes, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no black feathers, text, human, ribbon, heart, collar, accessories, background scenery
```

パール（`pearl`）→ 元画像 `pet-cockatiel-pearl.png`

```
adorable chibi cockatiel parrot with a tall upright head crest and round orange cheek patches, light silver-gray body covered with pale yellow pearl spots on the wings and back, yellow face, orange cheek patches, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no black feathers, text, human, ribbon, heart, collar, accessories, background scenery
```

ホワイトフェイス（`whiteface`）→ 元画像 `pet-cockatiel-whiteface.png`

```
adorable chibi cockatiel parrot with a tall upright head crest, light silver-gray body, pure white face and crest, plain white cheeks, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no black feathers, orange cheeks, text, human, ribbon, heart, collar, accessories, background scenery
```

### 子狼（`wolfPup`）
- 置き方: 足元 → 地面に座る

灰（`gray`）→ 元画像 `pet-wolfPup-gray.png`

```
adorable chibi fluffy wolf pup with big paws and pointy ears, gray fur with a lighter cream chest, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

茶（`brown`）→ 元画像 `pet-wolfPup-brown.png`

```
adorable chibi fluffy wolf pup with big paws and pointy ears, warm brown fur with a cream chest, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

黒（`black`）→ 元画像 `pet-wolfPup-black.png`

```
adorable chibi fluffy wolf pup with big paws and pointy ears, jet black fur with golden eyes, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

白銀（`silver`）→ 元画像 `pet-wolfPup-silver.png`

```
adorable chibi fluffy wolf pup with big paws and pointy ears, shining silver-white fur with pale blue eyes, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

### 黒猫（`blackCat`）
- 置き方: 足元 → 地面に座る

黒（`black`）→ 元画像 `pet-blackCat-black.png`

```
adorable chibi kitten with a curled tail, solid black fur with big yellow eyes, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

ハチワレ（`tuxedo`）→ 元画像 `pet-blackCat-tuxedo.png`

```
adorable chibi kitten with a curled tail, black and white tuxedo pattern, white face blaze, white chest and paws, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

三毛（`calico`）→ 元画像 `pet-blackCat-calico.png`

```
adorable chibi kitten with a curled tail, calico pattern with white, orange and black patches, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

ロシアンブルー（`russianBlue`）→ 元画像 `pet-blackCat-russianBlue.png`

```
adorable chibi kitten with a curled tail, blue-gray velvety fur with green eyes, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

### 子亀（`turtle`）
- 置き方: 足元 → 地面に座る

緑（`green`）→ 元画像 `pet-turtle-green.png`

```
adorable chibi baby tortoise with a round domed shell and a happy face, green shell and green skin, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

茶（`brown`）→ 元画像 `pet-turtle-brown.png`

```
adorable chibi baby tortoise with a round domed shell and a happy face, brown shell with tan skin, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

黄金（`gold`）→ 元画像 `pet-turtle-gold.png`

```
adorable chibi baby tortoise with a round domed shell and a happy face, shiny golden shell with sparkles, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

玄武風（`genbu`）→ 元画像 `pet-turtle-genbu.png`

```
adorable chibi baby tortoise with a round domed shell and a happy face, dark slate blue shell with faint hexagon patterns, a tiny cute snake-shaped tail, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

### 小竜（`babyDragon`）
- 置き方: 浮く → 小さな翼で宙に浮く

紅（`crimson`）→ 元画像 `pet-babyDragon-crimson.png`

```
adorable chibi baby dragon with small wings, tiny horns and a chubby belly, flying in the air, crimson red scales with a cream belly, big round sparkling eyes, tiny simple body, hovering in the air, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

蒼（`azure`）→ 元画像 `pet-babyDragon-azure.png`

```
adorable chibi baby dragon with small wings, tiny horns and a chubby belly, flying in the air, azure blue scales with a pale belly, big round sparkling eyes, tiny simple body, hovering in the air, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

翠（`jade`）→ 元画像 `pet-babyDragon-jade.png`

```
adorable chibi baby dragon with small wings, tiny horns and a chubby belly, flying in the air, jade green scales with a pale belly, big round sparkling eyes, tiny simple body, hovering in the air, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

金（`gold`）→ 元画像 `pet-babyDragon-gold.png`

```
adorable chibi baby dragon with small wings, tiny horns and a chubby belly, flying in the air, golden scales with a cream belly, big round sparkling eyes, tiny simple body, hovering in the air, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

### うさぎ（`rabbit`）
- 置き方: 足元 → 地面に座る

白（`white`）→ 元画像 `pet-rabbit-white.png`

```
adorable chibi bunny rabbit with a fluffy round tail, pure white fur with pink inner ears, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

茶（`brown`）→ 元画像 `pet-rabbit-brown.png`

```
adorable chibi bunny rabbit with a fluffy round tail, brown fur with a cream belly, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

グレー（`gray`）→ 元画像 `pet-rabbit-gray.png`

```
adorable chibi bunny rabbit with a fluffy round tail, soft gray fur, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

垂れ耳（`lop`）→ 元画像 `pet-rabbit-lop.png`

```
adorable chibi bunny rabbit with a fluffy round tail, cream-beige fur with long floppy drooping lop ears, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

### フクロウ（`owl`）
- 置き方: 肩に乗る → 止まり木に止まるように座る

茶（`brown`）→ 元画像 `pet-owl-brown.png`

```
adorable chibi owlet with big round eyes, brown feathers with lighter speckles, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

灰（`gray`）→ 元画像 `pet-owl-gray.png`

```
adorable chibi owlet with big round eyes, gray feathers, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

シロフクロウ（`snowy`）→ 元画像 `pet-owl-snowy.png`

```
adorable chibi owlet with big round eyes, snowy white feathers with a few small black spots, yellow eyes, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

ミミズク（`horned`）→ 元画像 `pet-owl-horned.png`

```
adorable chibi owlet with big round eyes, tawny brown feathers with two pointy ear tufts, orange eyes, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

### 子狐（`foxCub`）
- 置き方: 足元 → 地面に座る

稲荷色（`inari`）→ 元画像 `pet-foxCub-inari.png`

```
adorable chibi fox kit with a big fluffy tail, bright orange-gold fur with white tail tip and chest, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

茶（`brown`）→ 元画像 `pet-foxCub-brown.png`

```
adorable chibi fox kit with a big fluffy tail, warm brown fur with a cream chest, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

白狐（`white`）→ 元画像 `pet-foxCub-white.png`

```
adorable chibi fox kit with a big fluffy tail, pure white fur with faint red markings near the eyes, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

黒狐（`black`）→ 元画像 `pet-foxCub-black.png`

```
adorable chibi fox kit with a big fluffy tail, black-brown fur with a white tail tip, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

### 文鳥（`javaSparrow`）
- 置き方: 肩に乗る → 止まり木に止まるように座る

白（`white`）→ 元画像 `pet-javaSparrow-white.png`

```
adorable chibi java sparrow, very round mochi-like body, thick pink-red beak, red eye rings, pure white feathers, pink beak, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no head crest, crest feathers, text, human, ribbon, heart, collar, accessories, background scenery
```

桜（`sakura`）→ 元画像 `pet-javaSparrow-sakura.png`

```
adorable chibi java sparrow, very round mochi-like body, thick pink-red beak, red eye rings, gray body with soft white mottled patches, black head, white cheeks, pink beak, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no head crest, crest feathers, text, human, ribbon, heart, collar, accessories, background scenery
```

シナモン（`cinnamon`）→ 元画像 `pet-javaSparrow-cinnamon.png`

```
adorable chibi java sparrow, very round mochi-like body, thick pink-red beak, red eye rings, soft beige-brown body, cocoa brown head, white cheeks, pink beak, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no head crest, crest feathers, text, human, ribbon, heart, collar, accessories, background scenery
```

シルバー（`silver`）→ 元画像 `pet-javaSparrow-silver.png`

```
adorable chibi java sparrow, very round mochi-like body, thick pink-red beak, red eye rings, pale silver-gray body, darker gray head, white cheeks, pink beak, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no head crest, crest feathers, text, human, ribbon, heart, collar, accessories, background scenery
```

### セキセイインコ（`budgie`）
- 置き方: 肩に乗る → 止まり木に止まるように座る

水色（`blue`）→ 元画像 `pet-budgie-blue.png`

```
adorable chibi budgerigar parakeet with wavy stripes on the head and wings, small round cheek dots, sky blue body, white face, black wavy stripes, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

黄緑（`green`）→ 元画像 `pet-budgie-green.png`

```
adorable chibi budgerigar parakeet with wavy stripes on the head and wings, small round cheek dots, bright lime green body, yellow face, black wavy stripes, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

ハルクイン（`harlequin`）→ 元画像 `pet-budgie-harlequin.png`

```
adorable chibi budgerigar parakeet with wavy stripes on the head and wings, small round cheek dots, pied pattern with yellow and green patches, yellow face, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

レインボー（`rainbow`）→ 元画像 `pet-budgie-rainbow.png`

```
adorable chibi budgerigar parakeet with wavy stripes on the head and wings, small round cheek dots, pastel gradient body of turquoise, blue and violet, yellow face, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

### シマエナガ（`longTailedTit`）
- 置き方: 肩に乗る → 止まり木に止まるように座る

雪白（`snow`）→ 元画像 `pet-longTailedTit-snow.png`

```
adorable chibi long-tailed tit, tiny perfectly round fluffy snowball body, very small beak, black bead eyes, long thin tail, pure white fluffy face and body, black and white wings and tail, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

銀灰（`silverGray`）→ 元画像 `pet-longTailedTit-silverGray.png`

```
adorable chibi long-tailed tit, tiny perfectly round fluffy snowball body, very small beak, black bead eyes, long thin tail, white face, silvery gray body, gray wings and tail, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

ほんのり桜色（`sakura`）→ 元画像 `pet-longTailedTit-sakura.png`

```
adorable chibi long-tailed tit, tiny perfectly round fluffy snowball body, very small beak, black bead eyes, long thin tail, white face, soft pink tinted body, pink-gray wings, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

淡金（`paleGold`）→ 元画像 `pet-longTailedTit-paleGold.png`

```
adorable chibi long-tailed tit, tiny perfectly round fluffy snowball body, very small beak, black bead eyes, long thin tail, white face, pale golden cream body, light brown wings, big round sparkling eyes, tiny simple body, perched upright as if sitting on a shoulder, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

### レッサーパンダ（`redPanda`）
- 置き方: 足元 → 地面に座る

茶（`brown`）→ 元画像 `pet-redPanda-brown.png`

```
adorable chibi red panda cub with a ringed fluffy tail and white face markings, reddish brown fur, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

明橙（`orange`）→ 元画像 `pet-redPanda-orange.png`

```
adorable chibi red panda cub with a ringed fluffy tail and white face markings, bright orange fur, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

クリーム（`cream`）→ 元画像 `pet-redPanda-cream.png`

```
adorable chibi red panda cub with a ringed fluffy tail and white face markings, pale cream fur with soft beige rings, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

濃茶（`darkBrown`）→ 元画像 `pet-redPanda-darkBrown.png`

```
adorable chibi red panda cub with a ringed fluffy tail and white face markings, dark chocolate brown fur, big round sparkling eyes, tiny simple body, sitting on the ground, soft hand-painted shading, clean readable silhouette even at small size, full body, front three-quarter view, plain white background --ar 1:1 --no text, human, ribbon, heart, collar, accessories, background scenery
```

## 組み込みの手順

### オーナーがすること（手間を減らす進め方・2026-11-08 に決定）
Midjourney は規約で自動の操作（ブラウザの自動操作・スクリプト）を禁止しているため、送るのはオーナーの手で行う。その代わり、選ぶ・名前を付ける作業は Claude が引き受ける。
1. 画面の「Style References」には何も入れない（立ち絵の指示文に `--sref` が入っているため）。
2. 文書の指示文をコピーして、**待たずに続けて何本も送る**。作るのは裏で順番に進む。1日に全部でなくてよい（例: 今日は基本と中位の職だけ）。
3. できた絵は**選ばず・拡大せず、4枚まとめて**「Organize」の画面で選んでダウンロードする。名前も付けなくてよい。
4. 保存したフォルダを Claude に渡す。

### Claude がすること（選ぶ・名前を付ける）
1. 絵を見て、どの職・お供・色かを見分ける（Midjourney が付ける名前には指示文の一部が入るので、それも手がかりにする）。
2. 4枚から1枚の候補を選ぶ。武器が合っている・持たせない物が無い・全身が入っている・男女が分かる、を見る。
3. 決まった名前に付け直す（立ち絵は `<職ID>-<male|female>.png`、お供は `pet-<お供ID>-<色ID>.png`。指示文の上に「元画像」として書いてある名前）。
4. 候補の一覧（絵を並べた画像）をオーナーに見せ、「OK」か「これは別のを」をもらう。合う絵が無い物は、指示文を直して作り直しを頼む。
5. 小さい絵で足りない時は、その1枚だけオーナーに拡大（Upscale の Subtle）を頼む。

### Claude がすること（立ち絵）
1. 元画像のフォルダを `SRC` にします（例 `C:/dev/card-rpg-assets`）。今までの番号の画像と同じフォルダで大丈夫です。
2. `scripts/art/build_art.py` の `HEROES` の表に、名前で1行ずつ足します。

   ```python
   HEROES = {
       # …今の8枚はそのまま…
       ('monk', 'female'): 'monk-female', ('monk', 'male'): 'monk-male',
   }
   ```
3. **`FACES` の表にも同じ職を必ず足します**（足さないと `build_heroes` が止まります）。まずは今の8枚と同じ `(0.5, 0.085, 0.17)` にします。
   帽子やフードで顔が下の方にある絵は、2つ目の数字を大きくします（魔道士は 0.13）。顔の絵を目で見て直します。

   ```python
   ('monk', 'female'): (0.5, 0.085, 0.17), ('monk', 'male'): (0.5, 0.085, 0.17),
   ```
4. 加工します。名前の一部を付けると、その絵だけ作り直せます。
   ```bash
   SRC=C:/dev/card-rpg-assets python scripts/art/build_art.py hero/monk
   ```
   → `src/assets/art/hero/monk-female.webp`（480×660）と `monk-female-face.webp`（192×192）ができます。
5. 置くだけでゲームが読み込みます（`src/art/index.tsx` の `heroImage`）。絵の無い職は、今の仮の絵（SVG）のままです。
6. 画面で確かめます。キャラ作成・戦闘・パーティーの帯（顔）・転職の一覧を、幅 360/390/480px で見ます。
7. 型チェック・テスト・ビルドを通してからコミットします。

### Claude がすること（お供・あとで）
- 今回はコードを作りません（決めたこと D）。絵がそろったら、次のように足す案です。
  - `build_art.py` に `PETS = {('cockatiel', 'normal'): 'pet-cockatiel-normal', …}` と `build_pets()` を足します。中身は、切り抜き → `square(fig, 256)` → `src/assets/art/pet/<お供ID>-<色ID>.webp`。
  - ゲームの側では、`pet/<お供ID>-<色ID>` の絵があれば使い、無ければ今の絵文字のままにします（HANDOFF §3 J4）。

### うまくいかない時
- **背景が残る・武器が欠ける**: 背景が無地でない時に起きやすいです。指示文の `plain off-white background` を強めるか、`--no` に `scenery` が入っているかを確かめます。
- **武器が2本になる・違う武器を持つ**: `--no` に、その武器の名前を足して作り直します。
- **作風がちびキャラになる・アニメ調が強すぎる**: `--sw` を上げるか、参照する立ち絵を替えます。

## 確認表

できたら ☐ を ☑ に変えます。「☑」は「元画像がある・加工した・ゲームの画面で見た」の3つがそろった時にします。

### 立ち絵（40職×男女＝80枚）

| 職 | ID | 男 | 女 |
|---|---|---|---|
| 武闘家 | `monk` | ☐ | ☐ |
| 盗賊 | `thief` | ☐ | ☐ |
| 僧侶 | `priest` | ☐ | ☐ |
| 召喚士 | `summoner` | ☐ | ☐ |
| 剣豪 | `swordmaster` | ☐ | ☐ |
| 狂戦士 | `berserker` | ☐ | ☐ |
| 闘士 | `brawler` | ☐ | ☐ |
| 大魔導士 | `archmage` | ☐ | ☐ |
| 呪術師 | `hexer` | ☐ | ☐ |
| 幻獣使い | `phantomTamer` | ☐ | ☐ |
| 聖騎士 | `paladin` | ☐ | ☐ |
| 槍騎士 | `lancer` | ☐ | ☐ |
| 司祭 | `bishop` | ☐ | ☐ |
| 弓術士 | `archer` | ☐ | ☐ |
| 獣使い | `tamer` | ☐ | ☐ |
| 隠密 | `shadow` | ☐ | ☐ |
| 怪盗 | `phantomThief` | ☐ | ☐ |
| 剣聖 | `swordSaint` | ☐ | ☐ |
| 覇王 | `overlord` | ☐ | ☐ |
| 拳王 | `fistKing` | ☐ | ☐ |
| 大賢者 | `greatSage` | ☐ | ☐ |
| 冥王 | `hadesLord` | ☐ | ☐ |
| 幻獣王 | `phantomKing` | ☐ | ☐ |
| 聖王 | `holyKing` | ☐ | ☐ |
| 竜騎士 | `dragoon` | ☐ | ☐ |
| 教皇 | `pope` | ☐ | ☐ |
| 弓聖 | `bowSaint` | ☐ | ☐ |
| ビーストマスター | `beastMaster` | ☐ | ☐ |
| 忍者 | `ninja` | ☐ | ☐ |
| 大怪盗 | `grandThief` | ☐ | ☐ |
| 侍 | `samurai` | ☐ | ☐ |
| 魔剣士 | `magicKnight` | ☐ | ☐ |
| 時魔道士 | `timeMage` | ☐ | ☐ |
| 死霊術師 | `necromancer` | ☐ | ☐ |
| 暗黒騎士 | `darkKnight` | ☐ | ☐ |
| 巫女 | `shrineMaiden` | ☐ | ☐ |
| 占星術師 | `astrologer` | ☐ | ☐ |
| 機工士 | `machinist` | ☐ | ☐ |
| 吟遊詩人 | `bard` | ☐ | ☐ |
| 賭博師 | `gambler` | ☐ | ☐ |

### お供（12種×4色＝48枚）

| お供 | ID | 色1 | 色2 | 色3 | 色4 |
|---|---|---|---|---|---|
| オカメインコ | `cockatiel` | ☐ ノーマル | ☐ ルチノー | ☐ パール | ☐ ホワイトフェイス |
| 子狼 | `wolfPup` | ☐ 灰 | ☐ 茶 | ☐ 黒 | ☐ 白銀 |
| 黒猫 | `blackCat` | ☐ 黒 | ☐ ハチワレ | ☐ 三毛 | ☐ ロシアンブルー |
| 子亀 | `turtle` | ☐ 緑 | ☐ 茶 | ☐ 黄金 | ☐ 玄武風 |
| 小竜 | `babyDragon` | ☐ 紅 | ☐ 蒼 | ☐ 翠 | ☐ 金 |
| うさぎ | `rabbit` | ☐ 白 | ☐ 茶 | ☐ グレー | ☐ 垂れ耳 |
| フクロウ | `owl` | ☐ 茶 | ☐ 灰 | ☐ シロフクロウ | ☐ ミミズク |
| 子狐 | `foxCub` | ☐ 稲荷色 | ☐ 茶 | ☐ 白狐 | ☐ 黒狐 |
| 文鳥 | `javaSparrow` | ☐ 白 | ☐ 桜 | ☐ シナモン | ☐ シルバー |
| セキセイインコ | `budgie` | ☐ 水色 | ☐ 黄緑 | ☐ ハルクイン | ☐ レインボー |
| シマエナガ | `longTailedTit` | ☐ 雪白 | ☐ 銀灰 | ☐ ほんのり桜色 | ☐ 淡金 |
| レッサーパンダ | `redPanda` | ☐ 茶 | ☐ 明橙 | ☐ クリーム | ☐ 濃茶 |
