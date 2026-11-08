# 追加・変更の手順書

データを足す・変える時に「どこに何を書くか」の早見表です。考え方は spec.md §2.4 にあります。

## 基本のルール

- **ファイルを置くだけで登場します。** `src/content/` の中のファイルは自動で読み込まれるので、登録表に手で書き足す必要はありません。
- **ファイルの書き方**: 定義（`id` を持つオブジェクト）、その配列、または `{ id: 定義 }` の表を `export` します。1つのファイルに何件書いてもかまいません。
- **ID は英数字**で、同じ種類の中で重複できません。重複すると起動時とテストでエラーになります。保存データが ID を使うので、一度出したら変えないでください。
- **並び順**は `order`（小さいほど先）→ ファイル名 → ファイル内の順です。
- **置き場所**:
  - どのシナリオでも使うもの → `src/content/common/`
  - 1つのシナリオだけで使うもの → `src/content/scenarios/<シナリオID>/`
- **確認**: 変えたら `npm test` を実行してください。参照切れや書き間違いを見つけます。数値は `npm run dev` で開いて URL の末尾に `#data` を付けると表で見られます。

```
src/content/
  common/
    classes/       職業（1職業 = 1ファイル）
    cards/         カード
    items/         装備・消費アイテム
    enemies/       どこでも出る敵
    encounters/    テスト戦闘の敵の組み合わせ
    statuses/      状態異常
    elements/      属性（炎・氷・雷・毒・闇・聖。当たった時に付く状態異常もここ）
    weaponTypes/   武器の種類
    difficulties/  難易度（命の灯火の数・敵の強さの倍率・侵食度の速さもここ）
    roomTypes/     ダンジョンの部屋の種類
    terrains/      世界マップの地形
  scenarios/
    corruptionKing/
      scenario.ts  シナリオの説明・開始条件・物語（冒頭・エンディング・封印の鍵の名前）
      map.ts       世界マップ（地域・町やダンジョンの位置・侵食度の段階）
      enemies/  dungeons/  events/  towns/  shrines/  quests/
```

---

## シナリオを足す

1. `src/content/scenarios/<新しいID>/scenario.ts` を作ります。`corruptionKing/scenario.ts` を写して、`id`・`name`・`synopsis`・`start` を書き換えてください。
2. 同じフォルダの `enemies/`・`dungeons/`・`events/` に、そのシナリオ専用のデータを置きます。
3. まだ遊べない場合は `unlocked: false` と `unlockText` を書きます。

## 世界マップを作る・変える（spec §8）

- シナリオのフォルダの `map.ts` に書きます。scenario.ts の `map` に入れると、そのシナリオは世界マップから始まります。`map` が無いシナリオは仮の拠点から始まります。
- `regions`（地域）: マップの行の範囲、地形の出やすさ、徘徊する敵の基準レベルと組み合わせ、最初に置く敵の数を書きます。宝箱・イベント・祠・ランダムダンジョンの数も書けます。
- `features`（固定の施設）: 町・ダンジョン・名所を `at: [列, 行]` で置きます（0,0 が左上）。スタートからこれらまでは、自動で道（`roadTerrain`）が引かれます。
- `corruptionStages`（侵食度の段階）: 何%で何が起きるかを書きます。
  - `spawn`: 敵を増やす数
  - `enemyLevel`: 敵のレベルの加算
  - `raid`: 町への襲撃を始めるか
- 地形は `src/content/common/terrains/` に書きます。`moveCost` が 0 なら通れません。`background` は、そのマスで戦った時の背景です。
- 地図の形はシードで決まります。同じシードなら同じ地図です。

## 町・祠・依頼を足す（spec §17・§8.4）

- **町**: シナリオの `towns/` に書き、`map.ts` の `features` に `{ kind: 'town', id, at }` で置きます。書く項目は次のとおりです。
  - ショップの品揃え（数・格の上限・いつも売っているもの `fixed`）
  - 宿屋の値段、カード削除の値段
  - 掲示板の依頼（`quests`）
- **祠**: シナリオの `shrines/` に書きます。選択肢の結果は、イベントと同じ「冒険の効果」です。永続の加護には `permanent: true` を付けます（1人が持てる数は balance.ts の `maxBlessings`）。祠はランダムに置かれます（地域の `shrines` の数）。
- **依頼**: シナリオの `quests/` に書きます。`objective`（目標）の種類は次のとおりです。

