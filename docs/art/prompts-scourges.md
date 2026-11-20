# 災厄のボス8体の絵の指示文（2026-11-14）

- オーナーの決定（2026-11-14）: **新しい敵の絵は Midjourney**。第2形態からは、**Midjourney で作った絵を添付して ChatGPT** に頼む。
- 今は、災厄はほかの敵の絵を借りている（`variantOf`）。絵ができたら `enemy/<ID>.webp`・第2形態は `enemy/<ID>-1.webp` に置き、借りるのをやめる（組み込みは別の作業）。
- 姿は Claude の提案。白狼王・凍て鐘の亡霊・灯を喰らう影は、シナリオ2の新しい災厄（`docs/tasks/scenario2-scourge-enemies-proposal.md`。中身はオーナーの返事待ち）。
- Midjourney: `--sref` は公開中の敵の絵2枚。画面の「Style References」は空にする。白背景・1体・左向きの斜め・全身。
- 元画像の置き場: `C:\dev\card-rpg-assets\enemy\<ID>.png`・`<ID>-1.png`。**英語は、コードの枠の中だけ。**

## 1. 強欲の盗賊王 `scourgeGreedKing`

### ふだんの姿（Midjourney）保存の名前 `scourgeGreedKing.png`
```
full body creature illustration of one huge burly human bandit king, a crooked golden circlet on a shaved scarred head, thick braided beard with gold rings, heavy fur-collared crimson coat over dark leather armor, many gold chains and jeweled rings, exactly one enormous golden battle axe resting on the right shoulder, a greedy confident grin, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with deep crimson, dark brown and tarnished gold tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no shield, sword, bow, second weapon, helmet, horse, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### 第2形態「宝を抱えた盗賊王」（ChatGPT。上でできた絵を添付）保存の名前 `scourgeGreedKing-1.png`
```
添付の絵は、私のゲームの敵「強欲の盗賊王」です。この敵が、戦いの後半に変わった姿「宝を抱えた盗賊王」を描いてください。別の敵ではなく、同じ敵が変化した姿です。

【そのまま残すもの（添付の絵と同じ）】
・体つき・顔・色合い・服や体の模様
・絵柄（細かく描きこんだ手描き風のファンタジー画。線と塗りの感じ）
・向き（左向きの斜め前）と、絵の中での大きさ

【変えるもの】
・左のわきに、金貨と宝石があふれる大きな宝の袋（または宝箱）をしっかり抱えている。足元に金貨がこぼれ落ちている。右手の黄金の大斧は持ったまま。表情は、にやけ顔から「宝を持って逃げ出しそうな、あせった欲ばりの顔」に。体を少し後ろへ引いた姿勢。

【見せ方】
・全身。1体だけ。足の先まで入れる
・背景は真っ白の無地。地面・床の影・景色は描かない
・縦長（4:5）。真ん中に置き、上下左右に少し余白
・描かないもの: 文字・サイン・枠・ほかの敵や人

返事は絵だけで大丈夫です。
```

## 2. 瘴気を紡ぐ死霊術師 `scourgeMiasmaNecro`

### ふだんの姿（Midjourney）保存の名前 `scourgeMiasmaNecro.png`
```
full body creature illustration of one gaunt hunched necromancer, tattered grey-green hooded robes, a pale skull-like face half hidden by the hood, long skeletal fingers spinning thin threads of sickly green mist, exactly one tall bone spindle staff wound with pale thread held in the left hand, small bone charms hanging from the belt, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with sickly green, ash grey and bone white tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no sword, shield, scythe, book, second staff, crown, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### 第2形態「屍の繭の死霊術師」（ChatGPT。上でできた絵を添付）保存の名前 `scourgeMiasmaNecro-1.png`
```
添付の絵は、私のゲームの敵「瘴気を紡ぐ死霊術師」です。この敵が、戦いの後半に変わった姿「屍の繭の死霊術師」を描いてください。別の敵ではなく、同じ敵が変化した姿です。

【そのまま残すもの（添付の絵と同じ）】
・体つき・顔・色合い・服や体の模様
・絵柄（細かく描きこんだ手描き風のファンタジー画。線と塗りの感じ）
・向き（左向きの斜め前）と、絵の中での大きさ

【変えるもの】
・体の下半分と左肩が、灰色がかった白い糸と古い骨でできた「繭（まゆ）」に包まれている。繭から緑の瘴気の糸が何本も伸びて体に巻きついている。顔と右腕、骨の紡ぎ杖は繭の外に出ている。繭のすき間が、緑にぼんやり光る。

【見せ方】
・全身。1体だけ。足の先まで入れる
・背景は真っ白の無地。地面・床の影・景色は描かない
・縦長（4:5）。真ん中に置き、上下左右に少し余白
・描かないもの: 文字・サイン・枠・ほかの敵や人

返事は絵だけで大丈夫です。
```

