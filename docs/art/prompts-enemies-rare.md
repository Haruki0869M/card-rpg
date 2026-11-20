# レアの敵10体と隠しボス4体の絵の指示文（K3 C・Midjourney に貼る形）

`docs/archive/tasks/K3-more-enemies.md` の C「隠し・レアの敵」の絵。**絵だけ先に決める**ので、データ（HP・行動など）は後で書く。敵ID・名前・出る場所は、後でデータにもそのまま使う（提案）。

- **レアの敵**: 地域の通常の敵の「普段と違う色・飾りの付いた別の種」。徘徊する敵の約6%で入れ替わって出る（地図に金の縁と★）。HP・攻撃は同じ地域の通常の敵の約1.5倍、経験値・ゴールドは約3倍。名前に★が付く。
- **隠しボス**: イベントの戦闘（名所・突発イベント）にだけ出る。エリート〜ボスの強さ。専用の物語を持つ。倒すとレア以上の装備が必ず出る。
- 作風・参照・書き方は `prompts-enemies-frozenKingdom-mj.md`（ブランチ `claude/j4-prompts-9ade08` のコミット bb920ce）と同じ。今ゲームに入っている敵の絵（細かく描き込んだ手描き風のファンタジー画）に合わせる。
- お手本は `--sref` で公開中の敵の絵2枚を指定。画面の「Style References」は空にする。
- 持たせない物は文の中に書かず、最後の `--no` にまとめる。白背景・1体のみ・左向きの3/4・全身。切り抜きは `scripts/art/build_art.py`。
- 元画像は、オーナーが `C:\dev\card-rpg-assets\enemy\<敵ID>.png` に置く。
- **レアの敵は、普通の敵と見分けがつくよう、金の飾り・光る目・大きな角など「特別な印」を1つ必ず入れる**（地図では金の縁と★が付くが、戦闘の絵でも特別に見えるように）。
- 割り振り（提案）: レア10体 = 侵食の魔王2・凍てつく王国2・呪われた群島2・砂塵の王朝1・星降る天空城1・機械仕掛けの帝国2。隠しボス4体 = 侵食の魔王・呪われた群島・星降る天空城・機械仕掛けの帝国に各1。

## レアの敵（10体）

### goldenWolf 黄金の森の狼（レア・侵食の魔王・翠の森・元: 森の狼 forestWolf・size 1.0）
置き場所: src/assets/art/enemy/goldenWolf.webp
元画像: `C:\dev\card-rpg-assets\enemy\goldenWolf.png`

```
full body creature illustration of one rare forest wolf with shimmering golden fur and moss green markings, glowing amber eyes, a small gilded leaf crest on the forehead, bare fangs and a proud stance, four visible paws, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with moss green and rich gold accents, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no armor, rider, weapons, flames, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### crystalGhoul 水晶の沼の亡者（レア・侵食の魔王・嘆きの沼・元: 沼の亡者 bogGhoul・size 1.05）
置き場所: src/assets/art/enemy/crystalGhoul.webp
元画像: `C:\dev\card-rpg-assets\enemy\crystalGhoul.png`

```
full body creature illustration of one rare swamp ghoul with sickly grey-green skin and sharp violet crystals growing from its back and shoulders, hollow glowing white eyes, long bare clawed hands hanging forward, hunched posture, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with murky olive green and glowing violet crystal accents, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapon, armor, clothing, second creature, ground shadow, scenery, pedestal, signature, text, watermark
```

### whiteStag 白銀の牡鹿（レア・凍てつく王国・雪林・size 1.1）
置き場所: src/assets/art/enemy/whiteStag.webp
元画像: `C:\dev\card-rpg-assets\enemy\whiteStag.png`

```
full body creature illustration of one rare majestic white stag with silvery fur, huge branching antlers made of translucent ice crystals, pale blue glowing eyes and a mist of frost around its hooves, noble head raised, four visible hooves, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue and silver tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no rider, saddle, armor, weapons, snow ground, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### frostBellKnight 霜鈴の亡霊騎士（レア・凍てつく王国・城・size 1.2）
置き場所: src/assets/art/enemy/frostBellKnight.webp
元画像: `C:\dev\card-rpg-assets\enemy\frostBellKnight.png`

```
full body creature illustration of one rare ghostly knight in pale blue frozen plate armor hung with small silver bells and icicles, a closed helm with two glowing white eyes, exactly one slender ice-blue sword held low in the right hand, a torn white cloak, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with cold pale blue and silver tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no shield, bow, second weapon, horse, crown, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### pearlCrab 真珠の大蟹（レア・呪われた群島・港・size 1.0）
置き場所: src/assets/art/enemy/pearlCrab.webp
元画像: `C:\dev\card-rpg-assets\enemy\pearlCrab.png`

```
full body creature illustration of one rare giant crab with a glossy pearl-white shell inlaid with small glowing pearls, two large pale pink claws raised, stalked eyes, eight jointed legs, a few strands of seaweed hanging from the shell, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with sea-fog blue-green and pearly white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapon, rider, water, waves, sand, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### lanternGhostCaptain 灯火の幽霊船乗り（レア・呪われた群島・霧・size 1.1）
置き場所: src/assets/art/enemy/lanternGhostCaptain.webp
元画像: `C:\dev\card-rpg-assets\enemy\lanternGhostCaptain.png`

