# 駒を Gemini で作る指示文（基本職16人・2026-11-14）

オーナーの決定（2026-11-14）: 駒は基本職の16人分だけ作る。転職しても、基本職の駒を使う（`HeroPiece.tsx` の `baseClassId`）。ChatGPT では見本の人を再現できなかったので、Gemini で作る。

## 進め方（スマホで）

1. Gemini で**新しい会話**を始める。モデルは、オーナーのアプリの「3.1 Pro」（画像を作る道具を使う）。
2. 1人ずつ、下の指示文（決まりの文も入っています）を貼る。添付は1枚目 `人物-<職>・<男|女>.jpg`、2枚目 チェスの駒の写真（`docs/art/piece-chess-shape-reference.png`）。
3. **1枚目ができて合格したら**、その駒の絵も3枚目に添付する（形・塗りをそろえるため）。
4. できた絵は、このセッションに貼る（まとめて良い）。

## 決まりの文（各指示文の頭に入っています）

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。
```

## 1人ずつの指示文

### 01 剣士・男（`piece/warrior-male`）
添付: `人物-剣士・男.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（剣士・男性）です。
持つ物: 銅の剣1本
見た目（立ち絵と食い違う時は、立ち絵が正）: 銀の鎧に赤の飾り・赤いマントと赤いスカーフ
持たせない・描かないもの: shield, bow, arrows, quiver, spear, dual wielding, two swords, second sword, sheathed sword, scabbard, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 02 剣士・女（`piece/warrior-female`）
添付: `人物-剣士・女.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（剣士・女性）です。
持つ物: 銅の剣1本
見た目（立ち絵と食い違う時は、立ち絵が正）: 銀の胸当て・赤いマントと赤い刺繍のスカート
持たせない・描かないもの: shield, bow, arrows, quiver, spear, dual wielding, two swords, second sword, sheathed sword, scabbard, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 03 守護者・男（`piece/guardian-male`）
添付: `人物-守護者・男.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（守護者・男性）です。
持つ物: 鉄の槍（片手）と、大きな丸い木の盾（もう片手）
見た目（立ち絵と食い違う時は、立ち絵が正）: 青い鋼の鎧・クリーム色の前垂れ・大きな丸い木の盾
持たせない・描かないもの: sword, axe, bow, arrows, second spear, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 04 守護者・女（`piece/guardian-female`）
添付: `人物-守護者・女.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（守護者・女性）です。
持つ物: 鉄の槍（片手）と、大きな丸い赤い盾（もう片手）
見た目（立ち絵と食い違う時は、立ち絵が正）: 銀と青の鎧・青いスカート・大きな丸い赤い盾
持たせない・描かないもの: sword, axe, bow, arrows, second spear, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 05 狩人・男（`piece/hunter-male`）
添付: `人物-狩人・男.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（狩人・男性）です。
持つ物: 狩人の弓
見た目（立ち絵と食い違う時は、立ち絵が正）: 緑のフード付きの長いマント・赤茶の服・背中に矢筒
持たせない・描かないもの: sword, dagger in hand, shield, spear, second bow, slingshot, stick in hand, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 06 狩人・女（`piece/hunter-female`）
添付: `人物-狩人・女.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（狩人・女性）です。
持つ物: 狩人の弓
見た目（立ち絵と食い違う時は、立ち絵が正）: 緑のフードとマント・緑の短い上着・背中に矢筒
持たせない・描かないもの: sword, dagger in hand, shield, spear, second bow, slingshot, stick in hand, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 07 魔道士・男（`piece/mage-male`）
添付: `人物-魔道士・男.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（魔道士・男性）です。
持つ物: 樫の杖（先に紫の宝玉）
見た目（立ち絵と食い違う時は、立ち絵が正）: 星の付いたくすんだピンクのとんがり帽子・ピンクと紫のローブ
持たせない・描かないもの: sword, shield, book, bow, arrows, quiver, spear, second staff, wand, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 08 魔道士・女（`piece/mage-female`）
添付: `人物-魔道士・女.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（魔道士・女性）です。
持つ物: 樫の杖（先に小さな紫の宝玉）
見た目（立ち絵と食い違う時は、立ち絵が正）: 黒髪のショート・つばの広いとんがり帽子・紫と淡いピンクのローブ
持たせない・描かないもの: sword, shield, book, second weapon, bow, arrows, quiver, spear, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 09 武闘家・男（`piece/monk-male`）
添付: `人物-武闘家・男.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（武闘家・男性）です。
持つ物: 布の手甲（素手）
見た目（立ち絵と食い違う時は、立ち絵が正）: 橙の道着・黒い帯・素手
持たせない・描かないもの: sword, staff, pole, claws, metal gauntlets, shield, bow, arrows, quiver, weapon in hand, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 10 武闘家・女（`piece/monk-female`）
添付: `人物-武闘家・女.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（武闘家・女性）です。
持つ物: 布の手甲（素手）
見た目（立ち絵と食い違う時は、立ち絵が正）: 橙の道着・黒い帯・素手
持たせない・描かないもの: sword, staff, pole, claws, metal gauntlets, shield, bow, arrows, quiver, weapon in hand, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 11 盗賊・男（`piece/thief-male`）
添付: `人物-盗賊・男.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（盗賊・男性）です。
持つ物: 古びた短剣1本
見た目（立ち絵と食い違う時は、立ち絵が正）: ミント色のフード付き短いマント・革のベスト
持たせない・描かないもの: second dagger, sword, bow, shield, arrows, quiver, dual wielding, two daggers, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 12 盗賊・女（`piece/thief-female`）
添付: `人物-盗賊・女.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（盗賊・女性）です。
持つ物: 古びた短剣1本
見た目（立ち絵と食い違う時は、立ち絵が正）: ミント色のフード付き短いマント・革のベスト
持たせない・描かないもの: second dagger, sword, bow, shield, arrows, quiver, dual wielding, two daggers, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 13 僧侶・男（`piece/priest-male`）
添付: `人物-僧侶・男.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（僧侶・男性）です。
持つ物: 木の錫杖（鈴と輪）
見た目（立ち絵と食い違う時は、立ち絵が正）: 白と淡い金の法衣・鈴の付いた錫杖
持たせない・描かないもの: sword, hammer, mace, book, shield, bow, arrows, quiver, crystal staff, second staff, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 14 僧侶・女（`piece/priest-female`）
添付: `人物-僧侶・女.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（僧侶・女性）です。
持つ物: 木の錫杖（鈴と輪）
見た目（立ち絵と食い違う時は、立ち絵が正）: 白と淡い金の法衣・鈴の付いた錫杖
持たせない・描かないもの: sword, hammer, mace, book, shield, bow, arrows, quiver, crystal staff, second staff, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 15 召喚士・男（`piece/summoner-male`）
添付: `人物-召喚士・男.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（召喚士・男性）です。
持つ物: 魔導書1冊
見た目（立ち絵と食い違う時は、立ち絵が正）: 紫のフード付きローブ・光る紋様
持たせない・描かないもの: staff, wand, sword, shield, creatures, animals, bow, arrows, quiver, second book, stack of books, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```

### 16 召喚士・女（`piece/summoner-female`）
添付: `人物-召喚士・女.jpg`

```
私のゲームの主人公を、ボードゲームの盤に置く「チェスの駒」の絵にしてください。添付の1枚目が、このキャラの立ち絵です。2枚目は、本物のチェスの駒の写真です（駒の形と質感の見本。色は使わない）。3枚目を添付した時は、それが合格した駒です（形・塗り・大きさを、それにそろえてください）。