| 種類 | 内容 |
|---|---|
| `defeatWanderers` | 徘徊する敵を○組倒す |
| `visitLandmark` | 名所を調べる |
| `clearDungeon` | ダンジョンを制覇する |
| `deliverItem` | アイテムを届ける |

  新しい目標は `src/engine/game/world/objectives/` にファイルを1つ置けば作れます。報酬はイベントと同じ「冒険の効果」です。
- **名所**: `map.ts` に `{ kind: 'landmark', id: イベントID }` で置き、`events/` に `where: 'map'` のイベントとして書きます。調べると依頼の `visitLandmark` が進みます。
- **世界マップのイベント**: `where: 'map'` を付けたイベントは、地図のランダムなマスに置かれます。付けないイベントはダンジョンの部屋で出ます。
- **ダンジョンと封印の鍵**: ダンジョンに書ける項目は次のとおりです。
  - `rewardKey`: 制覇で手に入る鍵
  - `requiresKeys`: 入るのに必要な鍵
  - `corruptionOnClear`: 制覇で侵食度が下がる量
  - `finale: true`: 制覇でエンディング
  
  鍵の名前は scenario.ts の `story.keys` に書きます。

## 職業を足す

1. `src/content/common/classes/<id>.ts` を作ります。`warrior.ts` を写して書き換えてください。
   - 能力値（`stats`）、最大HP、初期デッキ、初期装備、`weaponType`（武器の種類のID）
   - `battleAbility`（下の「特殊能力」）、`exploreAbility`
   - `cardPool`（報酬で出るカード）、`growthWeights`（伸びやすい能力値）
2. 見た目は、描いた絵を `src/assets/art/hero/<職業ID>-male.webp` / `-female.webp`（全身）と `-male-face.webp` / `-female-face.webp`（顔）に置きます（下の「絵を足す」）。無ければ `src/art/hero/looks.ts` の SVG の絵、それも無ければ仮の絵が出ます。

## 敵を足す

1. `src/content/.../enemies/<id>.ts` を作ります。
   - `maxHp` と `baseLevel`（その数値が想定しているレベル）を書きます。
   - `actions` に行動を並べます。効果は下の「効果の部品」から選びます。
   - `pattern` は行動の決め方です。`sequence` = 上から順、`random` = ランダム。
2. 任意の項目:
   - `hpPerLevel` / `attackPerLevel`: レベルごとの伸び方をこの敵だけ変える
   - `phases`: ボスの段階（HPが減ると行動が変わる）
   - `abilities`: 特殊能力（味方と同じ書き方）
   - `weak` / `resist`: 弱点・耐性の属性ID（例 `weak: ['fire']`）。弱点はダメージ×1.5、耐性はダメージ×0.5で、その属性の状態異常も効かない
   - 行動のダメージにも属性を付けられます（`{ kind: 'damage', amount: 8, element: 'fire' }`）
3. 出す場所はダンジョンの `pools` に ID を書きます。
4. **亜種**（K3）: 元の敵の絵を使い回し、属性か開幕の特性を変えた敵は `makeVariant`（`src/data/enemyVariant.ts`）で作ります。`aura` で足元の色が付きます。詳しくは `docs/tasks/K3-enemies.md`。
5. **絵が必要です。** 描いた絵を `src/assets/art/enemy/<敵ID>.webp` に置きます（ボスの第2段階は `<敵ID>-1.webp`）。無ければ `src/art/enemies/` の SVG の絵（`export const enemyArt = { 敵ID: 絵 }`）、それも無ければ仮の絵（頭文字の丸）が出ます。敵どうしの大きさの差は、敵のデータの `size` で決めます。

## 武器・防具・装飾品・消費アイテムを足す

- `src/content/common/items/` のどれかのファイルに1件足します。
- 武器は `weaponType`（武器の種類のID）と、専用カード（`cards`）を書きます。
- 能力値・最大HP・フォーカス最大・開始時ブロック・ドローの追加は数値で書きます。
- エピック以上には必ず `ability`（特殊能力）を付けます。付いていないとテストで止まります。
- 消費アイテムは `use: [効果, ...]` で書きます。同じ名前の冒険の効果（`heal` / `gainFocus` / `cleanse`）がある効果は、戦闘の外でも使えます。