## 3. 悪夢の魔獣 `scourgeNightmareBeast`

### ふだんの姿（Midjourney）保存の名前 `scourgeNightmareBeast.png`
```
full body creature illustration of one massive four-legged shadow beast shaped like a lion-sized wolf, pitch black fur fading into drifting dark smoke along the mane and tail, many closed eyelids scattered across its shoulders and flanks as if asleep, long curved black claws, the mouth shut with a few fangs showing, prowling low stance, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted dark palette with charcoal black, deep indigo and faint violet tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no wings, horns, rider, armor, weapons, open eyes on the body, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### 第2形態「目覚めた悪夢の魔獣」（ChatGPT。上でできた絵を添付）保存の名前 `scourgeNightmareBeast-1.png`
```
添付の絵は、私のゲームの敵「悪夢の魔獣」です。この敵が、戦いの後半に変わった姿「目覚めた悪夢の魔獣」を描いてください。別の敵ではなく、同じ敵が変化した姿です。

【そのまま残すもの（添付の絵と同じ）】
・体つき・顔・色合い・服や体の模様
・絵柄（細かく描きこんだ手描き風のファンタジー画。線と塗りの感じ）
・向き（左向きの斜め前）と、絵の中での大きさ

【変えるもの】
・体じゅうの閉じていた目が全部ひらいて、紫に光っている。口を大きく開け、長い牙の「大顎」を見せて吠えている。たてがみと尾の黒い煙が、大きく燃え上がるように広がる。体つきと毛の色は同じ。

【見せ方】
・全身。1体だけ。足の先まで入れる
・背景は真っ白の無地。地面・床の影・景色は描かない
・縦長（4:5）。真ん中に置き、上下左右に少し余白
・描かないもの: 文字・サイン・枠・ほかの敵や人

返事は絵だけで大丈夫です。
```

## 4. 氷嵐の魔女 `scourgeStormWitch`

### ふだんの姿（Midjourney）保存の名前 `scourgeStormWitch.png`
```
full body creature illustration of one tall slender ice witch, long white hair blown sideways by wind, pale blue skin, a flowing layered robe of white and pale blue with frost patterns, a high collar of icicles, exactly one long slender ice lance held upright in the right hand, three small shards of mirror-like ice floating near the left hand, cold proud expression, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted cold palette with pale blue, white and silver tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no broom, hat, sword, shield, staff with orb, second weapon, wings, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### 第2形態「氷の鎧の魔女」（ChatGPT。上でできた絵を添付）保存の名前 `scourgeStormWitch-1.png`
```
添付の絵は、私のゲームの敵「氷嵐の魔女」です。この敵が、戦いの後半に変わった姿「氷の鎧の魔女」を描いてください。別の敵ではなく、同じ敵が変化した姿です。

【そのまま残すもの（添付の絵と同じ）】
・体つき・顔・色合い・服や体の模様
・絵柄（細かく描きこんだ手描き風のファンタジー画。線と塗りの感じ）
・向き（左向きの斜め前）と、絵の中での大きさ

【変えるもの】
・ローブの上に、ぎざぎざの厚い氷の鎧（胸当て・肩当て・こて）をまとっている。頭には、つららの冠。氷の槍は、前よりも太く長い。浮いていた鏡のかけらは無くなり、鎧の表面が鏡のように光る。髪・顔・ローブの色は同じ。

【見せ方】
・全身。1体だけ。足の先まで入れる
・背景は真っ白の無地。地面・床の影・景色は描かない
・縦長（4:5）。真ん中に置き、上下左右に少し余白
・描かないもの: 文字・サイン・枠・ほかの敵や人

返事は絵だけで大丈夫です。
```

## 5. 業火の魔人 `scourgeInfernoDemon`

### ふだんの姿（Midjourney）保存の名前 `scourgeInfernoDemon.png`
```
full body creature illustration of one towering muscular demon made of dark cracked volcanic rock, glowing orange fire showing through the cracks, two curved horns, a burning brand mark on the chest, both huge fists wrapped in flames, no weapon, broad heavy stance, smoldering eyes, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted dark palette with charcoal, ember orange and deep red tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapons, sword, axe, shield, wings, armor, tail weapon, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### 第2形態「溶岩を浴びた魔人」（ChatGPT。上でできた絵を添付）保存の名前 `scourgeInfernoDemon-1.png`
```
添付の絵は、私のゲームの敵「業火の魔人」です。この敵が、戦いの後半に変わった姿「溶岩を浴びた魔人」を描いてください。別の敵ではなく、同じ敵が変化した姿です。

