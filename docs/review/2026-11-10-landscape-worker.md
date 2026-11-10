# レビュー依頼: 世界マップの景色を別スレッド（Worker）で描く

- ブランチ: `claude/diorama-80bc6b`
- コミット: `1d78436`（5ファイル、+389行 / −45行）
- 作った人: Claude（2026-11-10）
- 頼みたいこと: 設計と不具合の見落としのレビュー。特に「最後に聞きたいこと」の6つ。

---

## 1. なぜ変えたか

世界マップの「箱庭」（高さのある地面・木・峰を Canvas に描いた景色）を入れたら、歩く時のなめらかさが落ちました。

- 原因: 霧が晴れるたびに、画面のスレッドで次の2つをしていたこと。
  1. 景色の帯を描き直す
  2. Canvas を PNG 画像に変える（とても重い）
- この間、駒が歩く動きが引っかかっていました。

## 2. 何をしたか（仕組み）

```
画面のスレッド（React）                     別スレッド（paint.worker.ts）
 ├ 地図が変わった時 ── static（地形・位置・道・川…）──▶ 覚える
 ├ 霧が晴れた時   ── seen（見えたマス Uint8Array）──▶ 覚える
 ├ 絵が読めた時   ── images（絵の URL）─────────────▶ fetch → ImageBitmap
 ├ 描いて        ── paint（区切り番号 k・帯）────────▶ OffscreenCanvas に描く → PNG（convertToBlob）
 └ img に入れる   ◀────────── blob ─────────────────┘
     ↳ img.decode() が終わってから入れ替える（入れ替えの瞬間の引っかかりを防ぐ）
```

- 描く中身は、画面のスレッドと同じ関数（`paint.ts`・`scatter.ts`・`sprites.ts`）を使い回しています。
- 乱数は使っていません（場所のハッシュだけ）。なので、どちらのスレッドで描いても同じ絵になります。
- 地図は高さ方向の「区切り（chunk）」に分けて、区切りごとに1枚の画像にしています。
- 古い結果は捨てます。
  - 地図を作り直すと `gen` が増え、古い `gen` の結果は捨てます。
  - 同じ区切りでは `seq` が古い結果を捨てます。
- 同じ区切りの次の仕事がもう待っている時は、PNG に変えるのを省きます（むだな PNG を作らない）。
- 別スレッドが使えない端末では、今までどおり画面のスレッドで描きます。
  - 調べるのは Worker・OffscreenCanvas・convertToBlob があるかどうか。
  - 別スレッドで一度でも失敗したら、その後はずっと画面のスレッドで描きます（`workerBroken`）。
- 拡大を変えた時・最初に表示する時は、画面のスレッドでもすぐ描きます。白い絵が一瞬出ないようにするためです。そのあと、別スレッドの画像に入れ替えます。
- 絵や侵食度が変わっただけの時は、今の画像を見せたまま、新しい画像を待ちます。

## 3. 変えたファイル

| ファイル | 変えたこと |
|---|---|
| `src/components/world/landscape/paint.worker.ts`（新規） | 別スレッドの本体（全文は下の付録） |
| `src/components/world/landscape/LandscapeLayer.tsx` | 別スレッドとのやり取り・画像の入れ替え・使えない時の切り替え |
| `src/components/world/landscape/paint.ts` | 地形の色の表を引数で受け取るように（別スレッドからはゲームのデータを読めないため） |
| `src/components/world/landscape/sprites.ts` | 絵を `HTMLImageElement` か `ImageBitmap` のどちらでも扱えるように。縮小した絵の置き場を `WeakMap` に |
| `scripts/diorama-shots.mjs` | 調べる時だけページに JS を足す設定（`INJECT_JS`） |

## 4. ついでに直した、前からの不具合

保存データを読み込み直した直後に、次のことが起きることがありました。

- 古い Canvas の PNG（`toBlob` の結果）が、遅れて新しい img に入っていました。
- そのため、地形がずれて見えていました（祭壇や祠が水のマスの上に乗って見えた）。
- 直し方: その Canvas がもう使われていなければ、結果を捨てるようにしました（`canvases.current[k] !== cv`）。

## 5. 結果

**なめらかさ**（Playwright・CPU を4倍遅く・4人・4マス歩く・2回ずつ測った平均fps）

| 版 | 拡大1倍で歩く | 拡大2倍で歩く |
|---|---|---|
| 箱庭の前 | 46.8 / 51.0 | 48.7 / 49.4 |
| 直す前 | 38.4 / 40.0 | 32.9 / 35.1 |
| 直した後 | 50.7 / 51.2 | 51.5 / 49.4 |

止まっている時は、どの版も 60fps です。

**見た目**

