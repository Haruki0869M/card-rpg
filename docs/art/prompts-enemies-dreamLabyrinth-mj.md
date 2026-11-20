# 夢幻の大迷宮：新しい敵の絵の指示文（Midjourney）

7本目の敵28体のうち、**新しく絵を描く敵は10体**（ボスの変身を入れて画像は12枚）。残り18体は、過去の敵の「夢の再来」で、**元の敵の絵を使い回す**ので指示文は要らない。中身（名前・弱点・行動）は `docs/archive/tasks/K4-dream-enemies.md` が正。**英語は、コードの枠の中だけ。**

形は `prompts-enemies-frozenKingdom-mj.md` と同じ。今ゲームに入っている敵の絵（森の狼・樹木の番人など、細かく描き込んだ手描き風のファンタジー画）に合わせ、`--sref` で公開中の敵の絵2枚を指定する。画面の「Style References」は空にする。持たせない物は文の中に書かず、最後の `--no` にまとめる。白背景・1体のみ・左向きの3/4・全身。切り抜きは `scripts/art/build_art.py`。

7本目の雰囲気: 淡い紫と紺、ぼやけた輪郭、星のような小さな光。ただし、**絵の輪郭は切り抜けるくらいにはっきり**描く（ぼかしすぎない）。

敵の絵の置き場所（ゲームが読む名前）は `src/assets/art/enemy/<敵ID>.webp`。ボスの変身は `<敵ID>-1.webp`（HP50%以下など。K4-dream-enemies.md のとおり、夢喰いは3段階なので `-1` と `-2`）。**置くだけで使われる**（読み込みの1行は要らない）。

---

### nightmareMote 悪夢の綿毛（夢幻の大迷宮・草原・通常・size 0.8）
置き場所: src/assets/art/enemy/nightmareMote.webp
元画像: `C:\dev\card-rpg-assets\enemy\nightmareMote.png`

```
full body creature illustration of one small floating dark purple fluff ball, soft cotton-like fur with two tiny sleepy half-closed glowing eyes and a few drifting dust specks, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with soft purple and indigo tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no limbs, weapons, armor, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### sleepwalker 夢遊病者（夢幻の大迷宮・森と沼・通常・size 1）
置き場所: src/assets/art/enemy/sleepwalker.webp
元画像: `C:\dev\card-rpg-assets\enemy\sleepwalker.png`

```
full body creature illustration of one pale sleepwalking humanoid in a long white nightgown and a floppy nightcap, eyes closed, both arms stretched stiffly forward, bare feet, a faint purple glow around the body, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with soft purple and indigo tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapons, shield, candle, pillow, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### pillowGolem 枕のゴーレム（夢幻の大迷宮・氷・通常・size 1.1）
置き場所: src/assets/art/enemy/pillowGolem.webp
元画像: `C:\dev\card-rpg-assets\enemy\pillowGolem.png`

```
full body creature illustration of one large soft golem made of stitched pillows and quilts, round plump torso and thick short arms, button eyes and a stitched seam mouth, a few feathers drifting off, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with soft purple and indigo tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapons, armor, shield, bed, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### lullabyBird 子守歌の鳥（夢幻の大迷宮・氷・通常・size 0.9）
置き場所: src/assets/art/enemy/lullabyBird.webp
元画像: `C:\dev\card-rpg-assets\enemy\lullabyBird.png`

```
full body creature illustration of one round dreamy songbird with soft lavender and white feathers, a long drooping tail with a tiny star at the tip, open beak mid-song, small glowing musical-note-shaped sparkles around, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with soft purple and indigo tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapons, armor, nest, branch, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### shadowChild 影の子（夢幻の大迷宮・砂と機械・通常・size 0.9）
置き場所: src/assets/art/enemy/shadowChild.webp
元画像: `C:\dev\card-rpg-assets\enemy\shadowChild.png`