【そのまま残すもの（添付の絵と同じ）】
・体つき・顔・色合い・服や体の模様
・絵柄（細かく描きこんだ手描き風のファンタジー画。線と塗りの感じ）
・向き（左向きの斜め前）と、絵の中での大きさ

【変えるもの】
・頭と肩から、どろどろの明るい溶岩が体じゅうに流れ落ちている。体の岩の割れ目が大きく広がり、中が白っぽいオレンジに強く光る。足元に溶岩のしずくが落ちる（地面は描かない）。体つき・角・胸の烙印は同じ。

【見せ方】
・全身。1体だけ。足の先まで入れる
・背景は真っ白の無地。地面・床の影・景色は描かない
・縦長（4:5）。真ん中に置き、上下左右に少し余白
・描かないもの: 文字・サイン・枠・ほかの敵や人

返事は絵だけで大丈夫です。
```

## 6. 白狼王 `scourgeWhiteWolfKing`（シナリオ2の新しい災厄）

### ふだんの姿（Midjourney）保存の名前 `scourgeWhiteWolfKing.png`
```
full body creature illustration of one enormous white wolf king, thick shaggy white fur with a heavy frosted mane, an old scar across the left eye, a row of jagged ice spikes rising from the brow and neck like a crown, pale blue eyes, lips curled to show long fangs, proud standing stance with one front paw forward, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted cold palette with snow white, pale grey and ice blue tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no rider, armor, saddle, collar, weapons, wings, second wolf, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### 第2形態「吹雪をまとう白狼王」（ChatGPT。上でできた絵を添付）保存の名前 `scourgeWhiteWolfKing-1.png`
```
添付の絵は、私のゲームの敵「白狼王」です。この敵が、戦いの後半に変わった姿「吹雪をまとう白狼王」を描いてください。別の敵ではなく、同じ敵が変化した姿です。

【そのまま残すもの（添付の絵と同じ）】
・体つき・顔・色合い・服や体の模様
・絵柄（細かく描きこんだ手描き風のファンタジー画。線と塗りの感じ）
・向き（左向きの斜め前）と、絵の中での大きさ

【変えるもの】
・体の後ろ半分が、うず巻く吹雪に溶けこんで見えにくくなっている。頭・前足・たてがみははっきり見える。目が青白く強く光る。吹雪は狼の体のまわりだけに描き、背景は白の無地のまま。体つき・傷・氷の冠は同じ。

【見せ方】
・全身。1体だけ。足の先まで入れる
・背景は真っ白の無地。地面・床の影・景色は描かない
・縦長（4:5）。真ん中に置き、上下左右に少し余白
・描かないもの: 文字・サイン・枠・ほかの敵や人

返事は絵だけで大丈夫です。
```

## 7. 凍て鐘の亡霊 `scourgeBellWraith`（シナリオ2の新しい災厄）

### ふだんの姿（Midjourney）保存の名前 `scourgeBellWraith.png`
```
full body creature illustration of one floating ghostly bell-ringer wraith, a hollow shadowed face under a deep ragged hood, long tattered pale grey burial robes fading into mist where the legs should be, thin spectral hands, carrying exactly one large frost-covered bronze funeral bell hanging from a short wooden yoke in the left hand, exactly one small bell mallet in the right hand, icicles hanging from the bell rim, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted cold palette with pale grey, frosted bronze and faint gold tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no armor, sword, shield, helmet, knight, horse, lantern, scythe, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### 第2形態「鳴り止まぬ弔鐘」（ChatGPT。上でできた絵を添付）保存の名前 `scourgeBellWraith-1.png`
```
添付の絵は、私のゲームの敵「凍て鐘の亡霊」です。この敵が、戦いの後半に変わった姿「鳴り止まぬ弔鐘」を描いてください。別の敵ではなく、同じ敵が変化した姿です。

【そのまま残すもの（添付の絵と同じ）】
・体つき・顔・色合い・服や体の模様
・絵柄（細かく描きこんだ手描き風のファンタジー画。線と塗りの感じ）
・向き（左向きの斜め前）と、絵の中での大きさ

【変えるもの】
・大きな鐘に、青白く光るひびが入っている。鐘のまわりに、同じ形の小さな半透明の「こだまの鐘」が3つ浮かんでいる。亡霊はフードの奥の口を大きく開けて叫び、槌を高く振り上げている。鐘から、うすい輪の形の音の波が広がる。ローブと鐘の色は同じ。