- 別スレッドで描いた絵と、画面のスレッドで描いた絵を、同じ場面9枚で比べました。
- 違いは、どれも 0.02% 以下でした。

**確認**（すべて通りました）

- 型チェック（tsc）
- 全テスト（837件成功・5件は飛ばす設定）
- ビルド（Worker は約98KBの別ファイル）
- 地図の確認スクリプト4本（拡大2.5倍・地図の枠・移動中の安定・カメラ）

**まだのこと**

- スマホの実機での確認
- push・公開・本線へのまとめは、していません。

## 6. Claude が自分で判断した所

1. 画像の形式は PNG にしました。JPEG や WebP より重いですが、透明な部分があり、正確に残したかったためです。
2. 別スレッドで一度でも失敗したら、その後はずっと画面のスレッドで描きます。何度も試して、さらに重くなるのを避けるためです。
3. 拡大を変えた時は、今までどおり画面のスレッドでもすぐ描きます。そのため、拡大を変える時の重さは変わっていません。
4. 区切りごとの OffscreenCanvas を別スレッドの中に残しています。霧が晴れた帯だけを描き直すためで、その分メモリを使います。

## 7. 気になっている所（自己レビュー）

- **メモリ**: 区切りごとの OffscreenCanvas（横幅×区切りの高さ×画面の倍率²）が、画面側の Canvas と別に、もう1組あります。古いスマホで足りるかどうか。
- **ImageBitmap を解放しない**: 絵は数十枚で、ずっと使うので残しています。
- **`sprites.ts` の `img.width`**: 前は `naturalWidth` でした。`new Image()` で作った、画面に置いていない画像なので同じ値になりますが、少し危うい書き方です。
- **`static` を送り直す時**: 道や川が変わった時は、地図全体の配列を送ります（数千マス分）。回数は少ないです。
- **ブラウザの対応**: iOS Safari は 16.4 より前だと OffscreenCanvas の 2D が無いので、画面のスレッドで描く方に切り替わるはずです。実機では、まだ確かめていません。

## 8. 最後に聞きたいこと

1. 古い結果を捨てる仕組み（`gen`・`seq`・`queued`）に、漏れや、画像が入れ替わらないままになる道はありますか？
2. メッセージを1つずつ順番に処理する作り（Promise のつなぎ）で、絵の読み込みを待つ間に詰まる心配はありますか？
3. 失敗したら、その後はずっと画面のスレッドで描く、という方針でよいですか？（数回は試し直すべきか）
4. PNG の代わりに、`transferToImageBitmap` で ImageBitmap を画面のスレッドへ渡し、画面の Canvas に描く方が良いですか？（PNG にする手間と、img を開く手間が無くなります。ただし画面のスレッドで描く手間が少し残ります）
5. メモリの使い方で、スマホで危ない所はありますか？
6. ゲームの状態・乱数・保存データに影響が出る道が無いか（無い作りのつもりです）。

---

## 付録A: 別スレッドの本体 `paint.worker.ts`（全文）