```
full body creature illustration of one small child-sized living shadow, a solid dark violet silhouette with only two round pale glowing eyes and a tiny jagged smile, wispy smoke edges at the hands and feet, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with soft purple and indigo tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no clothes, weapons, toy, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### lostMemory 迷子の記憶（夢幻の大迷宮・空と海・通常・size 1）
置き場所: src/assets/art/enemy/lostMemory.webp
元画像: `C:\dev\card-rpg-assets\enemy\lostMemory.png`

```
full body creature illustration of one translucent ghostly figure like a faded old photograph come to life, a pale blue white semi-transparent body with soft torn edges, blurry features and one hand reaching forward, a few tiny floating photo scraps around, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with soft purple and indigo tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapons, armor, legs, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### mirrorKnight 鏡の騎士（夢幻の大迷宮・空と海・エリート・size 1.2）
置き場所: src/assets/art/enemy/mirrorKnight.webp
元画像: `C:\dev\card-rpg-assets\enemy\mirrorKnight.png`

```
full body creature illustration of one tall knight whose armor is made of polished silver mirror plates reflecting a faint purple sky, a smooth faceless mirror helmet, exactly one long straight sword held in one hand and the other hand empty, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with soft purple and indigo tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no shield, second sword, cape, face, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### dreamWeaver 夢織り（夢幻の大迷宮・空と海・エリート・size 1.2）
置き場所: src/assets/art/enemy/dreamWeaver.webp
元画像: `C:\dev\card-rpg-assets\enemy\dreamWeaver.png`

```
full body creature illustration of one slender weaver spirit in a long indigo robe with a hood, four thin arms each holding a glowing thread of pale violet light stretched between the hands like a loom, a faintly glowing eye pattern on the chest, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with soft purple and indigo tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapons, staff, face, loom frame, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### memoryEater 記憶喰い（夢幻の大迷宮・夢の最奥・エリート・size 1.3）
置き場所: src/assets/art/enemy/memoryEater.webp
元画像: `C:\dev\card-rpg-assets\enemy\memoryEater.png`

```
full body creature illustration of one hunched creature with a wide round mouth full of small teeth, a bloated dark violet body covered in faint floating pictures like small framed memories, long thin arms dragging forward, two small dim eyes, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with soft purple and indigo tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapons, armor, clothes, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

### dreamEater 夢喰い（夢幻の大迷宮・夢の最奥・ボス・size 1.6）
置き場所: src/assets/art/enemy/dreamEater.webp
元画像: `C:\dev\card-rpg-assets\enemy\dreamEater.png`

第1段階（HP100〜60%）。巨大な、うずくまった黒い影。記憶を抱えている（寂しい）。

```
full body creature illustration of one huge hunched shadow creature made of black violet smoke, two enormous arms hugging countless small glowing memory lights close to its chest, a pale round face with two sad glowing eyes and no mouth, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art, fine ornamental detail, muted earthy palette with soft purple and indigo tones, facing left three-quarter view, entire body visible from head to feet, filling the frame, plain off-white background, soft even lighting --ar 4:5 --sref https://card-rpg-1aa60.web.app/assets/forestWolf-Dm6xODDJ.webp https://card-rpg-1aa60.web.app/assets/treeWarden-D5KJkVfD.webp --no weapons, armor, crown, ground shadow, scenery, pedestal, second creature, signature, text, watermark
```

#### dreamEater-1 食べる夢喰い（HP60〜30%）
置き場所: src/assets/art/enemy/dreamEater-1.webp
元画像: `C:\dev\card-rpg-assets\enemy\dreamEater-1.png`

```
full body creature illustration of one huge hunched shadow creature made of black violet smoke, same creature transformed with a huge gaping mouth opened wide across the chest swallowing glowing memory lights, longer reaching arms with clawed hands, the pale sad face now tilted down, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art
```

#### dreamEater-2 思い出す夢喰い（HP30%以下）
置き場所: src/assets/art/enemy/dreamEater-2.webp
元画像: `C:\dev\card-rpg-assets\enemy\dreamEater-2.png`

```
full body creature illustration of one huge hunched shadow creature made of black violet smoke, same creature transformed with its smoke body cracking open to release many warm golden memory lights, the pale face now tearful and gentle with both eyes glowing softly, arms open as if letting go, large imposing boss silhouette, detailed hand-painted fantasy RPG monster art
```

変身の2枚は、第1段階と同じ作風・同じ生き物に見えるように、第1段階の絵を `--cref` ではなく、文の「same creature transformed」で書く（凍てつく王国のボスと同じやり方）。うまくいかない時は、第1段階の絵を `--sref` に足す。
