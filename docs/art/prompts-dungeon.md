# ダンジョンの通路の絵（壁・床・天井・扉）の Midjourney 指示文（第3段階C2）

第3段階で、ダンジョンを「一人称の通路」にした。通路はゲームが遠近法で組み立てるので、絵は**模様（平らな正面の1枚）**だけあればよい。
今は絵が無く、ダンジョンごとの色で仮に描いている。この文書は、その模様を Midjourney で作るための指示文。

- 見本: `docs/art/reference/gemini-mock-dungeon-and-piece.jpg` の真ん中（松明のある石の通路の先に扉）。既存の背景 `src/assets/art/bg/<種類>.webp` と色・タッチを合わせる（くすんだ色の、絵画風のデジタルペイント）。
- 置き場所: `src/assets/art/dungeon/<背景>-<wall|floor|ceiling|door>.webp`。**置くだけで使われる**（差し込み口は段階B1で作り済み）。背景の名前は `temple`（翠の神殿）・`volcano`（溶岩の洞窟）・`catacomb`（静寂の地下墓地）・`castle`（魔王城）・`forestCave`（迷いの森の洞窟）。
- **まず翠の神殿の4枚で試す**。通路に貼って見え方（つなぎ目・暗さ・扉の大きさ）を確かめてから、残り16枚＋ボスの門を作る。

## 共通の決まり

- **壁・床・天井**: つなげて敷き詰められる模様（`--tile`）、正方形（`--ar 1:1`）。**真正面（床・天井は真上・真下）から見た平らな面**で、遠近・影の偏り・周辺の暗さ（ビネット）を入れない（ゲームが暗さと遠近を付ける）。明るさは均一で、やや明るめに作る（ゲームが奥ほど暗くする）。文字・人・松明は入れない（松明はゲームが描く）。
- **扉**: 扉の板だけを正面から、枠いっぱいに（`--ar 3:4`）。ゲームが上を丸く切り抜き、枠と取っ手を描くので、**枠・壁・取っ手・アーチは入れない**。ふつうの扉は**片開きの木の扉1枚**（ゲームでは左の蝶番で奥へ開く）。
- **ボスの門**: 両開きの大きな門（2枚）。真ん中に合わせ目。金の縁取り。王冠の印はゲームが重ねるので入れない。ボスの門の絵を使うには、組み込みの時に `dungeon/<背景>-bossdoor.webp` を読む1行をコードに足す（今は扉の絵を共通で使い、金の縁と合わせ目はゲームが描く）。

## 試しの4枚（翠の神殿 `temple`）

森に呑まれた古い神殿。白っぽい石に苔と蔦、少し緑がかった光。

### 1. 壁 `dungeon/temple-wall`
```
seamless tileable texture of an ancient temple stone wall, large weathered pale grey limestone blocks, thin moss in the cracks, a few creeping ivy tendrils, subtle carved line ornaments, muted desaturated colors with a faint green tint, painterly digital painting, flat orthographic front view, evenly lit, no perspective, no vignette, no torch, no text --tile --ar 1:1
```

### 2. 床 `dungeon/temple-floor`
```
seamless tileable texture of an ancient temple floor seen from directly above, worn square flagstones of pale grey stone, moss growing between the stones, scattered small fallen leaves, muted desaturated colors, painterly digital painting, flat top-down orthographic view, evenly lit, no perspective, no vignette, no text --tile --ar 1:1
```

### 3. 天井 `dungeon/temple-ceiling`
```
seamless tileable texture of an ancient temple stone ceiling seen from directly below, dark grey stone slabs with hanging roots and moss, a few cracks, muted dark colors, painterly digital painting, flat orthographic view, evenly lit, no perspective, no vignette, no text --tile --ar 1:1
```

### 4. 扉 `dungeon/temple-door`
```
a single old wooden dungeon door panel seen straight from the front, filling the whole frame edge to edge, vertical dark oak planks with iron bands and rivets, weathered and slightly mossy at the bottom, muted colors, painterly digital painting, flat front view, evenly lit, no frame, no wall, no arch, no handle, no text --ar 3:4
```

## 残りのダンジョン（試しの4枚を確かめた後）

置き換えるのは「題材の一文」だけ。後ろの決まり（`painterly digital painting, flat ... view, evenly lit, no perspective, no vignette, no text --tile --ar 1:1`）は試しの4枚と同じ。

