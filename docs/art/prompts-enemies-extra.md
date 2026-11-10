# 各シナリオの追加の敵15体の絵の指示文（K3 D・Midjourney に貼る形）

`docs/archive/tasks/K3-more-enemies.md` の D「2〜6本目に各+3体」の絵。**絵だけ先に決める**ので、データ（HP・行動など）は後で書く。敵ID・名前・出る場所は、後でデータにもそのまま使う（提案）。

- 追加の15体 = 新しい絵が要る敵10体（各シナリオ2体）+ 亜種5体（各シナリオ1体。元の敵の絵を使い回す）。亜種は指示文を書かない。
- 作風・参照・書き方は `prompts-enemies-frozenKingdom-mj.md`（ブランチ `claude/j4-prompts-9ade08` のコミット bb920ce）と同じ。今ゲームに入っている敵の絵（細かく描き込んだ手描き風のファンタジー画）に合わせる。`docs/art/style-reference.png` は古い作風なので使わない。
- お手本は `--sref` で公開中の敵の絵2枚を指定。画面の「Style References」は空にする。
- 持たせない物は文の中に書かず、最後の `--no` にまとめる。白背景・1体のみ・左向きの3/4・全身。切り抜きは `scripts/art/build_art.py`。
- 元画像は、オーナーが `C:\dev\card-rpg-assets\enemy\<敵ID>.png` に置く。
- 各シナリオの雰囲気は `docs/tasks/K4-*-enemies.md` の絵の指示文の節に合わせた。

## 一覧（提案）

| シナリオ | 敵ID | 名前 | 種別 | 地域 | Lv | 弱点・耐性のメモ |
|---|---|---|---|---|---|---|
| 凍てつく王国 | `iceFisher` | 氷の釣り人 | 新（絵あり） | 湖 | 5 | 氷耐性。火が弱点 |
| 凍てつく王国 | `frostMoth` | 霜蛾 | 新（絵あり） | 雪林 | 3 | 氷耐性。火が弱点。麻痺は使わず脆弱 |
| 凍てつく王国 | `stormSnowOwl` | 雷の白梟 | 亜種 | 山脈 | 7 | `snowOwl` の亜種。羽ばたきを雷属性に。オーラ `storm` |
| 呪われた群島 | `driftwoodSpirit` | 流木の精霊 | 新 | 港・珊瑚 | 3 | 火が弱点。毒耐性 |
| 呪われた群島 | `lanternAngler` | 提灯鮟鱇 | 新 | 沈没船 | 9 | 雷が弱点。灯りで脆弱 |
| 呪われた群島 | `cursedPirateGrunt` | 呪われた海賊の下っ端 | 亜種 | 島々 | 7 | `pirateGrunt` の亜種。攻撃を闇属性に。オーラ `shadow` |
| 砂塵の王朝 | `desertFennec` | 砂漠狐 | 新 | 入口・廃墟 | 3 | 氷が弱点。火耐性 |
| 砂塵の王朝 | `obeliskSentinel` | オベリスクの番人 | 新 | 谷 | 7 | 雷が弱点。硬い |
| 砂塵の王朝 | `venomMummyArcher` | 毒矢のミイラ兵 | 亜種 | 王宮前 | 9 | `mummyArcher` の亜種。矢に毒。オーラ `venom` |
| 星降る天空城 | `cometFox` | 彗星の狐 | 新 | 丘 | 5 | 闇が弱点。聖耐性 |
| 星降る天空城 | `harpGuardian` | 竪琴の守り人 | 新 | 庭園 | 7 | 闇が弱点。歌で脆弱 |
| 星降る天空城 | `holyMoonWolf` | 聖なる月の狼 | 亜種 | 前庭 | 9 | `moonWolf` の亜種。攻撃を聖属性に。オーラ `holy` |
| 機械仕掛けの帝国 | `smokeStackCrow` | 煙突の鴉 | 新 | 街 | 2 | 雷が弱点。火傷を付ける |
| 機械仕掛けの帝国 | `pressGolem` | プレス機の人形 | 新 | 工場 | 5 | 雷が弱点。一撃が重い |
| 機械仕掛けの帝国 | `ironClockworkDog` | 鋼のゼンマイ犬 | 亜種 | 炉 | 7 | `clockworkDog` の亜種。開幕にブロック。オーラ `iron` |

