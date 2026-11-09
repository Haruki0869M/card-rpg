# 世界マップの箱庭ジオラマの絵（Midjourney の指示文・26枚）

計画: `docs/tasks/play-feedback-plan.md` の「絵の準備」（やり方A・オーナー承認済み）。
私（Claude）が指示文を作り、オーナーが Midjourney で作り、私が切り抜いて組み込みます。**新しいお金はかかりません。**
絵が届くまでは、箱庭のセッションが仮の絵（SVG）で動きを先に作ります。絵が届いたら差し替えるだけです。

- **飛び出す飾り 16枚**（`deco/…`）: 森の木・山の頂など。六角形のマスの上に、枠からはみ出して立ちます。
- **立体のミニチュア 10枚**（`landmark/…`）: 神殿・祭壇・テントなど。今の「？」「✨」「🏛」のアイコンの代わりです。

英語は、コードの枠の中の貼り付け用だけです。

---

## 共通の決まり

- **作風**: 今ゲームに入っている地図の印（`place/shrine`・`place/dungeon` = 祠・洞窟の入口）に合わせます。墨の細い線＋くすんだ水彩の、絵本のような手描き。`--sref` にその2枚を入れてあります。
- **見る角度**: 上から斜め（約35度）に見下ろす「ボードゲームの駒」の角度。今の祠・ダンジョンの印と同じです。
- **背景**: 白い無地（切り抜きやすくするため）。真ん中に1つだけ置き、まわりに広めの余白。
- **地面**: 飾り（`deco`）は「ふちが消えていく小さな地面」だけ（マスの絵の上に立たせるため）。ミニチュア（`landmark`）は「小さな丸い土の台」に乗せます（ボードゲームの駒らしく見せるため）。
- **入れない物**（`--no` の後ろにまとめてあります。文の中に書くと、かえって描かれることがあるため）: 文字・サイン・枠・人や動物・六角形のマス・遠くの景色や空・強い影。
- **形**: 正方形 `--ar 1:1`。画面の「Style References」は空にする（`--sref` は指示文の中に入っています）。
- **大きさ（提案）**: ゲームでは 256×256 の正方形に縮め、地面の真ん中が絵の下の真ん中に来るようにそろえます（拡大2.5倍でもぼやけない大きさ）。

> `--sref` の URL は、今公開中のサイトの絵です（祠 = `shrine-CdVcb_M2.webp`、洞窟 = `dungeon-CDM88m2l.webp`）。もし「読み込めない」と出たら、`src/assets/art/place/shrine.webp` と `dungeon.webp` を Midjourney の「Style References」に入れて、指示文の `--sref …` の部分を消してください。

---

## 作るときの順番（おすすめ）

1. **まず試しの2枚**: `deco/forest-1`（森の木）と `landmark/temple`（神殿）。
2. 2枚を私に渡してもらい、切り抜いて地図の上での見え方を確かめます。見え方に合わせて、共通の文を直します（駒の時と同じ進め方）。
3. 残りの24枚をまとめて作ります。

---

## できた絵の渡し方（オーナー → Claude）