### 溶岩の洞窟 `volcano`（黒い岩と赤く光る割れ目。背景は暗い雲と溶岩の川）
| 部位 | 題材の一文 |
|---|---|
| 壁 | `seamless tileable texture of a volcanic cave wall, rough black basalt rock with thin glowing red-orange lava cracks, ash dust` |
| 床 | `seamless tileable texture of a volcanic cave floor seen from directly above, cracked dark basalt slabs with faint glowing ember lines and ash` |
| 天井 | `seamless tileable texture of a volcanic cave ceiling seen from directly below, jagged dark rock with soot and a faint red glow` |
| 扉 | `a single heavy dungeon door panel seen straight from the front, filling the whole frame, scorched dark iron plates riveted on charred wood, faint ember glow in the seams`（扉の決まりは試しの4番と同じ。`--ar 3:4`、tile なし） |

### 静寂の地下墓地 `catacomb`（古いレンガのアーチ、緑がかった霧）
| 部位 | 題材の一文 |
|---|---|
| 壁 | `seamless tileable texture of an ancient catacomb wall, old sandy beige bricks and small empty burial niches, cobwebs, cold greenish tint` |
| 床 | `seamless tileable texture of a catacomb floor seen from directly above, worn uneven bricks with dust and thin mist, cold greenish tint` |
| 天井 | `seamless tileable texture of a catacomb vaulted ceiling seen from directly below, dark old bricks with cobwebs and damp stains` |
| 扉 | `a single old crypt door panel seen straight from the front, filling the whole frame, grey weathered wood planks with rusted iron straps, faint greenish damp stains` |

### 魔王城 `castle`（黒い瓦と朱塗りの柱、赤い月。東洋風の魔の城）
| 部位 | 題材の一文 |
|---|---|
| 壁 | `seamless tileable texture of a dark demon castle wall, black lacquered stone blocks with crimson red trim lines and faint gold ornaments, eastern fantasy style` |
| 床 | `seamless tileable texture of a dark castle floor seen from directly above, polished black stone tiles with thin crimson inlay lines` |
| 天井 | `seamless tileable texture of a dark castle ceiling seen from directly below, black lacquered wooden beams and coffered panels with dark red accents` |
| 扉 | `a single dark castle door panel seen straight from the front, filling the whole frame, black lacquered wood with crimson red panels and dark iron studs, eastern fantasy style` |

### 迷いの森の洞窟 `forestCave`（苔と木の根、小さく光るキノコ、暗い緑）
| 部位 | 題材の一文 |
|---|---|
| 壁 | `seamless tileable texture of a forest cave wall, dark earth and rock covered with thick moss and tangled tree roots, a few tiny glowing orange mushrooms` |
| 床 | `seamless tileable texture of a forest cave floor seen from directly above, packed dark soil with moss patches, small stones and roots` |
| 天井 | `seamless tileable texture of a forest cave ceiling seen from directly below, dark rock with hanging roots and dripping moss` |
| 扉 | `a single rough wooden door panel seen straight from the front, filling the whole frame, mossy logs bound with twisted roots and vines` |

### ボスの門（ダンジョンごと・任意。5枚）
```
a grand double door gate seen straight from the front, filling the whole frame edge to edge, two tall heavy leaves meeting at a center seam, <ダンジョンの材質>, ornate gold trim along the edges, imposing and ominous, muted colors, painterly digital painting, flat front view, evenly lit, no frame, no wall, no arch, no handles, no crown, no text --ar 3:4
```
`<ダンジョンの材質>` の例: 神殿 `carved pale stone with ivy`、溶岩 `scorched black iron`、地下墓地 `old bronze with skull reliefs`、魔王城 `black lacquer with crimson panels`、森の洞窟 `ancient dark wood with roots`。

## できた絵の渡し方（オーナー → Claude）

1. Midjourney で4枚出た中から一番良い1枚を選んで拡大（Upscale）する。`--tile` の絵は、Midjourney の「タイル表示」でつなぎ目が目立たないか見てから選ぶ。
2. 元の画像を `temple-wall.png` のような名前で渡す（`incoming/` など、場所は今までと同じでよい）。
3. Claude が WebP に変換して `src/assets/art/dungeon/` に置き（背景の切り抜きは不要）、通路の絵で、つなぎ目・暗さ・扉の見え方を確かめる。濃すぎる・明るすぎる時は、絵を直さずにゲーム側の暗さの量で合わせる。