## 武器の種類（槍・斧など）を足す

- `src/content/common/weaponTypes/basic.ts` に1行足します。アイコンは `src/art/items.tsx` のアイコンの種類です。

## カード（スキル）を足す

- `src/content/common/cards/` に1件足します。
- `tiers` は「何成功以上でどの効果か」の並びで、0成功から始めます。
- `rarity` は格です。エピック以上には必ず `trait`（特殊能力。このカードを使っている間だけ働く）を付けます。
- 報酬で出すには、職業の `cardPool` に ID を書きます。

## 状態異常を足す

- `src/content/common/statuses/` に1件足します。
- 書ける項目は次のとおりです。
  - `tickDamage`: フェーズ終了時のダメージ。`'stacks'` なら数値分
  - `decay`: 1回で減る数
  - `dealtMultiplier` / `takenMultiplier`: 与える・受けるダメージの倍率
  - `harmful`: 悪い効果か（万能薬で治る）。良い効果（再生など）は `false`
  - `tickHeal`: フェーズの始めの回復。`'stacks'` なら数値分（再生）
  - `healMultiplier`: 受ける回復量の倍率（呪い）
  - `chancePenalty`: 味方のカードの成功率を下げる%（痺れ）
  - `actionFailChance`: 敵が行動に失敗する確率%（痺れ）
  - `skipAction`: 敵は次の行動を1回休む（凍結。休んだら1減る）
  - `manaPenalty`: 味方の次のターンのマナが減る（凍結）
  - `maxStacks`: 重ねられる上限
- 説明文は自動で作られます。アイコンは `src/components/ui/icons.tsx` の `STATUS_ICONS` のキーです。

## 属性を足す・変える

- `src/content/common/elements/basic.ts` に1件足します。
  - `status` / `chance` / `amount`: HPに当たった時に、`chance`%で状態異常 `status` を `amount` 付ける（完全成功なら必ず）。付けない属性は省略
  - `color` / `icon`: 表示の色とアイコン（`src/components/ui/icons.tsx` の `ELEMENT_ICONS` のキー）
- カード・敵の行動のダメージに `element: '属性ID'` と書くと、その属性の攻撃になります。説明文（「8の雷属性ダメージ（30%で痺れ1…）」）は自動で作られます。
- 弱点・耐性の倍率は `src/data/balance.ts` の `elementWeakMul` / `elementResistMul` で変えます。

## 特殊能力の書き方（職業・装備・カード・敵で共通）

```ts
// 発動型: きっかけ + 条件 + 効果
{ name: '魔力暴走', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'magic' }], do: [{ kind: 'damage', amount: 5, to: 'randomFoe' }] } }
// 常時型
{ name: '闘志', effect: { modifier: 'damageDealt', multiplier: 1.25, if: [{ kind: 'selfHpAtMost', pct: 50 }] } }
{ name: '貫通', effect: { modifier: 'ignoreBlock' } }
{ name: 'かばう', effect: { modifier: 'coverLethal', chance: 30 } }
```

- **きっかけ（`when`）**

| 値 | いつ |
|---|---|
| `battleStart` | 戦闘開始時 |
| `turnStart` | ターン開始時 |
| `turnEnd` | ターン終了時 |
| `afterCard` | カードを使った後 |
| `perfect` | 完全成功した時 |
| `kill` | 敵を倒した時 |
| `hurt` | ダメージを受けた時 |

- **条件（`if`）**: 上から順に判定し、全部満たすと発動します。

| 値 | 意味 |
|---|---|
| `cardCategory` | カードの種類 |
| `cardHasDamage` | ダメージを与えるカード |
| `chance` | 確率 |
| `selfHpAtMost` | 自分のHPが○%以下 |
| `targetHpAtMost` | 対象のHPが○%以下 |
| `focusNotFull` | フォーカスが最大でない |
| `dealtDamage` | ダメージを与えた |

  `chance` は乱数を使うので、常時型には使えません。
- **説明文**は自動で作られます。雰囲気の文を足したい時だけ `description` を書きます。

