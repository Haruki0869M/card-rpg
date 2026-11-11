# 新ジョブ4職の立ち絵（Midjourney）と、駒・お供の ChatGPT のお試し（2026-11-12）

オーナーの決定（2026-11-12）:
- **キャラの立ち絵は Midjourney**。今の80枚と同じ書き方・同じお手本（`--sref`）。
- **お供・駒・ジオラマの部品（デフォルメした方が良い物）は ChatGPT**。
- 駒は「ちびキャラ風」で、ジオラマ・キャラと統一感が無い → **ジオラマに合う、チェスの駒のような立体感のあるミニチュア**に作り直す。立ち絵を ChatGPT に添付して作る。
- お供は戦闘画面になじんでいない気がする → ChatGPT で試し、戦闘画面とワールドマップで見比べてから決める。
- ジオラマの部品は、駒・お供の絵柄が決まってから、それに合わせて作り直す。

---

## ① 新ジョブ4職の立ち絵（Midjourney・8枚）

- 決まりは `prompts-jobs-pets.md` の「共通の決まり」と同じ（全身・3/4・無地の明るい背景・`--ar 2:3`・男は masculine face・持たせない物は `--no`）。
- 顔の絵は立ち絵から切り出す。作るのは8枚だけ。
- 画面の「Style References」は空にする（お手本は指示文の `--sref` に入っている）。
- **【提案】jobId（ファイル名）**: まだゲームに無いので仮の名前。区切りF で決まった名前に付け直す。
  拳聖 `fistSaint`・重装衛士 `bulwark`・竜脈術師 `dragonVein`・調教師 `petTrainer`
- **【提案】最初の武器**: 新ジョブの最初の武器はまだ決まっていない。元の職と得意な武器から決めた（`lineup-phase4-jobs.md` の「持つ武器: 拳聖＝拳、重装衛士＝槍と大盾、竜脈術師＝杖、調教師＝鞭」に合わせた）。
- 盾は聖騎士・聖王だけの決まり（前の決定 F）だが、重装衛士は文書で「槍と大盾」とされているので、大盾を持たせる。

### 拳聖（`fistSaint`）
- 元の職: 闘士　／　持つ物: **布の手甲（両手の拳に巻いた布。手には何も持たない）**　／　色: 藍と白
- 見た目: 藍色の道着に白い帯・静かな構え（片手のひらを前に出す「受け」の構え）。拳王（白と橙・赤い鉢巻き）と見分けやすく、落ち着いた色
- 持たせない物: 武器全般、盾、金属の籠手

男 → 元画像 `fistSaint-male.png`
```
full body character illustration of a young adult male serene martial arts saint of the counterstrike, masculine face, short silver-white hair tied back, calm focused eyes, deep indigo gi with white trim and a plain white belt, loose wide trousers, simple straw sandals, prayer beads around the neck, calm defensive stance with one open palm held forward and the other fist at the hip, both fists wrapped in worn cloth hand wraps, bare hands, deep indigo as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, staff, claws, metal gauntlets, shield, bow, arrows, quiver, spear, headband, orange, signature, text, watermark, scenery
```

女 → 元画像 `fistSaint-female.png`
```
full body character illustration of a young adult female serene martial arts saint of the counterstrike, long silver-white hair in a low braid, calm focused eyes, deep indigo gi with white trim and a plain white belt, front-closed jacket, loose wide trousers, simple straw sandals, prayer beads around the neck, calm defensive stance with one open palm held forward and the other fist at the hip, both fists wrapped in worn cloth hand wraps, bare hands, deep indigo as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, staff, claws, metal gauntlets, shield, bow, arrows, quiver, spear, headband, orange, signature, text, watermark, scenery
```

### 重装衛士（`bulwark`）
- 元の職: 槍騎士　／　持つ物: **鉄の槍（片手）と、大きな四角い大盾（もう片手）**　／　色: 鋼の灰色と青銅
- 見た目: 全身を覆う分厚い重装鎧・兜は外して脇に無し（顔が見えるように）。槍騎士（青の半鎧・青いマント）より重く・暗い色
- 持たせない物: 剣、2本目の槍、弓、マント（槍騎士と見分けるため）

