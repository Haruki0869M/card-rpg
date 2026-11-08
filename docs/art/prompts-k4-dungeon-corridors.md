# 2〜7本目：ダンジョンの通路の絵（壁・床・天井・扉）の指示文（Midjourney）

全体の一覧と、読み込みの1行は `k4-art-inventory.md`。**ひな形と決まりは `prompts-dungeon.md` と同じ**（試しの4枚の翠の神殿が合格した形）。ここは、24ダンジョンの「題材の一文」の表。**英語は、コードの枠の中と表の題材だけ。**

置き場所: `src/assets/art/dungeon/<ダンジョンID>-<wall|floor|ceiling|door>.webp`。置くだけで使われる（背景の名前を、ダンジョンのIDに切り替える1行は、絵ができてから Claude が足す）。

## ひな形（`<題材>` を表の英語に置き換える）

壁（`--tile`・正方形）:
```
seamless tileable texture of <壁の題材>, muted desaturated colors, painterly digital painting, flat orthographic front view, evenly lit, no perspective, no vignette, no torch, no text --tile --ar 1:1
```

床（真上から）:
```
seamless tileable texture of <床の題材> seen from directly above, painterly digital painting, flat top-down orthographic view, evenly lit, no perspective, no vignette, no text --tile --ar 1:1
```

天井（真下から）:
```
seamless tileable texture of <天井の題材> seen from directly below, painterly digital painting, flat orthographic view, evenly lit, no perspective, no vignette, no text --tile --ar 1:1
```

扉（片開きの扉の板だけ。枠・壁・取っ手・アーチは入れない）:
```
a single <扉の題材> door panel seen straight from the front, filling the whole frame edge to edge, muted colors, painterly digital painting, flat front view, evenly lit, no frame, no wall, no arch, no handles, no text --ar 3:4
```

ボスの門（任意。両開き。王冠の印はゲームが重ねるので入れない）:
```
a grand double door gate seen straight from the front, filling the whole frame edge to edge, two tall heavy leaves meeting at a center seam, <ボスの門の材質>, ornate trim along the edges, imposing and ominous, muted colors, painterly digital painting, flat front view, evenly lit, no frame, no wall, no arch, no handles, no crown, no text --ar 3:4
```

壁と床と天井の色合いは、ダンジョンの世界（表の「雰囲気」）に合わせる。**同じダンジョンの4枚は、色と材質をそろえる**（通路で並べて見えるため）。

---

## 凍てつく王国

| ID | 雰囲気 | 壁 | 床 | 天井 | 扉 | ボスの門 |
|---|---|---|---|---|---|---|
| `crystalCave` 氷晶の洞 | 青白い氷の結晶と凍った岩 | `a cave wall of frosted grey rock with embedded pale blue glowing ice crystals` | `frozen rocky ground with thin ice sheets and frost` | `a cave ceiling of dark frosted rock with hanging blue icicles` | `frost covered rough wooden` | `translucent blue ice with silver trim` |
| `sunkenCathedral` 沈んだ聖堂 | 凍った石の大聖堂 | `a gothic cathedral stone wall, pale blue grey blocks covered with thin frost and carved arches` | `cathedral flagstones under a thin layer of clear ice` | `a cathedral ribbed vault ceiling of pale stone with hanging icicles` | `old dark oak cathedral, frost rimmed iron bands` | `carved pale stone with frozen saint reliefs` |
| `giantMine` 霜の巨人の鉱山 | 木の支えと霜、鉱石 | `a mine tunnel wall of dark rock with wooden support beams, frost and glittering silver ore veins` | `a mine floor of packed frozen dirt with old cart rails and ice patches` | `a mine ceiling of rough dark rock with timber beams and frost` | `heavy timber mine with frosty iron straps` | `black iron plates with frost and silver ore` |
| `iceCastle` 氷の城 | 薄青い氷の石と銀 | `a castle wall of polished pale blue ice stone blocks with thin silver trim lines` | `polished pale blue ice tiles with silver inlay lines` | `a castle ceiling of pale ice vaulting with silver ribs and frost` | `pale blue frozen wood with silver studs` | `white ice with ornate silver trim` |

## 呪われた群島