亜種の `stormSnowOwl` などは、亜種の決まり（属性か開幕特性を変える・オーラを付ける）に従ってデータを書く。絵は元の敵のものを使うので、指示文は下に無い。

## 凍てつく王国（青白い光、氷の結晶、雪、冷たい影）

### iceFisher 氷の釣り人（凍てつく王国・湖・通常・size 1.0）
置き場所: src/assets/art/enemy/iceFisher.webp
元画像: `C:\dev\card-rpg-assets\enemy\iceFisher.png`

```
full body creature illustration of one frozen human ice fisherman in a thick tattered fur-trimmed coat and a pointed hood, pale blue frost-covered skin with glowing white eyes, exactly one long wooden fishing rod ending in a sharp icy hook held in both hands, a small frozen fish dangling from the line, icicles hanging from the beard, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue and steel gray tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, bow, spear, bucket, boat, lake, ice hole, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### frostMoth 霜蛾（凍てつく王国・雪林・通常・size 0.8）
置き場所: src/assets/art/enemy/frostMoth.webp
元画像: `C:\dev\card-rpg-assets\enemy\frostMoth.png`

```
full body creature illustration of one large frost moth with broad pale blue wings patterned like snowflakes and dusted with glittering frost, a soft white furry body, two feathery antennae and large dark round eyes, wings spread open facing the viewer slightly turned left, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue and silver tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no humanoid hands, weapon, flowers, second moth, snowfall, ground shadow, scenery, pedestal, signature, text, watermark
```

## 呪われた群島（青緑の霧、濡れた木と錆びた金具、幽霊は半透明で青白い）

### driftwoodSpirit 流木の精霊（呪われた群島・港・珊瑚・通常・size 0.9）
置き場所: src/assets/art/enemy/driftwoodSpirit.webp
元画像: `C:\dev\card-rpg-assets\enemy\driftwoodSpirit.png`

```
full body creature illustration of one small spirit made of tangled sun-bleached driftwood, a rough humanoid shape with branch-like arms and a mask-like face carved by waves, dripping seaweed on its shoulders, barnacles on the wood, faint pale green glow in the eye hollows, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with sea-fog blue-green and wet weathered wood brown, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapon, ship, anchor, water, waves, second creature, ground shadow, scenery, pedestal, signature, text, watermark
```

### lanternAngler 提灯鮟鱇（呪われた群島・沈没船・通常・size 1.1）
置き場所: src/assets/art/enemy/lanternAngler.webp
元画像: `C:\dev\card-rpg-assets\enemy\lanternAngler.png`

```
full body creature illustration of one large deep sea anglerfish with a wide mouth full of long needle teeth, dark mottled green-black skin with barnacles and rusty iron fragments stuck to it, exactly one long fleshy stalk rising from the head ending in a glowing pale green lantern, small cold eyes, short stubby fins, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with sea-fog blue-green and tarnished iron tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no human, rider, second lantern, shipwreck, water, bubbles, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

## 砂塵の王朝（金色の砂、褪せた赤土、古い青銅と包帯の白）

### desertFennec 砂漠狐（砂塵の王朝・入口・廃墟・通常・size 0.85）
置き場所: src/assets/art/enemy/desertFennec.webp
元画像: `C:\dev\card-rpg-assets\enemy\desertFennec.png`

```
full body creature illustration of one small desert fennec fox with huge pointed ears, sandy golden fur and a cream chest, a thin band of old bronze beads around the neck, sharp amber eyes and a bushy tail with a dark tip, crouching alert stance with bare small fangs, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with golden sand, faded red earth and old bronze tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no armor, weapon, rider, flames, second creature, sand dunes, ground shadow, scenery, pedestal, signature, text, watermark
```