- **K2で足した条件**: `selfStatus`（自分が状態異常を持つ）・`selfHpAtLeast`（HPが○%以上）・`foeCount`（敵の数）・`cardCost`・`cardSlots`・`hasPet`。
- **K2で足した常時型**: `elementGuard`（属性攻撃を無効・吸収・半減）・`convertElement`（属性の無い物理攻撃を別の属性に）。
- 詳しい使い方は `docs/tasks/K2-equipment.md`。装備には `explore`（世界マップの視界・野営の回復）と `scenario`（そのシナリオだけで出る）も書ける。

## 効果の部品（`kind`）

| kind | 内容 | 主な数値 | 対象の既定 |
|---|---|---|---|
| `damage` | ダメージ | `amount`, `hits`, `element` | target |
| `block` | ブロック | `amount` | self |
| `heal` | HP回復 | `amount` | target |
| `applyStatus` | 状態異常を付ける | `status`, `amount` | target |
| `gainMana` / `gainFocus` | マナ・フォーカス | `amount` | self |
| `draw` | カードを引く | `amount` | self |
| `taunt` | 挑発 | — | target |
| `cleanse` | 悪い状態異常を治す | — | target |
| `escape` | 戦闘から逃げる | — | self |
| `healPctOfDealt` | 与えたダメージの○%回復 | `pct` | self |
| `blockFromStatus` | 状態異常の量だけブロック | `status`, `of`, `mult`, `max` | self |
| `convertStatus` | 状態異常を別の状態異常に変える | `status`, `into` | target |
| `retaliate` | 反撃（`when: 'hurt'` の能力で、攻撃してきた相手に返す。毒などでは返さない） | `amount`, `element`, `perTurn` | — |
| `drainFocus` | 味方のフォーカスを奪う（敵用。0より下にならない） | `amount` | target |
| `summonEnemy` | 敵が敵を呼ぶ（戦場4体まで・1戦闘 `uses` 回・呼ばれた敵は報酬なし・次のターンから動く） | `enemy`, `count`, `uses` | self |

**対象（`to`）**: 省略すると表の「既定」になります。

| 値 | 意味 |
|---|---|
| `target` | 選んだ対象（全体カードなら相手全員） |
| `self` | 自分 |
| `allies` | 自分の側の全員 |
| `otherAllies` | 自分以外の自分の側 |
| `foes` | 相手の側の全員 |
| `randomFoe` | 相手からランダムに1人 |

## 今までにない仕組みを足す（プログラムのファイルを1つ置く）

| 足したいもの | 置き場所 | 書くこと |
|---|---|---|
| 効果の種類 | `src/engine/battle/effects/kinds/` | `export const effect`（`damage.ts` を写す） |
| 条件の種類 | `src/engine/abilities/conditions/` | `export const condition` |
| 冒険の効果（イベントの結果など） | `src/engine/game/outcomes/kinds/` | `export const outcome` |
| 依頼の目標 | `src/engine/game/world/objectives/` | `export const objective` |
| 部屋の動き | `src/engine/game/rooms/behaviors/` | `export const behavior` |
| 敵の行動の決め方 | `src/engine/battle/ai/` | `export const ai` |
| 成長ボーナスの種類 | `src/engine/game/growth/kinds/` | `export const growth`（`balance.ts` の `growthExtras` にも足す） |

- 新しい効果・条件・冒険の効果を作る時は、ファイルの中の `declare module` で数値の型を足します。これでデータの書き間違いが型チェックで見つかります。
- 効果の見た目のアイコンは、`src/components/ui/icons.tsx` の `EFFECT_ICON` に1行足すと付きます。無ければ汎用のアイコンになります。

## 絵を足す（描いた絵・Midjourney など）

画像は `src/assets/art/<種類>/<ID>.webp` に置くだけで使われます（無い物は今までの SVG の絵で描きます）。

| 種類 | ファイル | 大きさの目安 |
|---|---|---|
| 主人公（全身・顔） | `hero/<職業ID>-<male/female>.webp`・`-face.webp` | 480×660（下をそろえる）・192×192 |
| 敵 | `enemy/<敵ID>.webp`（第2段階は `-1`） | 520×620（下をそろえる） |
| 背景 | `bg/<背景ID>.webp`（ダンジョン・地形の `background`。部屋を選ぶ画面だけ別にするなら `mapBackground`） | 600×1071（暗く・少しぼかす） |
| 地形の模様 | `terrain/<地形ID>.webp` | 256×256（つなぎ目無し） |
| 道具・宝箱・地図の場所 | `item/<アイコン>.webp`・`chest/<レア度>.webp`・`place/<town/capital/dungeon/shrine/landmark>.webp` | 192・320・224 の正方形 |
| 画面の枠 | `ui/corner-*.webp`・`ui/ornament-top.webp`・`ui/panel.webp` | |