| ID | 雰囲気 | 壁 | 床 | 天井 | 扉 | ボスの門 |
|---|---|---|---|---|---|---|
| `wreckCave` 難破船の洞窟 | 濡れた岩と船の木材 | `a sea cave wall of wet dark rock with barnacles and embedded old ship timbers` | `wet cave floor of dark stone with shallow puddles and seaweed` | `a sea cave ceiling of dark dripping rock with hanging seaweed` | `waterlogged old ship plank` | `rotten ship hull timbers with rusty bolts` |
| `pirateIsland` 海賊の隠れ島 | 暗い木の板とロープ | `a pirate hideout wall of dark wooden planks with old ropes and nailed maps` | `worn wooden plank floor with scattered coins and sand` | `a low ceiling of dark wooden beams with hanging ropes` | `sturdy dark wooden pirate ship cabin` | `black wood with brass skull reliefs` |
| `sunkenTemple` 沈んだ神殿 | 珊瑚に覆われた青緑の石 | `an ancient temple wall of teal stone blocks encrusted with coral and shells` | `temple stone floor with shallow water, sand and small shells` | `a temple ceiling of teal stone with hanging coral` | `ancient teal bronze, shell encrusted` | `teal bronze with coral and pearl trim` |
| `ghostFlagship` 嘆きの王冠号 | 青白く光る幽霊船の木 | `a ghost ship hull wall of rotten dark wood planks with faint pale blue glow in the cracks` | `a ghost ship deck of grey weathered planks with faint blue mist` | `a ghost ship ceiling of old beams with torn cloth and pale blue lights` | `pale rotten wood ship` | `grey ghost wood with spectral blue gold trim` |

## 砂塵の王朝

| ID | 雰囲気 | 壁 | 床 | 天井 | 扉 | ボスの門 |
|---|---|---|---|---|---|---|
| `scorpionTomb` 蠍の墓所 | 砂岩の古い墓 | `an ancient tomb wall of sandy beige sandstone blocks with faded hieroglyph carvings` | `worn sandstone floor tiles with drifted sand` | `a tomb ceiling of dark sandstone slabs with cobwebs` | `old sun bleached wooden tomb` | `weathered sandstone with scorpion reliefs` |
| `shadowLibrary` 影の書庫 | 暗い砂岩と巻物の棚 | `a dark underground library wall of sandstone with shelves full of old scrolls` | `a dark sandstone floor with scattered papyrus scraps` | `a vaulted sandstone ceiling with soot stains` | `dark carved cedar wood` | `dark cedar with gold scroll reliefs` |
| `statueTemple` 石像の神殿 | 巨大な彫刻の砂岩 | `a colossal temple wall of carved sandstone with large relief figures and gold inlay` | `a temple floor of large polished sandstone slabs with gold lines` | `a temple ceiling of carved sandstone beams painted with faded blue stars` | `carved stone slab` | `carved sandstone with gold guardian reliefs` |
| `sandPalace` 砂塵の王宮 | 金色の王宮 | `a pharaoh palace wall of golden sandstone with gold leaf ornaments and lapis blue inlay` | `a palace floor of polished sandstone tiles with gold inlay patterns` | `a palace ceiling of gold painted beams with deep blue star patterns` | `gold trimmed cedar` | `solid gold with lapis blue inlay` |

## 星降る天空城

| ID | 雰囲気 | 壁 | 床 | 天井 | 扉 | ボスの門 |
|---|---|---|---|---|---|---|
| `windmillTower` 風車の塔 | 白い石と木の歯車 | `a tower wall of white plaster and stone with wooden gear mechanisms` | `a worn wooden plank floor with white dust` | `a tower ceiling of wooden beams with turning wooden gears` | `light painted wooden` | `white painted wood with brass gear reliefs` |
| `observatory` 星見の天文台 | 紺と真鍮 | `an observatory wall of deep navy painted plaster with brass fittings and faint star chart drawings` | `a dark blue stone floor with inlaid brass star compass lines` | `a dome ceiling painted with a night sky of gold stars on deep navy` | `navy lacquered wood with brass studs` | `navy lacquer with brass star reliefs` |
| `moonlitGarden` 月光の庭 | 月明かりの大理石と生け垣 | `a garden wall of pale marble covered with trimmed hedge and white flowers` | `a marble garden path with small white petals and moonlit dew` | `a trellis ceiling of white marble arches with climbing vines` | `white marble garden gate wood` | `white marble with silver moon reliefs` |
| `skyCastle` 天空城 | 白い大理石と金 | `a castle wall of white marble blocks with gold trim and faint cloud patterns` | `a white marble floor with gold inlay and soft clouds` | `a castle ceiling of white marble vaulting with gold star ornaments` | `white lacquered wood with gold trim` | `white marble and gold with star reliefs` |

