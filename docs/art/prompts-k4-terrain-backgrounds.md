# 2〜7本目：地形の模様・戦闘の背景・シナリオ選択のカード・ダンジョンの背景の指示文（Midjourney）

全体の一覧と、読み込みの1行は `k4-art-inventory.md`。ここは指示文だけ。**英語は、コードの枠の中の貼り付け用だけ。**

共通の作風（今ゲームに入っている背景・地形に合わせる）: くすんだ色の、絵画風のデジタルペイント。暗めで、少しぼかす（上に文字やカードが乗るため）。文字・人物・枠は入れない。

`--sref` の見本（公開中のサイトの絵）。下の `<A>`〜`<C>` は、次に置き換えて使う。

- `<A>`（屋外・明るい）= `https://card-rpg-1aa60.web.app/assets/plains-D5W7nkmg.webp https://card-rpg-1aa60.web.app/assets/forest-2rei72Bs.webp`
- `<B>`（屋内・暗い）= `https://card-rpg-1aa60.web.app/assets/temple-B79emr75.webp https://card-rpg-1aa60.web.app/assets/catacomb-Cxd4mSZo.webp`
- `<C>`（暗く赤い）= `https://card-rpg-1aa60.web.app/assets/volcano-j3JEHGdk.webp https://card-rpg-1aa60.web.app/assets/castle-RN32dFH7.webp`

画面の「Style References」は空にする。できた絵の渡し方は `prompts-dungeon.md` の「できた絵の渡し方」と同じ。

---

## 1. 地形の模様 7枚（地図のマスの絵）

置き場所: `src/assets/art/terrain/<地形ID>.webp`（256×256・つなぎ目なし）。**置くだけで使われる。** 真上から見た平らな模様で、影の偏り・周辺の暗さを入れない。既存の `terrain/plains` などと同じ明るさ・細かさにする。

### snow 雪原（凍てつく王国・夢幻の大迷宮）`terrain/snow`
```
seamless tileable texture of fresh snow field seen from directly above, soft windswept drifts, a few small icy sparkles and faint blue shadows, pale blue white palette, painterly digital painting, flat top-down orthographic view, evenly lit, no perspective, no vignette, no footprints, no text --tile --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/plains-CbkNqxRY.webp
```

### ice 氷原（凍てつく王国・夢幻の大迷宮）`terrain/ice`
```
seamless tileable texture of a frozen lake surface seen from directly above, thick translucent blue ice with white cracks and trapped air bubbles, cold blue palette, painterly digital painting, flat top-down orthographic view, evenly lit, no perspective, no vignette, no text --tile --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/water-_dX7a-lt.webp
```

### desert 砂漠（砂塵の王朝・夢幻の大迷宮）`terrain/desert`
```
seamless tileable texture of desert sand seen from directly above, fine golden sand with gentle wind ripples and a few small pebbles, warm ochre palette, painterly digital painting, flat top-down orthographic view, evenly lit, no perspective, no vignette, no footprints, no text --tile --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/plains-CbkNqxRY.webp
```

### cloud 雲の道（星降る天空城・夢幻の大迷宮）`terrain/cloud`
```
seamless tileable texture of soft white clouds seen from directly above, fluffy cloud floor with pale lavender shadows and a few tiny golden star dust specks, painterly digital painting, flat top-down orthographic view, evenly lit, no perspective, no vignette, no text --tile --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/plains-CbkNqxRY.webp
```

### metal 鉄の床（機械仕掛けの帝国・夢幻の大迷宮）`terrain/metal`
```
seamless tileable texture of an old riveted iron floor seen from directly above, dark grey steel plates with rivets, scratches and thin rust stains, a few brass bolts, painterly digital painting, flat top-down orthographic view, evenly lit, no perspective, no vignette, no text --tile --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/mountain-wduJMFxj.webp
```

### steam 蒸気の地（機械仕掛けの帝国・夢幻の大迷宮）`terrain/steam`
```
seamless tileable texture of hot cracked ground seen from directly above, pale grey stone with thin vents leaking faint white steam wisps, warm orange glow in the cracks, painterly digital painting, flat top-down orthographic view, evenly lit, no perspective, no vignette, no text --tile --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/hills-Bf3Klpzf.webp
```

### sea 海（呪われた群島）`terrain/sea`
```
seamless tileable texture of deep sea water seen from directly above, teal and deep blue waves with soft white foam streaks, painterly digital painting, flat top-down orthographic view, evenly lit, no perspective, no vignette, no boats, no text --tile --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/water-_dX7a-lt.webp
```

---

## 2. 地形の戦闘の背景 5枚

置き場所: `src/assets/art/bg/<ID>.webp`（600×1071。縦長）。その地形のマスで戦った時の背景。**データは切り替え済み**（絵が無い間は平原の背景が出る）。上と下が暗めで、真ん中は少し空ける（上に敵と味方が立つ）。

### snow 雪原（雪原・氷原のマス）`bg/snow`
```
fantasy RPG battle background of a snowy plain at dusk, wide white snowfield with a few bare dark pine trees far away, cold blue sky with soft clouds, a faint pale mist near the ground, detailed hand-painted fantasy art, muted cold blue and grey palette, dark soft vignette at top and bottom, empty open ground in the middle, no characters, no text --ar 9:16 --sref <A>
```