【見せ方】
・全身。1体だけ。足の先まで入れる
・背景は真っ白の無地。地面・床の影・景色は描かない
・縦長（4:5）。真ん中に置き、上下左右に少し余白
・描かないもの: 文字・サイン・枠・ほかの敵や人

返事は絵だけで大丈夫です。
```

## 8. 灯を喰らう影 `scourgeLightEater`（シナリオ2の新しい災厄）

### ふだんの姿（Midjourney）保存の名前 `scourgeLightEater.png`
```
full body creature illustration of one tall thin shadow creature with a vaguely human shape, a smooth featureless black head with only a wide crescent mouth glowing warm yellow from inside, very long thin arms with long fingers, a body like torn black cloth and smoke with ragged moth-like tatters hanging from the shoulders, exactly one small dim iron lantern held close to the mouth in the left hand as if about to swallow its flame, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted dark palette with soot black, deep violet and a small warm amber glow, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no eyes, horns, wings, weapons, armor, second lantern, moth insect, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### 第2形態「灯を喰らい尽くす影」（ChatGPT。上でできた絵を添付）保存の名前 `scourgeLightEater-1.png`
```
添付の絵は、私のゲームの敵「灯を喰らう影」です。この敵が、戦いの後半に変わった姿「灯を喰らい尽くす影」を描いてください。別の敵ではなく、同じ敵が変化した姿です。

【そのまま残すもの（添付の絵と同じ）】
・体つき・顔・色合い・服や体の模様
・絵柄（細かく描きこんだ手描き風のファンタジー画。線と塗りの感じ）
・向き（左向きの斜め前）と、絵の中での大きさ

【変えるもの】
・飲みこんだ灯が体の中にいくつも入っていて、黒い体が内側から、あちこち暖かい黄色に透けて光っている。体は前より大きくふくらんでいる。手に持った角灯は、火が消えて暗い。口は前より大きく裂けて、中が強く光る。頭の形・長い腕・ぼろぼろの布は同じ。

【見せ方】
・全身。1体だけ。足の先まで入れる
・背景は真っ白の無地。地面・床の影・景色は描かない
・縦長（4:5）。真ん中に置き、上下左右に少し余白
・描かないもの: 文字・サイン・枠・ほかの敵や人

返事は絵だけで大丈夫です。
```

# あると良くなる絵（ChatGPT。急ぎではない）

## 湖の氷の地面 `terrain/lakeIce`（今は氷原の絵を借りている）
```
ファンタジーRPGの世界マップの「地面の模様」に使う、つなぎ目のない正方形の絵を1枚作ってください。
内容：凍った湖の氷を、真上から見た所。つるつるに磨かれたような、明るい水色の氷。細く白いひびが、まばらに数本だけ。ところどころに、風でできた白い粉雪の細い筋と、スケートの跡のような細い線。氷の中に、小さな白い泡が少し。
絵柄：くすんだ淡い水彩と、細い手描きの線。やわらかく、明るく、すっきり。濃い色や黒い所は作らない。
見る角度：真上から（遠近感なし）。光は全体に均一。
形：正方形（1024×1024）。上下・左右をつなげて並べても、つなぎ目が分からないようにする（左の端と右の端、上の端と下の端の模様がつながる）。
描かないもの：文字・サイン・枠・影・人・動物・岩・木・水面・穴。
```

## 地平線の目印（シナリオ3〜7）
添付: `skyline-snow-peak.png`（遠くの雪山。絵柄の見本）。ゲームではかなり薄く出るので、優先は低い。

### 砂塵の王朝 `landscape/skyline-sand-palace`
```
ボードゲーム風のファンタジーRPGの世界マップで、地図のいちばん奥（地平線）に、うっすら見える「遠くの大きな目印」の絵を1枚作ってください。添付の絵（遠くの雪山）と同じ絵柄・同じかすみ方にそろえてください。
絵柄：墨の線（太さが少し不ぞろいの手描きの線）＋くすんだ淡い水彩。細かい所は描かず、形のシルエットが分かる程度。遠くにかすんで見えるように（空気遠近法）。
形：横長（1536×1024）。背景は透明（PNG）。透明にできなければ、真っ白の無地。目印は真ん中に1つだけ、下の端までつながるように置く。
内容：砂に半分うもれた、とても大きな黄金の王宮。丸い屋根（ドーム）がいくつかと、高い塔が2本。横に、砂にうもれた巨大な石像の頭が1つ。全体を淡い黄土色がかった灰色にする。王宮の下は、なだらかな砂丘で終わる。
描かないもの：雲・空・地平線・ほかの山並み・文字・サイン・枠・人・動物。
```