## 機械仕掛けの帝国

| ID | 雰囲気 | 壁 | 床 | 天井 | 扉 | ボスの門 |
|---|---|---|---|---|---|---|
| `gearFactory` 歯車の工場 | 鋲打ちの鉄板 | `a factory wall of dark riveted iron plates with rust stains and small gears` | `a factory floor of grey steel grating with oil stains` | `a factory ceiling of riveted iron beams with hanging chains` | `heavy riveted iron factory` | `dark riveted iron with brass gear reliefs` |
| `steamPlant` 蒸気の発電所 | 銅の配管と蒸気 | `a power plant wall of copper pipes and valves over dark iron plates with faint steam` | `a power plant floor of wet iron plates with steam vents` | `a power plant ceiling of tangled copper pipes with dripping condensation` | `riveted copper` | `green patina copper with iron bolts` |
| `clockTower` 時計塔 | 真鍮の歯車と時計 | `a clock tower wall of brass gears and clock face fragments over dark wood panels` | `a clock tower floor of dark wood planks with brass gear inlay` | `a clock tower ceiling of huge brass gears and pendulum rods` | `dark wood and brass clockwork` | `brass with intricate clockwork reliefs` |
| `machineHeart` 大機械の心臓 | 黒い鋼と赤い光 | `a machine core wall of black steel plates with glowing red lines and pipes` | `a black steel floor with glowing red circuit lines` | `a machine core ceiling of black steel pipes with faint red glow` | `black steel with red glowing seams` | `black steel with glowing red seams and gold gears` |

## 夢幻の大迷宮

夢の中の景色なので、**輪郭を少しぼかし、全体に淡い紫の霧をかける**（絵の中でも、はっきりしすぎない）。

| ID | 雰囲気 | 壁 | 床 | 天井 | 扉 | ボスの門 |
|---|---|---|---|---|---|---|
| `echoIceVault` 氷の記憶の洞 | ぼやけた氷と紫の霧 | `a dreamlike blurry ice cave wall of pale blue crystals in a soft purple haze` | `a dreamlike blurry icy floor with faint purple haze` | `a dreamlike ceiling of blurry pale icicles in purple haze` | `a dreamlike pale frosted wooden` | `pale ice with lavender haze and silver trim` |
| `echoSandTomb` 砂の幻影の墓 | ぼやけた砂岩と紫の霧 | `a dreamlike blurry sandstone tomb wall with faded carvings in a soft purple haze` | `a dreamlike blurry sand floor with golden dust in purple haze` | `a dreamlike blurry sandstone ceiling in purple haze` | `a dreamlike faded sandstone slab` | `sandstone and gold with lavender haze` |
| `echoGhostShip` 幽霊船の悪夢 | ぼやけた船の木と紫の霧 | `a dreamlike blurry ghost ship wooden wall with pale teal glow in purple fog` | `a dreamlike blurry ship deck planks in purple fog` | `a dreamlike blurry ship beams with torn cloth in purple fog` | `a dreamlike pale ship cabin wooden` | `grey wood with teal glow and lavender fog` |
| `dreamEaterLair` 夢喰いの巣 | 黒と紫、小さな光の粒 | `a void chamber wall of dark violet smoke with countless faint floating lights` | `a dark violet glassy floor with faint floating lights` | `a dark violet void ceiling with scattered tiny lights` | `a dark violet shadowy` | `black and violet with glowing memory lights` |

---

## 試す順番（提案）

1. まず1本、**凍てつく王国の `crystalCave` の4枚**で試し、通路に貼って見え方（つなぎ目・暗さ・扉の大きさ）を確かめる（翠の神殿の試しと同じやり方）。
2. 合格したら、凍てつく王国の残りの3ダンジョン、続けて他のシナリオ。
3. ボスの門は、任意（絵が無ければ、ふつうの扉を大きくした仮のまま）。

できた絵の渡し方は、`prompts-dungeon.md` の「できた絵の渡し方」と同じ。