### obeliskSentinel オベリスクの番人（砂塵の王朝・谷・通常・size 1.15）
置き場所: src/assets/art/enemy/obeliskSentinel.webp
元画像: `C:\dev\card-rpg-assets\enemy\obeliskSentinel.png`

```
full body creature illustration of one living stone obelisk guardian, a tall narrow sandstone pillar body carved with faded hieroglyph patterns and bands of old bronze, two heavy blocky stone arms hanging at its sides, one large glowing amber eye set in the upper part like a carved eye symbol, a broken pointed top, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with golden sand, faded red earth and old bronze tones, facing left three-quarter view, entire body visible from top to bottom, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapon, shield, human face, legs, wings, ruins, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

## 星降る天空城（夜空の紺と金、白い雲、淡い月光。天使の像は白い大理石と金の縁。時計仕掛けは真鍮と歯車）

### cometFox 彗星の狐（星降る天空城・星見の丘・通常・size 0.9）
置き場所: src/assets/art/enemy/cometFox.webp
元画像: `C:\dev\card-rpg-assets\enemy\cometFox.png`

```
full body creature illustration of one graceful fox with deep indigo fur and a long luminous tail that trails like a comet, the tail tip blazing pale gold with small star sparks, white chest fur, bright gold eyes, running stance with all four paws visible, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with night indigo, pale gold and soft white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no wings, armor, rider, weapon, planets, clouds, second creature, ground shadow, scenery, pedestal, signature, text, watermark
```

### harpGuardian 竪琴の守り人（星降る天空城・月の庭園・通常・size 1.1）
置き場所: src/assets/art/enemy/harpGuardian.webp
元画像: `C:\dev\card-rpg-assets\enemy\harpGuardian.png`

```
full body creature illustration of one serene statue-like guardian carved from white marble with gold edging, a long flowing robe and a faceless smooth face with a thin gold circlet, exactly one golden harp held in both hands with glowing star-white strings, small stone wings folded on the back, graceful standing pose, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with night indigo accents, white marble and pale gold tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, spear, shield, bow, second instrument, garden, flowers, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

## 機械仕掛けの帝国（煤けた真鍮と銅、白い蒸気、赤く光る炉。機械兵の顔は無表情な仮面）

### smokeStackCrow 煙突の鴉（機械仕掛けの帝国・街・通常・size 0.8）
置き場所: src/assets/art/enemy/smokeStackCrow.webp
元画像: `C:\dev\card-rpg-assets\enemy\smokeStackCrow.png`

```
full body creature illustration of one soot-black crow with feathers stained dark grey by chimney smoke, small brass rivets and a tiny copper plate fitted over one eye like a monocle, glowing orange ember in the other eye, sharp iron-colored beak and talons, wings half spread in a perched pose, thin wisps of smoke rising from the feathers, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with sooty brass, copper and white steam tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no human, rider, weapon, chimney, perch, flames, second bird, ground shadow, scenery, pedestal, signature, text, watermark
```

### pressGolem プレス機の人形（機械仕掛けの帝国・工場・通常・size 1.15）
置き場所: src/assets/art/enemy/pressGolem.webp
元画像: `C:\dev\card-rpg-assets\enemy\pressGolem.png`

```
full body creature illustration of one bulky humanoid machine golem built from riveted iron plates and dark copper, exactly one enormous flat hydraulic press block in place of the right fist, a smaller normal clenched left fist, a blank featureless iron mask face with a single narrow red glowing slit, thick short legs on heavy piston joints, white steam venting from the shoulders, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with sooty brass, copper, white steam and dull red glow, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, gun, shield, second press, factory, conveyor belt, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

## build_art.py の ENEMIES 表へ足す行（番号はオーナーが決めたら入れる）

```python
    'iceFisher': (None, 1.0),  # 番号未定
    'frostMoth': (None, 1.0),
    'driftwoodSpirit': (None, 1.0),
    'lanternAngler': (None, 1.0),
    'desertFennec': (None, 1.0),
    'obeliskSentinel': (None, 1.0),
    'cometFox': (None, 1.0),
    'harpGuardian': (None, 1.0),
    'smokeStackCrow': (None, 1.0),
    'pressGolem': (None, 1.0),
```