元の画像からの加工（背景の切り抜き・顔の切り出し・地形の模様のつなぎ目消し・背景を暗く）は、まとめてスクリプトで行います:

```bash
pip install "rembg[cpu]" opencv-python-headless pillow numpy
SRC=元画像のフォルダ python3 scripts/art/build_art.py            # 全部
SRC=元画像のフォルダ python3 scripts/art/build_art.py enemy/ bg/  # 名前の一部でしぼる
```

どの番号の元画像を何に使うかは、`scripts/art/build_art.py` の表（HEROES・ENEMIES・BGS など）に書きます。顔の位置は FACES で直せます。

読みやすさのための決まり:
- 背景は暗く・少しぼかし・まわりを暗くする（上に文字やカードが乗るため）。
- 敵と主人公は細い暗いふちを付ける（背景にまぎれないように）。
- 道具・地図の場所は薄く光るふちを付ける（暗い画面で形が分かるように）。
- 細長い道具（剣・杖・弓・槌・お守り）は斜めにして枠いっぱいに見せる。
- 宝箱は閉じた姿だけ。全部左向きにそろえる。開く時は「揺れ→光→はじける」で見せる。

## 数値・言葉・色を変える

| 変えたいもの | 場所 |
|---|---|
| 全体のルール（マナ・手札・確率表・宝箱・演出時間・敵のレベルの伸び） | `src/data/balance.ts` |
| 世界マップのルール（視界・移動力・時間帯の長さ・侵食度の増え方・野営・夜襲・襲撃・ショップの値段） | `src/data/balance.ts` の「世界マップ」の部分 |
| 職業・敵・装備・カードの数値 | それぞれのファイル |
| 難易度 | `src/content/common/difficulties/` |
| 部屋の種類（敵の強さ・ドロップ・カード報酬の確率・自動生成での出やすさ） | `src/content/common/roomTypes/` |
| 用語（侵食度・ゴールドなど）・能力値の名前 | `src/data/terms.ts` |
| 色（レア度・カードの種類・プレイヤー） | `src/data/theme.ts` |

## 難易度を調整する

- `src/content/common/difficulties/basic.ts` の `enemyLevel`（敵のレベル加算）・`enemyHp` / `enemyAttack`（敵の倍率）・`reward`（報酬の倍率）・`lives`（命の灯火）・`corruptionPerTurn`（1巡ごとの侵食度）を変えます。
- 変えたら、自動プレイでクリア率を確かめます（40回×難易度×人数。数十秒）:

  ```bash
  SIM=1 npx vitest run balance          # 結果は screenshots/balance.md
  SIM=1 SIM_SEEDS=20 SIM_PARTY=4人 SIM_DIFF=normal npx vitest run balance   # 回数・人数・難易度をしぼる
  ```
- 目安（自動プレイ・侵食の魔王・ふつう・40シード、2026年11月 fed89f2 で測定）: **2人 約85%・4人 約90%**。新しいシナリオは「侵食の魔王と比べて ±10ポイント以内」を目安にします。やさしい・むずかしいは、まだ測り直していません。
  - 前の目安（4人・ふつう 約20〜25%）は、自動プレイの宿の不具合（2人目が泊まれず町を出入りして日数を無駄にする。56efd01 で修正）があった頃の数字なので使いません。難易度の数値はそのままで、目安だけを直しました。

## 保存データの形を変える時

1. `src/engine/battle/battle.ts` の `STATE_VERSION` を1つ上げます。
2. `src/engine/game/migrations.ts` に「前の版 → 次の版」の直し方を1つ足します。
3. `src/engine/__tests__/content.test.ts` に、古い版を読むテストを足します。

※ オンライン協力の部屋は、作った時の「保存の版」と「コンテンツの版」を覚えています。どちらかが変わると（カード・敵・数値を変えた時も）、新しい版の端末は前からある部屋に入れません。公開した後は、新しく部屋を作り直してください。