### desert 砂漠（砂漠のマス）`bg/desert`
```
fantasy RPG battle background of a vast desert at sunset, golden sand dunes with long soft shadows, distant ruined stone pillars, a hazy orange sky, detailed hand-painted fantasy art, muted warm ochre palette, dark soft vignette at top and bottom, empty open ground in the middle, no characters, no text --ar 9:16 --sref <A>
```

### cloud 雲の道（雲の道のマス）`bg/cloud`
```
fantasy RPG battle background high above the clouds at night, a pale cloud path with floating small islands far away, a deep navy starry sky with a large pale moon, soft glowing star dust, detailed hand-painted fantasy art, muted navy and lavender palette with gold accents, dark soft vignette at top and bottom, empty open ground in the middle, no characters, no text --ar 9:16 --sref <A>
```

### machine 鉄の床・蒸気の地（機械の地形のマス）`bg/machine`
```
fantasy RPG battle background inside a giant steam-powered factory, huge brass gears and riveted iron pipes in the dark, white steam drifting, a warm orange furnace glow far behind, detailed hand-painted fantasy art, muted soot grey and copper palette, dark soft vignette at top and bottom, empty iron floor in the middle, no characters, no text --ar 9:16 --sref <C>
```

### sea 海（海のマス。船の上で戦う）`bg/sea`
```
fantasy RPG battle background on the open sea seen from a ship deck, dark teal waves under a thick grey-green mist, the broken masts of far away ghost ships barely visible, detailed hand-painted fantasy art, muted teal and grey palette, dark soft vignette at top and bottom, empty wooden deck planks in the lower middle, no characters, no text --ar 9:16 --sref <B>
```

---

## 3. シナリオ選択のカードの絵 6枚

置き場所: `src/assets/art/bg/card-<シナリオID>.webp`（横長。約 3:2）。選ぶ画面のカードの背景で、下の半分に題名と説明の文字が乗るので、**下の半分は暗めで、物は少なめ**にする。読み込みの1行（`art: 'card-<シナリオID>'` を `scenario.ts` に足す）は Claude が足す。

| 置き場所（名前） | シナリオ | 題材 |
|---|---|---|
| `bg/card-frozenKingdom` | 凍てつく王国 | 雪と氷の王国。遠くに青白い氷の城、手前に凍った木々 |
| `bg/card-cursedArchipelago` | 呪われた群島 | 霧の海に浮かぶ島々と、遠くの幽霊船の影、小さな灯台の光 |
| `bg/card-sandDynasty` | 砂塵の王朝 | 夕日の砂漠に半分埋もれた巨大な王宮と石像 |
| `bg/card-starCastle` | 星降る天空城 | 夜空の雲の上の白い城と、降りそそぐ星のかけら |
| `bg/card-clockworkEmpire` | 機械仕掛けの帝国 | 煙突と歯車の街。白い蒸気と赤い炉の光 |
| `bg/card-dreamLabyrinth` | 夢幻の大迷宮 | 六つの世界の景色が溶け合う淡い紫の夢の迷路 |

指示文のひな形（`<題材>` を上の表の英語に置き換える）:
```
fantasy RPG title card illustration, <題材>, wide cinematic composition, detailed hand-painted fantasy art, muted painterly colors, dark soft vignette, the lower half kept dark and simple for text, no characters, no text, no logo --ar 3:2 --sref <A>
```

英語の題材（そのまま貼る）:

- 凍てつく王国 `a snowbound kingdom with a pale blue ice castle far away and frozen trees in the foreground, cold blue palette`
- 呪われた群島 `small islands floating in a thick teal mist with a ghost ship silhouette far away and a tiny lighthouse glow, teal and grey palette`
- 砂塵の王朝 `a half buried giant golden palace and colossal stone statues in a sunset desert, warm ochre and orange palette`
- 星降る天空城 `a white castle on the clouds at night with falling star fragments, deep navy and gold palette`
- 機械仕掛けの帝国 `a city of chimneys and giant brass gears with white steam and a red furnace glow, soot grey and copper palette`
- 夢幻の大迷宮 `a dreamy labyrinth where snow, sand, clouds, mist and gears melt into each other under a soft purple sky, lavender and indigo palette`

---

## 4. ダンジョンの部屋・戦闘の背景 24枚

置き場所: `src/assets/art/bg/<ダンジョンID>.webp`（600×1071。縦長）。ダンジョンの部屋の中で戦う時の背景。通路の絵（`prompts-k4-dungeon-corridors.md`）と同じ世界の、**少し広い部屋の景色**にする。ひな形（`<題材>` と `<sref>` を表から置き換える）:

```
fantasy RPG battle background inside <題材>, detailed hand-painted fantasy art, muted painterly colors, dark soft vignette at top and bottom, empty floor in the middle, no characters, no text --ar 9:16 --sref <sref>
```

`<sref>` は、屋内・暗い=`<B>`、暗く赤い=`<C>`、屋外・明るい=`<A>` のどれかに置き換える。

