// 賢いマルチプレイ検証 bot: 世界の「説明書き」（区切り 2-Sb。網羅の表と道探しに使う）
// 地形の移動力（決まった表）・シナリオの町・依頼・ダンジョン・イベント・祠・神殿と祭壇・災厄・ジョブの段。
// 読むのは src のデータの決まった中身だけ（人が図鑑や説明書を読むのと同じ）。地図の乱数（宝箱やイベントの場所）・霧の中・エンジンの状態は読まない。
// load.mjs の loadContent({ scenarioIndex }) が、同じ vite の窓口で1回だけ読む。

/** 地図が使う地形の id（地域・道の帯・仕切り・寄り道の壁と首） */
function mapTerrainIds(map) {
  const ids = new Set();
  for (const r of map.regions ?? []) for (const k of Object.keys(r.terrain ?? {})) ids.add(k);
  for (const l of map.lanes ?? []) for (const [k, w] of Object.entries(l.terrain ?? {})) if (w > 0) ids.add(k);
  for (const b of map.barriers ?? []) {
    if (b.terrain) ids.add(b.terrain);
    if (b.tideGaps?.terrain) ids.add(b.tideGaps.terrain);
  }
  for (const p of map.pockets ?? []) {
    if (p.wall) ids.add(p.wall);
    if (p.neck) ids.add(p.neck);
  }
  return [...ids];
}

/**
 * @param load (path) => モジュール（vite の ssrLoadModule）
 * @param scenarioIndex 0 = 1本目（シナリオのカードの並び = order の順）
 */
export async function readWorldContent(load, scenarioIndex) {
  const { SCENARIOS } = await load('/src/data/scenarios/index.ts');
  const W = await load('/src/data/world/index.ts');
  const { DUNGEONS } = await load('/src/data/dungeons/index.ts');
  const { EVENTS } = await load('/src/data/events/index.ts');
  const { CLASSES } = await load('/src/data/classes/index.ts');
  const { BALANCE } = await load('/src/data/balance.ts');
  const { DUNGEON_THEMES } = await load('/src/data/rules/index.ts');
  const scenarios = [...SCENARIOS.all].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const sc = scenarios[scenarioIndex];
  if (!sc) throw new Error(`シナリオ ${scenarioIndex + 1}本目が無い`);
  const sid = sc.id;
  const map = sc.map;
  const terrains = {};
  for (const t of W.TERRAINS.all) terrains[t.id] = { id: t.id, name: t.name, moveCost: t.moveCost ?? 0, sea: !!t.sea, shipCost: t.shipCost ?? null, tide: t.tide ?? null, tideShip: !!t.tideShip, cold: t.climate?.kind === 'cold' };
  const towns = W.TOWNS.forScenario(sid).map((t) => ({ id: t.id, name: t.name, quests: t.quests ?? [], innCost: t.innCost, removeCost: t.removeCost }));
  // 依頼: 受ける町（町の説明書きの quests）・報告する町・目標の種類（町の掲示板に出る字と同じ決まった中身）
  const townOfQuest = {};
  for (const t of W.TOWNS.forScenario(sid)) for (const q of t.quests ?? []) townOfQuest[q] ??= t.id;
  const quests = W.QUESTS.forScenario(sid).map((q) => ({ id: q.id, title: q.title, town: townOfQuest[q.id] ?? null, reportTown: q.reportTown ?? townOfQuest[q.id] ?? null, objective: q.objective ?? null, ship: (q.reward ?? []).some((r) => r.kind === 'ship') }));
  const dungeons = DUNGEONS.forScenario(sid).map((d) => ({ id: d.id, name: d.name, random: !!d.random, finale: !!d.finale, rewardKey: d.rewardKey ?? null, requiresKeys: d.requiresKeys ?? [] }));
  const events = EVENTS.forScenario(sid).map((e) => ({ id: e.id, title: e.title, where: e.where ?? 'dungeon', common: !EVENTS.scenarioOf(e.id), hiddenIn: e.hiddenIn ?? null, placed: !!e.placed, night: !!e.night, terrain: e.terrain ?? null, needsPet: !!e.needsPet }));
  const shrines = W.SHRINES.forScenario(sid).map((s) => ({ id: s.id, name: s.name }));
  const sanctuaries = W.SANCTUARIES.forScenario(sid).map((s) => ({ id: s.id, kind: s.kind, name: s.name, altars: s.altars ?? [] }));
  const scourgeIds = map.scourges ?? [];
  const scourges = scourgeIds.map((id) => W.SCOURGES.tryGet(id)).filter(Boolean).map((s) => ({ id: s.id, name: s.name, short: s.short }));
  const classes = CLASSES.all.map((c) => ({ id: c.id, name: c.name, tier: c.tier ?? 'base', weaponType: c.weaponType, altar: c.altar ?? null }));
  // 地図の骨格（決まった物だけ）: 町・鍵のダンジョン・名所の位置。宝箱・イベント・祠・塔は種で置かれるので、ここには無い（画面で見つける）
  const features = (map.features ?? []).map((f) => ({ kind: f.kind, id: f.id, at: f.at }));
  const regions = (map.regions ?? []).map((r) => ({ id: r.id, name: r.name, rows: r.rows, chests: r.chests ?? 0, events: r.events ?? 0, shrines: r.shrines ?? 0, herbs: r.herbs ?? 0, randomDungeons: r.randomDungeons ?? [], wanderers: r.wanderers ?? 0, enemyLevel: r.enemyLevel }));
  const prefer = map.prefer ?? {};
  return {
    scenarioId: sid,
    scenarioName: sc.name,
    width: map.width,
    height: map.height,
    roadTerrain: map.roadTerrain ?? 'road',
    terrains,
    towns,
    quests,
    dungeons,
    events,
    shrines,
    sanctuaries,
    scourges,
    classes,
    features,
    regions,
    // 見晴らしの塔の数（prefer.tower の帯の数 = 置く塔の数。場所は種で決まる）
    towers: Array.isArray(prefer.tower) ? prefer.tower.length : prefer.tower ? 1 : 0,
    randomDungeonCount: regions.reduce((a, r) => a + r.randomDungeons.length, 0),
    // シナリオだけの仕組み（地図の仕切り・潮・寒さ）の有無（行を足すかどうかに使う）
    special: {
      tide: Object.values(terrains).some((t) => t.tide) && JSON.stringify(map).includes('tide'),
      cold: JSON.stringify(map).includes('cold') || JSON.stringify(sc).includes('climate'),
      // 区切り5: 船は「地図に海の地形がある」か「船をくれる依頼がある」で決める（前の形は地図の字に 'ship' があるかで、シナリオ3でも行が出なかった）
      ship: mapTerrainIds(map).some((id) => terrains[id]?.sea) || quests.some((q) => q.ship),
    },
    // 区切り5: このシナリオだけのダンジョンのテーマ（シナリオ2 = 氷漬けの宝物庫〔凍え〕・シナリオ3 = 漂流物の洞〔漂流物の山〕）
    themes: DUNGEON_THEMES.all.filter((t) => t.scenario === sid).map((t) => ({ id: t.id, name: t.name, chill: !!t.chill, flotsam: !!t.flotsam })),
    // 地図の回復のマスのイベント（シナリオ2 = 温泉）
    herbEvent: map.herbEvent ?? null,
    jobChange: { ...BALANCE.jobChange },
  };
}