```
full body creature illustration of one rare translucent ghost sailor in a long tattered captain's coat and a three-cornered hat, pale blue-white body fading into mist below the knees, exactly one old brass lantern with a cold green flame held in the right hand, hollow glowing eyes, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with sea-fog blue-green and pale ghostly white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, pistol, ship, anchor, second lantern, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### goldenScarab 黄金の聖甲虫（レア・砂塵の王朝・砂丘・size 1.0）
置き場所: src/assets/art/enemy/goldenScarab.webp
元画像: `C:\dev\card-rpg-assets\enemy\goldenScarab.png`

```
full body creature illustration of one rare giant scarab beetle with a polished solid gold shell engraved with fine ancient hieroglyph patterns, a small blue turquoise gem on the forehead, six sturdy legs and short curved mandibles, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with golden sand, faded red earth and old bronze tones with turquoise accent, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no wings, humanoid arms, weapon, sand pile, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### starlitSwan 星屑をまとう白鳥（レア・星降る天空城・丘・size 1.0）
置き場所: src/assets/art/enemy/starlitSwan.webp
元画像: `C:\dev\card-rpg-assets\enemy\starlitSwan.png`

```
full body creature illustration of one rare graceful swan with deep indigo feathers dusted with tiny glowing gold star specks, a pale gold crescent mark on the forehead, long elegant neck, wings half spread, a faint trail of starlight behind the tail feathers, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with night indigo, pale gold and soft white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no human, rider, crown, weapon, clouds, lake, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### brassClockCat 真鍮の時計猫（レア・機械仕掛けの帝国・街・size 0.9）
置き場所: src/assets/art/enemy/brassClockCat.webp
元画像: `C:\dev\card-rpg-assets\enemy\brassClockCat.png`

```
full body creature illustration of one rare clockwork cat with a polished brass body of overlapping plates, a small round clock face set in its chest, a tiny winding key on its back, copper whiskers, bright red glowing lens eyes, long jointed tail, sitting alert, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with sooty brass, copper and white steam tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no human, rider, weapon, gears scattered on the ground, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### crimsonSteamHound 紅蓮の蒸気猟犬（レア・機械仕掛けの帝国・谷・size 1.0）
置き場所: src/assets/art/enemy/crimsonSteamHound.webp
元画像: `C:\dev\card-rpg-assets\enemy\crimsonSteamHound.png`

```
full body creature illustration of one rare mechanical hound with a dark copper and soot-black plated body, glowing red furnace light leaking from seams in its ribs, white steam venting from two small chimney pipes on its back, sharp riveted iron fangs, four piston legs, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with sooty copper, white steam and glowing red tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no human, rider, weapon, wings, large flames, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

## 隠しボス（4体）

### hollowDemonLord 空ろな魔王の影（隠しボス・侵食の魔王・魔王城の荒野・size 1.5）
物語（提案）: 倒された先代の魔王の影が、荒野の廃墟に残っている。目覚めると「まだ終わっていない」とつぶやく。
置き場所: src/assets/art/enemy/hollowDemonLord.webp（変身後は hollowDemonLord-1.webp）
元画像: `C:\dev\card-rpg-assets\enemy\hollowDemonLord.png`、変身後 `hollowDemonLord-1.png`

```
full body creature illustration of the hollow shadow of a fallen demon lord, a tall hollow silhouette of black smoke shaped like a horned king in a tattered cape, only a cracked horned crown and two dim red eyes clearly visible, one long broken sword of black iron held in the right hand, cracks of faded crimson light across the chest, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with dark slate, faded crimson and tarnished iron, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no shield, bow, second weapon, throne, castle, fire, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

変身後（HPが半分以下）:

```
full body creature illustration of the same hollow demon lord shadow in a second enraged form, the black smoke body swollen and torn open with bright crimson light pouring from the chest, the horned crown now blazing red, the broken sword reforged into a jagged blade of red flame-colored iron, arms spread wide, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with dark slate, crimson and tarnished iron, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no shield, bow, second weapon, throne, castle, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### drownedBride 沈んだ花嫁（隠しボス・呪われた群島・霧・size 1.3）
物語（提案）: 亡霊提督が守れなかった婚礼の船の花嫁。霧の中で、迎えに来ない花婿を待ち続けている。
置き場所: src/assets/art/enemy/drownedBride.webp（変身後は drownedBride-1.webp）
元画像: `C:\dev\card-rpg-assets\enemy\drownedBride.png`、変身後 `drownedBride-1.png`

```
full body creature illustration of a drowned bride ghost in a long white wedding gown stained with seaweed and sea-green water, a torn veil floating around her head, pale blue translucent skin, exactly one wilted bouquet of white flowers held to her chest, long wet hair drifting upward, sorrowful hollow eyes, gown dissolving into mist at the hem, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with sea-fog blue-green, ghostly white and tarnished silver, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapon, ship, sea waves, groom, crown, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

変身後（HPが半分以下）:

```
full body creature illustration of the same drowned bride ghost in a second sorrowful form, the white gown now black and torn with writhing sea-green tendrils of water rising from the hem like a kraken's arms, the veil flowing wildly, eyes glowing pale green with tears of seawater streaming, the withered bouquet turned to a bundle of coral, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep sea-fog green, ghostly white and tarnished silver, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapon, ship, sea waves, groom, crown, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### fallenStarSerpent 落ちた星の竜（隠しボス・星降る天空城・星見の丘・size 1.5）
物語（提案）: 夜空から落ちた星のかけらが竜の形に固まり、丘の上で眠っている。触れると、星の光で目を覚ます。
置き場所: src/assets/art/enemy/fallenStarSerpent.webp（変身後は fallenStarSerpent-1.webp）
元画像: `C:\dev\card-rpg-assets\enemy\fallenStarSerpent.png`、変身後 `fallenStarSerpent-1.png`

```
full body creature illustration of a long serpentine dragon formed from cracked dark blue star-stone with glowing pale gold light leaking from the cracks, a horned head with two white shining eyes, a body coiled in an S shape, small crystalline star shards embedded along its spine and a tail ending in a bright star crystal, no wings, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with night indigo, pale gold and soft white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no wings, rider, weapon, clouds, planets, castle, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

変身後（HPが半分以下）:

```
full body creature illustration of the same star-stone serpent dragon in a second awakened form, the dark stone body split open and blazing with brilliant white-gold starlight, a ring of floating star shards circling its head like a crown, jaws wide open releasing a beam of pale light, spine ridges glowing, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with night indigo, bright gold and white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no wings, rider, weapon, clouds, planets, castle, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### ancientEngineHeart 眠れる原初の機関（隠しボス・機械仕掛けの帝国・動力炉・size 1.5）
物語（提案）: 帝国が作られる前から動いていた、最初の機械の心臓。誰も止め方を知らず、今も静かに回り続けている。
置き場所: src/assets/art/enemy/ancientEngineHeart.webp（変身後は ancientEngineHeart-1.webp）
元画像: `C:\dev\card-rpg-assets\enemy\ancientEngineHeart.png`、変身後 `ancientEngineHeart-1.png`

```
full body creature illustration of an enormous ancient mechanical engine heart, a rounded core of tarnished brass and copper plates bound with riveted iron bands, a large dim red glowing lens at the center like an eye, four thick piston arms folded around it, thin white steam rising from valve pipes, old worn engravings on the plates, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with sooty brass, copper, white steam and deep red glow, facing left three-quarter view, entire object visible from top to bottom, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no human, face, weapon, factory, chimneys, pipes on the ground, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

変身後（HPが半分以下）:

```
full body creature illustration of the same ancient mechanical engine heart in a second overdriven form, the plates blown apart to reveal a blazing white-red core, the four piston arms extended wide and spinning gears exposed, thick white steam bursting from every valve, cracked brass shell glowing at the seams, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with sooty brass, copper, white steam and bright red glow, facing left three-quarter view, entire object visible from top to bottom, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no human, face, weapon, factory, chimneys, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

## build_art.py の ENEMIES 表へ足す行（番号はオーナーが決めたら入れる）

```python
    'goldenWolf': (None, 1.0),  # 番号未定
    'crystalGhoul': (None, 1.0),
    'whiteStag': (None, 1.0),
    'frostBellKnight': (None, 1.0),
    'pearlCrab': (None, 1.0),
    'lanternGhostCaptain': (None, 1.0),
    'goldenScarab': (None, 1.0),
    'starlitSwan': (None, 1.0),
    'brassClockCat': (None, 1.0),
    'crimsonSteamHound': (None, 1.0),
    'hollowDemonLord': (None, 1.0),  # 隠しボス。変身後 hollowDemonLord-1
    'drownedBride': (None, 1.0),  # 隠しボス。変身後 drownedBride-1
    'fallenStarSerpent': (None, 1.0),  # 隠しボス。変身後 fallenStarSerpent-1
    'ancientEngineHeart': (None, 1.0),  # 隠しボス。変身後 ancientEngineHeart-1
```