1. Midjourney で4枚出た中から、一番良い1枚を選んで拡大（Upscale）する。
2. ダウンロードした絵を、**`C:\dev\card-rpg-assets\diorama\`** のフォルダに、下の一覧の「元画像の名前」で保存する。
   - 例: `C:\dev\card-rpg-assets\diorama\deco-forest-1.png`、`C:\dev\card-rpg-assets\diorama\landmark-temple.png`
   - png でも webp でも jpg でも大丈夫です。名前さえ合っていれば、何枚ずつでも構いません。
3. このセッションに「○枚置いたよ」と書いてもらえれば、私が切り抜いて組み込みます。
4. 気に入らない絵は、一覧の □ をそのままにしておけば、私が指示文を直して出し直し用を書きます。

---

## チェックリスト（できたら □ を ✅ に）

### 飛び出す飾り（16枚）
| | 地形 | 元画像の名前 | 中身 |
|---|---|---|---|
| □ | 森 | `deco-forest-1` | 丸い広葉樹の木立（3本） |
| □ | 森 | `deco-forest-2` | 背の高い1本の木と低い茂み |
| □ | 丘 | `deco-hills-1` | 草の丘と岩 |
| □ | 山 | `deco-mountain-1` | 雪をかぶった、とがった岩山（2つの頂） |
| □ | 山 | `deco-mountain-2` | ごつごつした1つの岩山 |
| □ | 沼 | `deco-swamp-1` | 枯れ木と葦・水たまり |
| □ | 灰の荒野 | `deco-ash-1` | 焦げた枯れ木と黒い岩 |
| □ | 溶岩 | `deco-lava-1` | 煙を上げる小さな火山 |
| □ | 瘴気の地 | `deco-blight-1` | 紫に光る水晶のとげと、ねじれたいばら |
| □ | 雪原 | `deco-snow-1` | 雪をかぶったもみの木（3本） |
| □ | 氷原 | `deco-ice-1` | 青い氷の結晶の柱 |
| □ | 砂漠 | `deco-desert-1` | サボテンと砂岩 |
| □ | 砂漠 | `deco-desert-2` | ヤシの木2本の小さなオアシス |
| □ | 鉄の床 | `deco-metal-1` | 真鍮の歯車と管 |
| □ | 蒸気の地 | `deco-steam-1` | 蒸気を吹く鉄の煙突 |
| □ | 雲の道 | `deco-cloud-1` | 小さな岩の浮島と雲 |

平原・街道・湖・海は平らなままにします（飾りなし）。

### 立体のミニチュア（10枚）
| | 施設 | 元画像の名前 | 中身 |
|---|---|---|---|
| □ | 神殿 | `landmark-temple` | 白い石の柱が並ぶ小さな神殿 |
| □ | 祭壇 | `landmark-altar` | 光る紋様の石の台 |
| □ | イベント | `landmark-tent` | 旅人のテント（上にゲームが「？」のバッジを付ける） |
| □ | イベント | `landmark-stele` | 苔むした古い石碑（上にゲームが「？」のバッジを付ける） |
| □ | 見晴らしの塔 | `landmark-watchtower` | 木と石の見張り塔 |
| □ | 流れ星の落下地点 | `landmark-starfall` | 光るかけらの落ちた小さなくぼみ |
| □ | さすらいの行商人 | `landmark-merchant` | 幌のついた行商の荷馬車（馬なし） |
| □ | 黄金のコソ泥 | `landmark-thief` | 金貨のこぼれる袋と小さな隠れ家 |
| □ | たき火 | `landmark-campfire` | 石で囲んだたき火と丸太 |
| □ | 橋 | `landmark-bridge` | 木の太鼓橋（水は描かない） |

「？」のバッジ・残りのラウンドの数字・敵の駒は、ゲームが上に描きます。絵には入れません。

---

## 指示文 — 飛び出す飾り

共通の後ろの部分は、どの指示文にも入れてあります（そのまま貼り付けてください）。

### `deco-forest-1` 森の木立
```
a single hand-painted tabletop miniature of a small cluster of three round leafy broadleaf trees of different heights, deep green foliage with lighter highlights, brown trunks, a few small bushes at their feet, standing on a small soft patch of grassy ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, hexagon tile, round base, pedestal, landscape, horizon, sky, strong cast shadow
```

### `deco-forest-2` 背の高い木
```
a single hand-painted tabletop miniature of one tall old oak tree with a full rounded crown of deep green leaves and a sturdy trunk, low ferns and a small bush at its roots, standing on a small soft patch of grassy ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, hexagon tile, round base, pedestal, landscape, horizon, sky, strong cast shadow
```

### `deco-hills-1` 草の丘
```
a single hand-painted tabletop miniature of a low rounded grassy hill with two weathered grey boulders and a few tufts of tall grass, olive green and warm ochre tones, standing on a small soft patch of ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, trees, hexagon tile, round base, pedestal, landscape, horizon, sky, strong cast shadow
```

### `deco-mountain-1` 雪の岩山（2つの頂）
```
a single hand-painted tabletop miniature of a small rocky mountain with two sharp peaks, the taller peak capped with white snow, grey-violet stone with dark crevices, a few loose rocks at the foot, standing on a small soft patch of ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, trees, hexagon tile, round base, pedestal, landscape, mountain range, horizon, sky, clouds, strong cast shadow
```

### `deco-mountain-2` ごつごつした岩山
```
a single hand-painted tabletop miniature of one craggy jagged mountain peak of layered grey stone, steep cliffs and a small patch of snow near the top, scattered boulders at the base, standing on a small soft patch of ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, trees, hexagon tile, round base, pedestal, landscape, mountain range, horizon, sky, clouds, strong cast shadow
```

### `deco-swamp-1` 沼の枯れ木
```
a single hand-painted tabletop miniature of a gnarled dead swamp tree with twisted bare branches and hanging moss, clumps of reeds and cattails, a small murky green puddle, standing on a small soft patch of muddy ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, hexagon tile, round base, pedestal, landscape, horizon, sky, strong cast shadow
```

### `deco-ash-1` 焦げた枯れ木
```
a single hand-painted tabletop miniature of two charred black dead tree stumps with broken branches among dark volcanic rocks, a few faint orange embers glowing in the cracks, grey ash on the ground, standing on a small soft patch of ashen ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, fire, flames, hexagon tile, round base, pedestal, landscape, horizon, sky, strong cast shadow
```

### `deco-lava-1` 小さな火山
```
a single hand-painted tabletop miniature of a small cone-shaped volcano of dark red-brown rock, glowing orange lava trickling down one side, a thin plume of grey smoke rising from the crater, standing on a small soft patch of dark ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, hexagon tile, round base, pedestal, landscape, horizon, sky, explosion, strong cast shadow
```

### `deco-blight-1` 瘴気の水晶といばら
```
a single hand-painted tabletop miniature of a cluster of sharp dark purple crystal spikes glowing faintly violet, wrapped by black twisted thorny vines, a little pale purple mist at the base, standing on a small soft patch of dark cracked ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, skulls, hexagon tile, round base, pedestal, landscape, horizon, sky, strong cast shadow
```

### `deco-snow-1` 雪のもみの木
```
a single hand-painted tabletop miniature of three snow-covered fir trees of different heights, dark green needles under thick white snow, small snow drifts at their feet, standing on a small soft patch of snowy ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor with pale blue shadows, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, decorations, hexagon tile, round base, pedestal, landscape, horizon, sky, snowfall, strong cast shadow
```

### `deco-ice-1` 氷の結晶
```
a single hand-painted tabletop miniature of a cluster of tall translucent pale blue ice crystal pillars of different heights, sharp facets with white frosty edges and soft cyan highlights, standing on a small soft patch of icy ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, hexagon tile, round base, pedestal, landscape, horizon, sky, strong cast shadow
```

### `deco-desert-1` サボテンと砂岩
```
a single hand-painted tabletop miniature of two green saguaro cacti beside a weathered sandstone rock, a little dry grass and small pebbles, warm ochre sand, standing on a small soft patch of sandy ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, skulls, hexagon tile, round base, pedestal, landscape, dunes, horizon, sky, strong cast shadow
```

### `deco-desert-2` ヤシのオアシス
```
a single hand-painted tabletop miniature of two leaning palm trees beside a tiny round pool of clear blue water, a few green shrubs, warm ochre sand, standing on a small soft patch of sandy ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, camels, tents, hexagon tile, round base, pedestal, landscape, dunes, horizon, sky, strong cast shadow
```

### `deco-metal-1` 歯車と管
```
a single hand-painted tabletop miniature of a pile of large brass and iron cogwheels half standing upright, with a few bent copper pipes and rivets, dark grey steel with warm brass highlights and a little rust, standing on a small soft patch of riveted metal floor that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, robots, animals, hexagon tile, round base, pedestal, landscape, factory, horizon, sky, strong cast shadow
```

### `deco-steam-1` 蒸気の煙突
```
a single hand-painted tabletop miniature of a short riveted iron chimney vent with a brass valve wheel, puffing a soft white plume of steam, pale grey cracked stone around it with a faint warm orange glow in the cracks, standing on a small soft patch of ground that fades out at the edges, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, robots, animals, hexagon tile, round base, pedestal, landscape, factory, horizon, sky, fire, strong cast shadow
```

### `deco-cloud-1` 雲の浮島
```
a single hand-painted tabletop miniature of a tiny floating rock islet with a little green grass on top and one small twisted tree, soft fluffy white clouds with pale lavender shadows curling around its base, a few tiny golden star sparkles, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, castle, buildings, hexagon tile, round base, pedestal, landscape, horizon, sky background, strong cast shadow
```

---

## 指示文 — 立体のミニチュア

どれも「小さな丸い土の台」に乗せます。台のふちは、草が少し生えた土にします。

### `landmark-temple` 神殿
```
a single hand-painted tabletop miniature of a small ancient temple of pale stone, a short flight of steps leading to a ring of white marble columns under a low triangular roof, a little ivy on the stones, set on a small round earthen base with tufts of grass at its rim, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, statues, animals, hexagon tile, landscape, horizon, sky, ruins in the background, strong cast shadow
```

### `landmark-altar` 祭壇
```
a single hand-painted tabletop miniature of an old flat stone altar table carved with glowing pale violet runes, a soft violet light rising from its top surface, two short stone candle posts beside it, set on a small round earthen base with tufts of grass at its rim, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, skulls, blood, animals, hexagon tile, landscape, horizon, sky, strong cast shadow
```

### `landmark-tent` 旅人のテント（イベント）
```
a single hand-painted tabletop miniature of a small traveler's canvas tent in faded cream and red stripes, its flap half open, a wooden stool, a backpack and a small lantern beside it, set on a small round earthen base with tufts of grass at its rim, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, question mark, signature, watermark, frame, border, people, characters, animals, campfire, hexagon tile, landscape, horizon, sky, strong cast shadow
```

### `landmark-stele` 古い石碑（イベント）
```
a single hand-painted tabletop miniature of a weathered old upright stone stele with a rounded top, covered in faint worn carvings and green moss, a few small stones and wildflowers at its foot, set on a small round earthen base with tufts of grass at its rim, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, readable writing, question mark, signature, watermark, frame, border, people, characters, animals, gravestone, cross, hexagon tile, landscape, horizon, sky, strong cast shadow
```

### `landmark-watchtower` 見晴らしの塔
```
a single hand-painted tabletop miniature of a tall slender lookout watchtower, a stone lower half and a wooden upper platform with railings and a small pointed roof, a wooden ladder on one side, a tiny pennant flag on top, set on a small round earthen base with tufts of grass at its rim, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, emblem, signature, watermark, frame, border, people, characters, guards, animals, castle, walls, hexagon tile, landscape, horizon, sky, strong cast shadow
```

### `landmark-starfall` 流れ星の落下地点
```
a single hand-painted tabletop miniature of a small shallow crater with a glowing pale gold star fragment resting in its center, soft golden light and a few tiny floating sparkles, scorched earth and pebbles around the rim, set on a small round earthen base with tufts of grass at its rim, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, meteor trail, fire, explosion, hexagon tile, landscape, horizon, night sky, strong cast shadow
```

### `landmark-merchant` さすらいの行商人の荷馬車
```
a single hand-painted tabletop miniature of a small traveling merchant's covered wagon with a patched green canvas roof and wooden wheels, crates, barrels and hanging pots and lanterns on its sides, a little hanging cloth awning, set on a small round earthen base with tufts of grass at its rim, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, sign, signature, watermark, frame, border, people, characters, merchant, horse, animals, hexagon tile, landscape, road, horizon, sky, strong cast shadow
```

### `landmark-thief` 黄金のコソ泥の隠れ家
```
a single hand-painted tabletop miniature of a small sneaky thief's hideout, a tiny lean-to of sticks and a dark hooded cloth, a bulging sack spilling shiny gold coins, a few more gold coins scattered on the ground and a small treasure chest left ajar, set on a small round earthen base with tufts of grass at its rim, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, dollar sign, signature, watermark, frame, border, people, characters, thief, animals, weapons, hexagon tile, landscape, horizon, sky, strong cast shadow
```

### `landmark-campfire` たき火
```
a single hand-painted tabletop miniature of a cozy campfire inside a ring of round stones, small warm orange flames and a thin curl of smoke, two log seats beside it and a small cooking pot on a tripod, set on a small round earthen base with tufts of grass at its rim, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, tent, forest fire, hexagon tile, landscape, horizon, night sky, strong cast shadow
```

### `landmark-bridge` 木の太鼓橋
```
a single hand-painted tabletop miniature of a short arched wooden footbridge with weathered plank floor and simple wooden railings, small stone footings at both ends, seen crossing from lower left to upper right, standing alone with nothing underneath, board game diorama piece, three-quarter top-down view from about 35 degrees above, thin ink outlines and muted watercolor, storybook illustration, centered with a wide empty margin, isolated on a plain white background --ar 1:1 --sref https://card-rpg-1aa60.web.app/assets/shrine-CdVcb_M2.webp https://card-rpg-1aa60.web.app/assets/dungeon-CDM88m2l.webp --no text, letters, signature, watermark, frame, border, people, characters, animals, water, river, stream, round base, hexagon tile, landscape, horizon, sky, strong cast shadow
```

---

## 組み込みの手順（Claude の作業メモ）

1. **元画像**: `C:\dev\card-rpg-assets\diorama\<deco|landmark>-<名前>.(png|webp|jpg)`
2. **切り抜き**: `scripts/art/build_art.py` に `build_diorama()` を足す（駒の `build_pieces()` と同じ形）。
   - rembg で背景を切り抜く → **体の中の穴を埋める処理**を通す（別のセッションが作っている `scripts/art/fill-holes.mjs`。ブランチ `claude/art-holes-782bf6` を読んで、使い方を合わせる。白い石の柱・雪・雲・蒸気が「背景」と間違えられて抜けやすいので、特に大事）→ 離れたごみを消す（`despeckle`）→ 余白を取る（`trim`）。
   - 256×256 の正方形に、**地面（台）の下の真ん中を絵の下の真ん中に**そろえて置く（提案）。縦長の物（塔・木・火山）は高さで、横長の物（橋・荷馬車）は幅で、はみ出さない大きさに縮める。
   - 雲・蒸気・光は半透明になりやすい。切り抜きで消えすぎたら、その絵だけ穴埋めを強めにする。
3. **書き出し先**: `src/assets/art/deco/<地形ID>-<1|2>.webp`、`src/assets/art/landmark/<名前>.webp`。`src/art/images.ts` が `assets/art/**/*.webp` を自動で読むので、**置くだけで `artImage('deco/forest-1')` で取れる**。
4. **地図への差し込み**: 箱庭のセッション（ブランチ `claude/diorama-80bc6b`）が `WorldMap.tsx` の `placeImage()`（施設の絵）と、飾りの差し込み口を用意する。私はそこに名前の対応を足すだけ（施設の種類 → `landmark/…`、地形ID → `deco/<地形ID>-1|2`。2枚ある地形はマスの番号で交互に使う、提案）。
   - 施設の種類との対応（提案）: 神殿 `temple` → `landmark/temple`、祭壇 `altar` → `landmark/altar`、イベント `event` → `landmark/tent` と `landmark/stele` をマスの番号で交互、見晴らしの塔・流れ星・行商人・コソ泥は段階6で増える施設の種類に合わせる。たき火・橋は、今は使う場所が決まっていない（休憩のマス・川の街道で使う案。箱庭のセッションと相談）。
5. **確かめ**: 地図の上で、拡大1倍と2.5倍・昼と夜で、白い縁や穴が無いか写真で見る。重さは `perf.mjs` で前と比べる（26枚で合わせて約0.5MB の見込み）。