```ts
// ===== 景色の層を、別のスレッド（Worker）で描く =====
// 霧が晴れるたびの描き直し（地面・木・峰を Canvas に描いて、画像にする）を、画面のスレッドから外す。
// 画面のスレッドは、できた画像（PNG）を img に入れるだけなので、駒が歩く動きが引っかからない。
// 描く中身は画面のスレッドと同じ関数（paint.ts・scatter.ts・sprites.ts）。乱数は使わない（ハッシュだけ）ので、同じ絵になる。
import type { WorldState } from '../../../types';
import { paintRange, type PaintGeom, type TerrainLook } from './paint';
import { scatter, type SceneItem } from './scatter';
import { setImageSource, type SceneImage } from './sprites';

/** 地図の、描き直しの間は変わらない部分（変わったら gen が増える） */
export interface StaticMsg {
  type: 'static';
  gen: number;
  width: number;
  height: number;
  /** マスの地形・地域・場所があるか（見えたかどうかは SeenMsg） */
  t: string[];
  r: number[];
  f: boolean[];
  R: number;
  hexW: number;
  W: number;
  H: number;
  /** マスの中心・床の位置（x, y の順に並べた数） */
  centers: Float64Array;
  grounds: Float64Array;
  levels: number[];
  links: Map<number, number[]>;
  rivers: Map<number, number[]>;
  under: string[];
  roadTerrain: string;
  noProp: number[];
  stage: number;
  terrains: TerrainLook;
  dpr: number;
  top: number;
  chunk: number;
}
export interface SeenMsg {
  type: 'seen';
  seen: Uint8Array;
}
export interface ImagesMsg {
  type: 'images';
  urls: string[];
}
export interface PaintMsg {
  type: 'paint';
  gen: number;
  k: number;
  seq: number;
  band?: [number, number];
}
export type ToWorker = StaticMsg | SeenMsg | ImagesMsg | PaintMsg;
export interface FromWorker {
  gen: number;
  k: number;
  seq: number;
  blob?: Blob;
  error?: string;
}

const host = self as unknown as { postMessage(m: FromWorker): void; onmessage: ((e: MessageEvent<ToWorker>) => void) | null; location: Location };

const norm = (url: string) => new URL(url, host.location.href).href;
const bitmaps = new Map<string, SceneImage>();
setImageSource((url) => bitmaps.get(norm(url)));

let st: StaticMsg | undefined;
let seen: Uint8Array = new Uint8Array(0);
let tiles: WorldState['tiles'] = [];
let items: SceneItem[] | undefined;
let geom: PaintGeom | undefined;
const chunks = new Map<number, OffscreenCanvas>();
/** 区切りごとの、まだ順番を待っている描く仕事の数（後に同じ区切りの仕事が来ているなら、画像にするのを省く） */
const queued = new Map<number, number>();

function rebuildTiles() {
  if (!st) return;
  const s = st;
  tiles = s.t.map((t, i) => ({ t, r: s.r[i], seen: !!seen[i], ...(s.f[i] ? { f: { kind: 'town', id: '' } } : {}) })) as unknown as WorldState['tiles'];
  items = undefined;
}

let dims: { W: number; dpr: number; chunk: number; top: number; gen: number } | undefined;

async function handle(m: ToWorker) {
  if (m.type === 'paint') queued.set(m.k, (queued.get(m.k) ?? 1) - 1);
  if (m.type === 'static') {
    st = m;
    const { centers, grounds } = m;
    geom = {
      R: m.R,
      hexW: m.hexW,
      W: m.W,
      H: m.H,
      center: (i) => ({ x: centers[i * 2], y: centers[i * 2 + 1] }),
      ground: (i) => ({ x: grounds[i * 2], y: grounds[i * 2 + 1] }),
    };
    // 大きさが変わった時だけ、描いた区切りを捨てる（道・川が変わっただけなら、晴れた帯の描き直しで足りる）
    if (!dims || dims.W !== m.W || dims.dpr !== m.dpr || dims.chunk !== m.chunk || dims.top !== m.top || dims.gen !== m.gen) chunks.clear();
    dims = { W: m.W, dpr: m.dpr, chunk: m.chunk, top: m.top, gen: m.gen };
    rebuildTiles();
    return;
  }
  if (m.type === 'seen') {
    seen = m.seen;
    rebuildTiles();
    return;
  }
  if (m.type === 'images') {
    // 画面のスレッドで読み込めた絵と同じ物を、ここでも読む（読み終わるまで、次の描く仕事は待つ）
    await Promise.all(
      m.urls.map(async (url) => {
        const key = norm(url);
        if (bitmaps.has(key)) return;
        try {
          const blob = await (await fetch(key)).blob();
          bitmaps.set(key, await createImageBitmap(blob));
        } catch {
          // 読めない絵は、画面のスレッドの「絵が無い時」と同じく、仮の図で描く
        }
      }),
    );
    return;
  }
  if (!st || !geom || m.gen !== st.gen) return;
  const s = st;
  const g = geom;
  if (!items) {
    const noProp = new Set(s.noProp);
    items = scatter({ w: { width: s.width, height: s.height, tiles }, geom: g, levels: s.levels, links: s.links, rivers: s.rivers, stage: s.stage, blocked: (i) => s.f[i] || noProp.has(i) });
  }
  let cv = chunks.get(m.k);
  const full = !cv || !m.band;
  if (!cv) {
    cv = new OffscreenCanvas(Math.ceil(s.W * s.dpr), Math.ceil(s.chunk * s.dpr));
    chunks.set(m.k, cv);
  }
  const ctx = cv.getContext('2d') as unknown as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error('no 2d context');
  const y0 = s.top + m.k * s.chunk;
  const a = full ? y0 : Math.max(y0, m.band![0]);
  const b = full ? y0 + s.chunk : Math.min(y0 + s.chunk, m.band![1]);
  if (b > a) {
    const pa = Math.floor((a - y0) * s.dpr), pb = Math.ceil((b - y0) * s.dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, pa, cv.width, pb - pa);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, pa, cv.width, pb - pa);
    ctx.clip();
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    paintRange(ctx, { w: { width: s.width, height: s.height }, tiles, geom: g, levels: s.levels, links: s.links, rivers: s.rivers, under: s.under, roadTerrain: s.roadTerrain, items, terrains: s.terrains }, y0 + pa / s.dpr, y0 + pb / s.dpr, y0);
    ctx.restore();
  }
  if ((queued.get(m.k) ?? 0) > 0) return;
  const blob = await cv.convertToBlob({ type: 'image/png' });
  host.postMessage({ gen: m.gen, k: m.k, seq: m.seq, blob });
}

// 届いた順に1つずつ（絵の読み込みを待つ間も、順番を守る）
let chain: Promise<void> = Promise.resolve();
host.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'paint') queued.set(m.k, (queued.get(m.k) ?? 0) + 1);
  chain = chain.then(() =>
    handle(m).catch((err: unknown) => {
      if (m.type === 'paint') host.postMessage({ gen: m.gen, k: m.k, seq: m.seq, error: String(err) });
    }),
  );
};
```