男 → 元画像 `bulwark-male.png`
```
full body character illustration of a young adult male heavy armored bulwark knight, masculine face, short dark brown hair, no helmet, face fully visible, massive thick full plate armor in dark steel gray with bronze trim and rivets, heavy layered pauldrons, holding a long plain straight iron spear upright in one hand and a huge rectangular bronze-rimmed steel tower shield in the other hand, sturdy immovable stance, steel gray as the main color with bronze accents, detailed hand-painted fantasy RPG character art, fine ornamental engraving, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, second spear, bow, arrows, quiver, cape, helmet, signature, text, watermark, scenery
```

女 → 元画像 `bulwark-female.png`
```
full body character illustration of a young adult female heavy armored bulwark knight, short ash-blonde bob hair, no helmet, face fully visible, massive thick full plate armor in dark steel gray with bronze trim and rivets, heavy layered pauldrons, holding a long plain straight iron spear upright in one hand and a huge rectangular bronze-rimmed steel tower shield in the other hand, sturdy immovable stance, steel gray as the main color with bronze accents, detailed hand-painted fantasy RPG character art, fine ornamental engraving, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no sword, second spear, bow, arrows, quiver, cape, helmet, signature, text, watermark, scenery
```

### 竜脈術師（`dragonVein`）
- 元の職: 幻獣使い　／　持つ物: **樫の杖1本（先に小さな翡翠の玉）**　／　色: 翡翠の緑と琥珀
- 見た目: 竜の鱗の模様のローブ・地面から立ちのぼる細い光の筋（竜脈）を足元にほのかに。幻獣使い（紫と白・本）と見分ける
- 持たせない物: 本、剣、盾、動物や竜（お供・幻獣と見分けにくくなるため）

男 → 元画像 `dragonVein-male.png`
```
full body character illustration of a young adult male dragon ley-line mage, masculine face, short dark green hair, jade green and amber layered robe with subtle dragon scale patterns, amber sash, holding a single tall gnarled oak wooden staff topped with a small glowing jade orb in one hand, the other hand empty with faint jade energy swirling around the fingers, thin glowing jade light lines rising from the ground around his feet, jade green as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no book, sword, shield, creatures, animals, dragon, second staff, bow, arrows, quiver, spear, signature, text, watermark, scenery
```

女 → 元画像 `dragonVein-female.png`
```
full body character illustration of a young adult female dragon ley-line mage, long black hair with jade green tips and a small horn-shaped hair ornament, jade green and amber layered robe with subtle dragon scale patterns, amber sash, holding a single tall gnarled oak wooden staff topped with a small glowing jade orb in one hand, the other hand empty with faint jade energy swirling around the fingers, thin glowing jade light lines rising from the ground around her feet, jade green as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no book, sword, shield, creatures, animals, dragon, second staff, bow, arrows, quiver, spear, signature, text, watermark, scenery
```

### 調教師（`petTrainer`）
- 元の職: 獣使い　／　持つ物: **革の鞭（丸めて片手に持つ）**　／　色: 空色とクリーム
- 見た目: やさしい笑顔・肩に小さな当て布（お供が肩に乗るための場所）・腰にごほうびの小袋。獣使い（黄緑・毛皮・牙）と見分ける、明るくやさしい色
- 持たせない物: **お供・動物を描かない**（お供は12種類から選ぶため）、剣、弓、盾、牙の首飾り

男 → 元画像 `petTrainer-male.png`
```
full body character illustration of a young adult male gentle pet trainer, masculine face, warm friendly smile, fluffy light brown hair, sky blue and cream outfit, short cream jacket with a padded leather patch on the left shoulder, small leather treat pouch and a little whistle on the belt, sturdy boots, holding a coiled supple leather whip in one hand, the other hand open and relaxed, sky blue as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no animals, creatures, birds, pets, sword, bow, shield, arrows, quiver, spear, fang necklace, fur, signature, text, watermark, scenery
```

女 → 元画像 `petTrainer-female.png`
```
full body character illustration of a young adult female gentle pet trainer, warm friendly smile, wavy honey-blonde hair in a side ponytail, sky blue and cream outfit, short cream jacket with a padded leather patch on the left shoulder, small leather treat pouch and a little whistle on the belt, sturdy boots, holding a coiled supple leather whip in one hand, the other hand open and relaxed, sky blue as the main color, detailed hand-painted fantasy RPG character art, fine ornamental embroidery, muted earthy palette, standing pose, front three-quarter view, entire body visible from head to feet, plain off-white background, soft even lighting --ar 2:3 --sref https://card-rpg-1aa60.web.app/assets/hunter-male-Didh6Op_.webp https://card-rpg-1aa60.web.app/assets/guardian-female-lfYd-E3U.webp --no animals, creatures, birds, pets, sword, bow, shield, arrows, quiver, spear, fang necklace, fur, signature, text, watermark, scenery
```