| 置き場所 | シナリオ・ダンジョン | 英語の題材 | sref |
|---|---|---|---|
| `bg/crystalCave` | 凍てつく王国・氷晶の洞 | `a cave full of tall glowing pale blue ice crystals, frosted rock walls and a faint cold mist` | `<B>` |
| `bg/sunkenCathedral` | 凍てつく王国・沈んだ聖堂 | `a half frozen gothic cathedral hall sunk under ice, pale stone pillars, icicles and a dim blue light from above` | `<B>` |
| `bg/giantMine` | 凍てつく王国・霜の巨人の鉱山 | `a frost covered mine tunnel with old wooden braces, ore carts and giant frozen footprints, a dim lantern glow` | `<C>` |
| `bg/iceCastle` | 凍てつく王国・氷の城 | `a grand ice castle throne hall, pale blue ice pillars, silver trim and floating snow` | `<C>` |
| `bg/wreckCave` | 呪われた群島・難破船の洞窟 | `a wet sea cave with the broken hull of an old ship wedged in the rock, shallow water on the floor` | `<B>` |
| `bg/pirateIsland` | 呪われた群島・海賊の隠れ島 | `a pirate hideout cave with stacked barrels, ropes, treasure chests and hanging lanterns` | `<B>` |
| `bg/sunkenTemple` | 呪われた群島・沈んだ神殿 | `a half flooded ancient temple hall with coral covered stone pillars and teal light through the water` | `<B>` |
| `bg/ghostFlagship` | 呪われた群島・嘆きの王冠号 | `the inside of a huge ghost ship deck at night, rotten wood planks, torn sails and pale blue ghost lights` | `<C>` |
| `bg/scorpionTomb` | 砂塵の王朝・蠍の墓所 | `an ancient sandstone tomb hall, carved hieroglyph walls, sand drifts on the floor and a faint golden light` | `<B>` |
| `bg/shadowLibrary` | 砂塵の王朝・影の書庫 | `a dark underground library of sandstone with tall shelves of old scrolls and a few dim oil lamps` | `<B>` |
| `bg/statueTemple` | 砂塵の王朝・石像の神殿 | `a colossal sandstone temple hall lined with giant guardian statues, shafts of golden light and drifting dust` | `<C>` |
| `bg/sandPalace` | 砂塵の王朝・砂塵の王宮 | `a golden pharaoh palace throne hall, tall gold trimmed pillars, sand pouring from the ceiling and a dim gold glow` | `<C>` |
| `bg/windmillTower` | 星降る天空城・風車の塔 | `the inside of a tall white windmill tower with huge wooden gears, open windows with clouds and strong wind` | `<A>` |
| `bg/observatory` | 星降る天空城・星見の天文台 | `an observatory dome room with a big brass telescope, star charts on the walls and a night sky through the open dome` | `<B>` |
| `bg/moonlitGarden` | 星降る天空城・月光の庭 | `a moonlit marble garden with hedges, white flowers and a pale fountain under a huge moon` | `<A>` |
| `bg/skyCastle` | 星降る天空城・天空城 | `a white marble castle throne hall floating in the sky, gold trim, clouds outside the windows and falling star fragments` | `<C>` |
| `bg/gearFactory` | 機械仕掛けの帝国・歯車の工場 | `a factory hall with moving conveyor belts, riveted iron machines and hanging chains, dim orange lamps` | `<C>` |
| `bg/steamPlant` | 機械仕掛けの帝国・蒸気の発電所 | `a steam power plant boiler room, huge copper boilers, tangled pipes and billowing white steam` | `<C>` |
| `bg/clockTower` | 機械仕掛けの帝国・時計塔 | `the inside of a giant clock tower, huge brass gears and pendulums, a big clock face glowing in the back` | `<B>` |
| `bg/machineHeart` | 機械仕掛けの帝国・大機械の心臓 | `the core chamber of a giant machine, a huge pulsing red glowing heart of gears and pipes, black steel walls` | `<C>` |
| `bg/echoIceVault` | 夢幻の大迷宮・氷の記憶の洞 | `a dreamlike ice cave with blurred soft edges, floating pale blue crystals and a faint purple haze` | `<B>` |
| `bg/echoSandTomb` | 夢幻の大迷宮・砂の幻影の墓 | `a dreamlike sand tomb hall with blurred edges, golden dust floating in a soft purple haze` | `<B>` |
| `bg/echoGhostShip` | 夢幻の大迷宮・幽霊船の悪夢 | `a dreamlike ghost ship deck with blurred edges, pale teal ghost lights and a soft purple fog` | `<B>` |
| `bg/dreamEaterLair` | 夢幻の大迷宮・夢喰いの巣 | `a dark violet void chamber where countless faint memories float like small lights, black and purple tones` | `<C>` |

1本目「侵食の魔王」と、各シナリオのランダムダンジョン（凍る洞窟・潮騒の洞窟・砂の洞窟・星屑の洞窟・廃品の洞窟・夢の洞窟）は、今までどおり共通の背景（`castle`・`forestCave`）を使うので、今回は作らない。