### 呪われた群島 `landscape/skyline-ghost-ship`
```
ボードゲーム風のファンタジーRPGの世界マップで、地図のいちばん奥（地平線）に、うっすら見える「遠くの大きな目印」の絵を1枚作ってください。添付の絵（遠くの雪山）と同じ絵柄・同じかすみ方にそろえてください。
絵柄：墨の線（太さが少し不ぞろいの手描きの線）＋くすんだ淡い水彩。細かい所は描かず、形のシルエットが分かる程度。遠くにかすんで見えるように（空気遠近法）。
形：横長（1536×1024）。背景は透明（PNG）。透明にできなければ、真っ白の無地。目印は真ん中に1つだけ、下の端までつながるように置く。
内容：岩の小島の向こうに浮かぶ、とても大きな幽霊船。破れた帆が3枚の古い帆船で、船首に小さな灯が1つだけ。全体を淡い青緑がかった灰色にする。船の下は、とがった岩の島で終わる。
描かないもの：雲・空・地平線・ほかの山並み・文字・サイン・枠・人・動物。
```

### 星降る天空城 `landscape/skyline-sky-castle`
```
ボードゲーム風のファンタジーRPGの世界マップで、地図のいちばん奥（地平線）に、うっすら見える「遠くの大きな目印」の絵を1枚作ってください。添付の絵（遠くの雪山）と同じ絵柄・同じかすみ方にそろえてください。
絵柄：墨の線（太さが少し不ぞろいの手描きの線）＋くすんだ淡い水彩。細かい所は描かず、形のシルエットが分かる程度。遠くにかすんで見えるように（空気遠近法）。
形：横長（1536×1024）。背景は透明（PNG）。透明にできなければ、真っ白の無地。目印は真ん中に1つだけ、下の端までつながるように置く。
内容：空に浮かぶ岩の島の上に立つ、白い城。細く高い塔が何本もあり、いちばん高い塔の先に星の形の飾り。全体を淡い紺色がかった灰色にし、塔の先だけ淡い金色。島の下は、逆さの岩山のようにとがって終わる。
描かないもの：雲・空・地平線・ほかの山並み・文字・サイン・枠・人・動物。
```

### 機械仕掛けの帝国 `landscape/skyline-machine-city`
```
ボードゲーム風のファンタジーRPGの世界マップで、地図のいちばん奥（地平線）に、うっすら見える「遠くの大きな目印」の絵を1枚作ってください。添付の絵（遠くの雪山）と同じ絵柄・同じかすみ方にそろえてください。
絵柄：墨の線（太さが少し不ぞろいの手描きの線）＋くすんだ淡い水彩。細かい所は描かず、形のシルエットが分かる程度。遠くにかすんで見えるように（空気遠近法）。
形：横長（1536×1024）。背景は透明（PNG）。透明にできなければ、真っ白の無地。目印は真ん中に1つだけ、下の端までつながるように置く。
内容：煙突と大きな歯車がならぶ、機械の要塞都市。真ん中に大きな時計塔、まわりに太い煙突が4〜5本、建物の横に巨大な歯車が2つ。全体を淡いすす色（灰色）にし、歯車だけ淡い銅色。下は、厚い城壁で終わる。
描かないもの：雲・空・地平線・ほかの山並み・文字・サイン・枠・人・動物。
```

### 夢幻の大迷宮 `landscape/skyline-dream-tower`
```
ボードゲーム風のファンタジーRPGの世界マップで、地図のいちばん奥（地平線）に、うっすら見える「遠くの大きな目印」の絵を1枚作ってください。添付の絵（遠くの雪山）と同じ絵柄・同じかすみ方にそろえてください。
絵柄：墨の線（太さが少し不ぞろいの手描きの線）＋くすんだ淡い水彩。細かい所は描かず、形のシルエットが分かる程度。遠くにかすんで見えるように（空気遠近法）。
形：横長（1536×1024）。背景は透明（PNG）。透明にできなければ、真っ白の無地。目印は真ん中に1つだけ、下の端までつながるように置く。
内容：ゆるくねじれながら空へのびる、夢の中の大きな塔。途中に、宙に浮いた階段と、大きな丸い門が1つ。上の方は、ほどけてリボンのように広がる。全体を淡いラベンダー色がかった灰色にする。下は、小さな丘で終わる。
描かないもの：雲・空・地平線・ほかの山並み・文字・サイン・枠・人・動物。
```