---

## ② ChatGPT のお試し（駒1枚・お供2枚）

**1つの会話で、上から順に貼る**（同じ会話で続けると絵柄がそろう）。

### 試し1: 駒（剣士・男）
添付: `見本1-剣士の立ち絵.png`（今の立ち絵）と `見本2-地図の村.png`（今の世界マップの絵）
保存の名前: `piece-warrior-male.png`
```
添付の1枚目は、私のゲームの主人公（剣士）の立ち絵です。これを、ボードゲームの盤の上に置く「立体のミニチュアの駒」の絵にしてください。

【形】
・手で色を塗った、樹脂のボードゲームのフィギュア。立体感（陰影・ハイライト）がはっきり分かる。つやは控えめ。
・頭身は約3頭身の、控えめなデフォルメ。頭が大きすぎるちびキャラにはしない。
・チェスの駒のように、まっすぐ立った、まとまった形。手足やマントを大きく広げず、小さく表示しても形が分かる。
・世界マップの絵（添付の2枚目）と並べて、なじむ色合い・塗りにする。

【キャラ】
・髪の色・顔立ち・鎧・赤いマントとスカーフ・服の模様は、1枚目の立ち絵と同じ。
・持つ物は、右手の片手剣1本だけ（剣先は下）。左手は何も持たない。腰に2本目の剣を下げない。盾は持たない。

【見せ方】
・全身。やや斜め前から、少し上から見下ろす角度。
・光は左上から。
・台座・丸い台・地面・床の影は描かない（台座はゲームが描きます）。足の裏が絵の一番下に来るようにする。
・背景は透明（PNG）。透明にできなければ、真っ白の無地。
・正方形（1024×1024）。キャラは真ん中、上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物。
```

### 試し2: お供（オカメインコ・ノーマル）
（同じ会話の続きで。添付は要らない）
保存の名前: `pet-cockatiel-normal.png`
```
次は、同じ絵柄（さっきの駒と同じ、手で色を塗った樹脂のミニチュア）で、主人公といっしょに旅をする「お供」の動物を作ってください。

【内容】オカメインコ（ノーマル）
・体は明るい銀灰色（黒っぽくしない）。顔は黄色で、頭の上に高くとがった黄色い冠羽。
・ほっぺに丸いオレンジの模様（いちばん大事な見分けの印）。
・翼に白い帯。くちばしは淡いピンクがかった灰色。目は黒く、やさしい表情。

【形】
・とても可愛い、丸みのあるデフォルメ。小さく表示しても「オカメインコ」と分かる。
・足をそろえて、何かに止まっている姿勢（止まり木は描かない）。
・首輪・リボン・飾りは付けない。

【見せ方】
・やや斜め前から。光は左上から。台座・地面・影は描かない。
・背景は透明（PNG）。透明にできなければ、真っ白の無地。
・正方形（1024×1024）。真ん中に、余白をとって。
・描かないもの: 文字・サイン・枠・景色・ほかの動物。
```

### 試し3: お供（文鳥・白）
保存の名前: `pet-javaSparrow-white.png`
```
同じ絵柄・同じ決まりで、もう1羽お願いします。

【内容】文鳥（白）
・お餅のようにまんまるの、真っ白な体。
・太くて大きい、濃いピンクのくちばし。目のまわりに赤い輪。
・冠羽は無い（頭は丸くなめらか）。オレンジのほっぺも無い。オカメインコと、はっきり見分けられるように。

【形・見せ方】さっきのオカメインコと同じ（足をそろえて止まる姿勢・止まり木なし・飾りなし・透明の背景・正方形）。
```

## できた絵の渡し方（オーナー → Claude）
- 置き場所: `C:\dev\card-rpg-assets\chatgpt-trial\`（名前は上の「保存の名前」）。スマホからなら、このセッションに画像を貼るだけでも良い。
- Claude が切り抜いて、**今の絵と並べて**、ワールドマップ（駒・お供）と戦闘画面（お供）で見比べられる画像を作る。
