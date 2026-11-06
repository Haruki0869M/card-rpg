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
    weaponTypes/   武器の種類
    difficulties/  難易度
    roomTypes/     ダンジョンの部屋の種類
  scenarios/
    corruptionKing/
      scenario.ts  シナリオの説明と開始条件
      enemies/  dungeons/  events/
```

---

## シナリオを足す

1. `src/content/scenarios/<新しいID>/scenario.ts` を作ります。`corruptionKing/scenario.ts` を写して、`id`・`name`・`synopsis`・`start` を書き換えてください。
2. 同じフォルダの `enemies/`・`dungeons/`・`events/` に、そのシナリオ専用のデータを置きます。
3. まだ遊べない場合は `unlocked: false` と `unlockText` を書きます。

## 職業を足す

1. `src/content/common/classes/<id>.ts` を作ります。`warrior.ts` を写して書き換えてください。
   - 能力値（`stats`）、最大HP、初期デッキ、初期装備、`weaponType`（武器の種類のID）
   - `battleAbility`（下の「特殊能力」）、`exploreAbility`
   - `cardPool`（報酬で出るカード）、`growthWeights`（伸びやすい能力値）
2. 見た目は `src/art/hero/looks.ts` に1件足します。無ければ仮の絵が出ます。

## 敵を足す

1. `src/content/.../enemies/<id>.ts` を作ります。
   - `maxHp` と `baseLevel`（その数値が想定しているレベル）を書きます。
   - `actions` に行動を並べます。効果は下の「効果の部品」から選びます。
   - `pattern` は行動の決め方です。`sequence` = 上から順、`random` = ランダム。
2. 任意の項目:
   - `hpPerLevel` / `attackPerLevel`: レベルごとの伸び方をこの敵だけ変える
   - `phases`: ボスの段階（HPが減ると行動が変わる）
   - `abilities`: 特殊能力（味方と同じ書き方）
3. 出す場所はダンジョンの `pools` に ID を書きます。
4. 絵は `src/art/enemies/` にファイルを置き、`export const enemyArt = { 敵ID: 絵 }` と書きます。無ければ仮の絵が出ます。

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
  - `harmful`: 悪い効果か（万能薬で治る）
- 説明文は自動で作られます。アイコンは `src/components/ui/icons.tsx` の `STATUS_ICONS` のキーです。

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

## 効果の部品（`kind`）

| kind | 内容 | 主な数値 | 対象の既定 |
|---|---|---|---|
| `damage` | ダメージ | `amount`, `hits` | target |
| `block` | ブロック | `amount` | self |
| `heal` | HP回復 | `amount` | target |
| `applyStatus` | 状態異常を付ける | `status`, `amount` | target |
| `gainMana` / `gainFocus` | マナ・フォーカス | `amount` | self |
| `draw` | カードを引く | `amount` | self |
| `taunt` | 挑発 | — | target |
| `cleanse` | 悪い状態異常を治す | — | target |
| `escape` | 戦闘から逃げる | — | self |
| `healPctOfDealt` | 与えたダメージの○%回復 | `pct` | self |

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
| 部屋の動き | `src/engine/game/rooms/behaviors/` | `export const behavior` |
| 敵の行動の決め方 | `src/engine/battle/ai/` | `export const ai` |
| 成長ボーナスの種類 | `src/engine/game/growth/kinds/` | `export const growth`（`balance.ts` の `growthExtras` にも足す） |

- 新しい効果・条件・冒険の効果を作る時は、ファイルの中の `declare module` で数値の型を足します。これでデータの書き間違いが型チェックで見つかります。
- 効果の見た目のアイコンは、`src/components/ui/icons.tsx` の `EFFECT_ICON` に1行足すと付きます。無ければ汎用のアイコンになります。

## 数値・言葉・色を変える

| 変えたいもの | 場所 |
|---|---|
| 全体のルール（マナ・手札・確率表・宝箱・演出時間・敵のレベルの伸び） | `src/data/balance.ts` |
| 職業・敵・装備・カードの数値 | それぞれのファイル |
| 難易度 | `src/content/common/difficulties/` |
| 部屋の種類（敵の強さ・ドロップ・カード報酬の確率・自動生成での出やすさ） | `src/content/common/roomTypes/` |
| 用語（侵食度・ゴールドなど）・能力値の名前 | `src/data/terms.ts` |
| 色（レア度・カードの種類・プレイヤー） | `src/data/theme.ts` |

## 保存データの形を変える時

1. `src/engine/battle/battle.ts` の `STATE_VERSION` を1つ上げます。
2. `src/engine/game/migrations.ts` に「前の版 → 次の版」の直し方を1つ足します。
3. `src/engine/__tests__/content.test.ts` に、古い版を読むテストを足します。