【絵柄（いちばん大事）】
・ろくろで削った木の駒に、手で色を塗って、つやのあるニスを掛けた「本物の駒」。写真のような立体感・光沢・木の重み。
・ただし、キャラの部分はかわいいデフォルメ（約3頭身。頭は大きく丸い）。顔は、立ち絵と同じやわらかいアニメ顔を、駒に塗ったように。リアルな人の顔・大人の体型にしない。
・色は、明るくやわらかい、立ち絵と同じ色。細かい線画のイラストにはしない。
・英語で言うと: a real hand-painted lathe-turned wooden chess piece with glossy lacquer, the top carved as a cute chibi character bust (about 3 heads tall, big round head, soft anime face painted on), the body below is a classic turned chess-piece column, studio product photo, soft light, not a realistic human.

【形】
・上は、キャラの上半身（胸から上）。腕と持つ物は、体にぴったり付けて縦に持つ。マントは体に巻き付けるように細くまとめ、横に広げない。
・胸から下は、ろくろで削った胴を**1段だけ**: 丸い首輪の段 → くびれ1つ → すそへなめらかに広がる。途中のふくらみ・2つ目のくびれ・積み重ねた段は作らない（胴は上下に分かれず、ひとつながり）。
・胴は短め。駒全体の高さの半分くらいが胴、残り半分がキャラの上半身。
・胴は、キャラの服の色で塗る。段のふちは金や銀。足は無い。
・一番下は、低い段2本で終わる。厚い台座・平たい円盤・地面・床の影は描かない（円盤の台座はゲームが描きます）。
・全体は細長く、まとまった形。小さく表示しても、チェスの駒だと分かる。

【見せ方】
・全身。真横に近い、やや斜め前から。光は左上から。
・背景は真っ白の無地（光・影・模様・グラデーションを入れない）。
・正方形。駒は真ん中に。上と左右に少し余白。
・描かないもの: 文字・サイン・枠・景色・ほかの人や動物・チェス盤。

【キャラ】
・髪の色と髪型・瞳の色・服の色・目印の小物は、1枚目の立ち絵と同じ。同じ人だと、ひと目で分かるように（顔や服は、ちびキャラに単純にしてよい）。
・持つ物は、下に書いた物だけ。片手で持つ武器なら、もう片方の手は空。

今回は、添付の立ち絵のキャラ（召喚士・女性）です。
持つ物: 魔導書1冊
見た目（立ち絵と食い違う時は、立ち絵が正）: 紫のフード付きローブ・光る紋様
持たせない・描かないもの: staff, wand, sword, shield, creatures, animals, bow, arrows, quiver, second book, stack of books, second weapon, pedestal, round base, base plate, legs, feet, realistic human face, adult proportions, flat 2D illustration, wide cape, chess board, stacked tiers, two-tier column, multiple bulges
```