## 付録B: 画面のスレッド側（`LandscapeLayer.tsx` の要所）

### 失敗した時の切り替えと、届いた画像の入れ替え

```tsx
  const giveUp = () => {
    workerBroken = true;
    worker.current?.terminate();
    worker.current = null;
    setWorkerOff(true);
  };
  /** 別のスレッドから届いた画像を、区切りの img に入れる（開き終わってから Canvas を隠す） */
  const showImage = (r: FromWorker) => {
    if (r.error) return giveUp();
    if (r.gen !== gen.current || !r.blob || r.seq < (shownSeq.current[r.k] ?? -1)) return;
    shownSeq.current[r.k] = r.seq;
    const img = imgs.current[r.k];
    if (!img) return;
    const url = URL.createObjectURL(r.blob);
    const old = img.dataset.url;
    img.dataset.url = url;
    img.src = url;
    if (old) URL.revokeObjectURL(old);
    const done = () => {
      if (img.dataset.url !== url) return;
      img.style.visibility = 'visible';
      const cv = canvases.current[r.k];
      if (cv) cv.style.display = 'none';
    };
    // 開き終わってから入れ替える（入れ替えの瞬間に、画面のスレッドで画像を開く重さが出ないように）
    img.decode().then(done, done);
  };
```

### 描き直しの判断（useLayoutEffect）

```tsx
  useLayoutEffect(() => {
    if (frozen) return;
    const fresh = ensureWorker();
    const useWorker = !!worker.current;
    const prev = last.current;
    last.current = { g, tiles, stage, ver: imgVer, dpr, worker: useWorker };
    // 区切りの Canvas・img を作り直した時（最初・拡大を変えた時・別のスレッドをやめた時）は、画面のスレッドですぐ描く（白い絵が一瞬出ないように）
    const remade = !prev || prev.g !== g || prev.dpr !== dpr || prev.tiles.length !== tiles.length || prev.worker !== useWorker;
    const all = fresh || remade || prev.stage !== stage || prev.ver !== imgVer;
    if (all) {
      cancelAnimationFrame(raf.current);
      pending.current.clear();
      if (useWorker) {
        gen.current++;
        sendStatic();
        sendSeen();
        post({ type: 'images', urls: loadedImageUrls() });
        if (remade) for (let k = 0; k < n; k++) paint(k);
        // 絵・侵食度が変わっただけなら、今の画像を見せたまま、別のスレッドの新しい画像を待つ
        for (let k = 0; k < n; k++) workerPaint(k);
      } else for (let k = 0; k < n; k++) paint(k);
      return;
    }
    if (prev.tiles === tiles) return;
    // 霧が晴れた時: 晴れたマス（と、その周りの木・峰）の帯
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i].seen === prev.tiles[i].seen) continue;
      const ys = [i, ...[0, 1, 2, 3, 4, 5].map((k) => neighborAt(w, i, k) ?? i)].map((j) => g.center(j).y);
      lo = Math.min(lo, Math.min(...ys) - R * 2.6);
      hi = Math.max(hi, Math.max(...ys) + R * 1.2);
    }
    if (!(hi > lo)) return;
    const k0 = Math.max(0, Math.floor((lo - top) / CHUNK)), k1 = Math.min(n - 1, Math.floor((hi - top) / CHUNK));
    if (useWorker) {
      // 別のスレッドへ: 見えたマスを知らせて、帯を描いてもらう（画面のスレッドは描かない）
      sendStatic();
      sendSeen();
      for (let k = k0; k <= k1; k++) workerPaint(k, [lo, hi]);
      return;
    }
    for (let k = k0; k <= k1; k++) {
      const was = pending.current.get(k);
      pending.current.set(k, was ? [Math.min(was[0], lo), Math.max(was[1], hi)] : [lo, hi]);
    }
    runPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, tiles, stage, imgVer, frozen, dpr, n, workerOff]);
```
