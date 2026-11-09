import { FacilityRoster, FacilityExit } from './FacilityControls';
import { ItemInfoArea } from '../ItemDetail';
import { facilityMembers, facilityVisit } from '../../engine/game/world/facilities';
// ===== 世界マップの場面: 遭遇（spec §8.5）・町（§17）・祠（§8.4）・エンディング =====
import { motion } from 'framer-motion';
import { ArrowUpCircle, BedDouble, Check, Coins, Eye, HandCoins, ScrollText, Sparkles, Store, Swords, Trash2, Wind } from 'lucide-react';
import { useCallback, useState } from 'react';
import { BattleBackground, EnemyArt } from '../../art';
import { BALANCE } from '../../data/balance';
import { cardOf, getCard } from '../../data/cards';
import { getEnemy } from '../../data/enemies';
import { getItem } from '../../data/items';
import { corruptionName, getScenario } from '../../data/scenarios';
import { QUESTS, SANCTUARIES, SHRINES, TOWNS } from '../../data/world';
import { canChangeNow } from '../JobSheet';
import { PetAwards } from '../ui/PetToken';
import { EndPetRecord, MyPetCall } from '../lorebook/MyPets';
import {
  affinityFromStats,
  canReportQuest,
  finalChance,
  townVisitor,
  heroFocusMax,
  heroMaxHp,
  heroStats,
  jobOptions,
  objectiveHandler,
  questProgress,
  sceneBackground,
  sceneHeroes,
  sellPrice,
  shopPriceFor,
  statChance,
} from '../../engine';
import { isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import { getClass } from '../../data/classes';
import { OthersTurnNote } from '../screens/OnlineScreens';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { Hero } from '../../types';
import { CardFace } from '../ui/CardFace';
import { CardPickPanel } from '../ui/CardPickPanel';
import { CheckPanel, RollStrip } from '../ui/CheckPanel';
import { Heading, HeroFace, ItemIcon, itemSummary, RARITY_STYLE, Screen } from '../ui/game';
import { WorldTopBar } from './WorldScreen';
import { BuyNotice, boughtNotice, type Bought } from './BuyNotice';

/** 買った時のお知らせの番号（同じ物を続けて買っても出し直す） */
let buySeq = 0;

/** 席の名前（オンラインなら参加者の名前、1台なら P1 など） */
const seatLabel = (p: string) => useOnline.getState().room?.seatName(p as never) ?? p;

// ---------- 遭遇 ----------

export function EncounterScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const e = game.encounter!;
  const w = game.world!;
  const wd = w.wanderers.find((x) => x.id === e.wandererId);
  const cands = e.candidates.map((id) => game.heroes.find((h) => h.id === id)!).filter(Boolean);
  const forced = new Set(cands.filter((h) => w.pos[h.id] === e.tile).map((h) => h.id));
  // 遭遇したキャラの担当が決める。他の人のキャラは、その人が「加わる」と答えた時だけ参加
  const mover = game.heroes.find((h) => h.id === e.heroId)!;
  const moverLocal = isLocalPlayer(mover.playerId);
  const others = (h: Hero) => h.playerId !== mover.playerId;
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const participants = cands.filter((h) => forced.has(h.id) || (others(h) ? e.joins?.[h.id] === true : (joined[h.id] ?? true))).map((h) => h.id);
  const [mode, setMode] = useState<'ambush' | 'flee' | null>(null);
  const [heroId, setHeroId] = useState(e.heroId);
  const [focus, setFocus] = useState(0);
  // 判定するキャラは、遭遇したキャラの担当のキャラから
  const rollers = cands.filter((h) => participants.includes(h.id) && !others(h));
  const roller = rollers.find((h) => h.id === heroId) ?? rollers[0] ?? mover;
  const r = e.result;

  return (
    <Screen>
      <WorldTopBar game={game} />
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <BattleBackground kind={sceneBackground(game)} className="absolute inset-0 h-full w-full opacity-50" />
        <div className="relative px-3 pt-3">
          <div className="font-display text-outline text-center text-[24px] text-red-200">{e.ambushed ? '夜襲だ！' : wd?.raidTown ? '町を襲う魔物！' : '魔物に遭遇した！'}</div>
          <div className="mt-1 flex items-end justify-center gap-1">
            {wd?.enemies.map((en, i) => (
              <div key={i} className="flex flex-col items-center">
                <EnemyArt defId={en.defId} className="h-[110px] w-[92px]" />
                <span className="text-outline text-[12px] font-bold">
                  {getEnemy(en.defId).name} <span className="text-amber-300">Lv{en.level ?? 1}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="panel mt-2 rounded-xl p-2">
            <div className="text-[12px] text-zinc-300">戦闘に参加するキャラ（{BALANCE.joinRange}マス以内の仲間も参加できる）</div>
            <div className="mt-1 flex gap-1">
              {cands.map((h) => {
                const on = participants.includes(h.id);
                const other = others(h) && !forced.has(h.id);
                // 自分のキャラ（遭遇した人）は手元で選ぶ。他の人のキャラは、その人が答える
                const canTap = !r && !forced.has(h.id) && (other ? isLocalPlayer(h.playerId) : moverLocal);
                const label = forced.has(h.id) ? 'このマス' : other ? (e.joins?.[h.id] === undefined ? '返事待ち' : on ? '加わる' : '加わらない') : on ? '参加する' : '参加しない';
                return (
                  <button
                    key={h.id}
                    disabled={!canTap}
                    onClick={() => (other ? dispatchGame({ type: 'ENCOUNTER_JOIN', playerId: h.playerId, heroId: h.id, join: !on }) : setJoined({ ...joined, [h.id]: !on }))}
                    className={`btn flex min-w-0 flex-1 flex-col items-center rounded-lg border-2 py-1 disabled:opacity-100 disabled:filter-none ${on ? 'sel-on' : 'border-white/10 bg-black/30'}`}
                  >
                    <HeroFace hero={h} size={32} dim={!on} />
                    <span className="truncate text-[12px] font-bold">{h.name}</span>
                    <span className={`text-[12px] ${other && canTap ? 'text-sky-200' : 'text-zinc-400'}`}>{other && canTap ? `${label}（タップで変える）` : label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {r && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-col items-center gap-1">
              <RollStrip results={r.results} />
              <div className={`text-[16px] font-bold ${r.success ? 'text-emerald-300' : 'text-red-300'}`}>
                {r.choice === 'ambush' ? (r.success ? '奇襲成功！ 敵は最初のターンに動けない' : '奇襲は失敗。普通に戦闘が始まる') : r.success ? '逃げ切った！' : '逃げられなかった！ 戦闘が始まる'}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <div className="panel shrink-0 rounded-t-2xl px-3 pt-2 pb-3">
        {!moverLocal ? (
          <OthersTurnNote seat={mover.playerId} name={`${seatLabel(mover.playerId)}さん`} what={`${mover.name}でどうするか選んでいます`} />
        ) : r ? (
          <button onClick={() => dispatchGame({ type: 'ENCOUNTER_CONTINUE', playerId: mover.playerId, participants })} className="btn btn-gold font-display h-12 w-full rounded-xl text-[18px]">
            {r.choice === 'flee' && r.success ? '世界マップへ' : '戦闘開始'}
          </button>
        ) : mode ? (
          <>
            <CheckPanel
              heroes={rollers}
              heroId={roller.id}
              setHeroId={setHeroId}
              focus={focus}
              setFocus={setFocus}
              stat={mode === 'ambush' ? 'per' : 'agi'}
              tag={mode}
              slots={BALANCE.encounterSlots}
              need={BALANCE.encounterNeed}
              successLabel={mode === 'ambush' ? '奇襲成功（失敗しても普通に戦うだけ）' : '逃走成功（失敗すると戦闘）'}
            />
            <div className="mt-2 grid grid-cols-[1fr_2fr] gap-2">
              <button onClick={() => setMode(null)} className="btn btn-dark h-12 rounded-xl text-[14px] font-bold">
                戻る
              </button>
              <button
                onClick={() => dispatchGame({ type: 'ENCOUNTER_CHOOSE', playerId: roller.playerId, choice: mode, heroId: roller.id, focusUsed: focus, participants })}
                className="btn btn-gold font-display h-12 rounded-xl text-[18px]"
              >
                {mode === 'ambush' ? '奇襲を狙う' : '逃げる'}
              </button>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => dispatchGame({ type: 'ENCOUNTER_CHOOSE', playerId: mover.playerId, choice: 'fight', heroId: e.heroId, focusUsed: 0, participants })}
              className="btn btn-gold font-display flex h-14 flex-col items-center justify-center rounded-xl text-[16px]"
            >
              <Swords size={20} />
              戦う
            </button>
            <button
              disabled={e.ambushed}
              onClick={() => {
                setMode('ambush');
                setHeroId([...rollers].sort((a, b) => statChance(b, 'per', 'ambush') - statChance(a, 'per', 'ambush'))[0].id);
              }}
              className="btn btn-dark flex h-14 flex-col items-center justify-center rounded-xl text-[13px] font-bold"
            >
              <Eye size={18} />
              奇襲を狙う
            </button>
            <button
              disabled={e.ambushed}
              onClick={() => {
                setMode('flee');
                setHeroId([...rollers].sort((a, b) => statChance(b, 'agi', 'flee') - statChance(a, 'agi', 'flee'))[0].id);
              }}
              className="btn btn-dark flex h-14 flex-col items-center justify-center rounded-xl text-[13px] font-bold"
            >
              <Wind size={18} />
              逃げる
            </button>
          </div>
        )}
      </div>
    </Screen>
  );
}

// ---------- 町 ----------

type TownTab = 'shop' | 'inn' | 'quests' | 'remove' | 'sell';
const TOWN_TABS: { id: TownTab; name: string; Icon: typeof Store }[] = [
  { id: 'shop', name: 'ショップ', Icon: Store },
  { id: 'inn', name: '宿屋', Icon: BedDouble },
  { id: 'quests', name: '依頼', Icon: ScrollText },
  { id: 'remove', name: 'カード削除', Icon: Trash2 },
  { id: 'sell', name: '売却', Icon: HandCoins },
];

const chanceOf = (hero: Hero, cardId: string) => finalChance(getCard(cardId), affinityFromStats(heroStats(hero)));

export function TownScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const openSheet = useBattle((s) => s.openSheet);
  const [tab, setTab] = useState<TownTab>('shop');
  const t = game.town!;
  const def = TOWNS.get(t.townId);
  const w = game.world!;
  const stock = w.shops[def.id];
  // 町に入ったキャラ（お金・持ち物はこのキャラのもの。操作できるのはこのキャラの担当だけ）
  const [visitorId, setVisitorId] = useState<string>();
  const visitors = game.heroes.filter(h => facilityMembers(game).includes(h.id));
  const v = visitors.find(h => h.id === visitorId) ?? visitors.find(h => isLocalPlayer(h.playerId) && !game.town?.finished?.includes(h.id)) ?? townVisitor(game)!;
  const mine = isLocalPlayer(v.playerId) && !game.town?.finished?.includes(v.id);
  const p = v.playerId;
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const sellable = v.stash;
  const myCards = stock?.cards.map((c, i) => ({ c, i })).filter(({ c }) => getClass(game.heroes.find((x) => x.id === c.heroId)?.classId ?? '').id === v.classId) ?? [];
  // 買った時の手応え（フェーズ2-A）: 装備品は「すぐ装備」の窓、道具・カードは短いお知らせ
  const [bought, setBought] = useState<Bought | null>(null);
  // カード売り場: カードか値段のボタンを押すと説明の窓を開く。買うのは窓の「〇〇Gで買う」だけ（フェーズ3）
  const [cardSel, setCardSel] = useState<number | null>(null);
  const closeCardSel = useCallback(() => setCardSel(null), []);
  const selCard = cardSel !== null ? stock?.cards[cardSel] : undefined;
  const closeBought = useCallback(() => setBought(null), []);
  const buy = (kind: 'item' | 'card', index: number) => {
    const entry = kind === 'item' ? stock?.items[index] : stock?.cards[index];
    if (!entry) return;
    const err = dispatchGame({ type: 'TOWN_BUY', heroId: v.id, playerId: p, kind, index });
    if (err) return;
    const id = ++buySeq;
    if ('item' in entry) {
      const after = useBattle.getState().game?.heroes.find((h) => h.id === v.id);
      const def = getItem(entry.item.itemId);
      // 道具袋が満杯だとゴールドに換わる（その時はエンジンの記録の文をそのまま出す）
      if (def.slot === 'consumable' && !after?.pouch.some((x) => x.uid === entry.item.uid)) setBought({ id, kind: 'text', text: `${def.name}を買った！（袋が満杯のためゴールドに換えた）` });
      else setBought(boughtNotice(id, v.name, v.id, { kind: 'item', itemUid: entry.item.uid, itemId: entry.item.itemId }));
    } else setBought(boughtNotice(id, v.name, v.id, { kind: 'card', cardName: getCard(entry.cardId).name }));
  };

  return (
    <Screen bg="town" bgOpacity={0.28}>
      <WorldTopBar game={game} goldHeroId={v.id} />
      <FacilityRoster game={game} selected={v.id} onSelect={setVisitorId} />
      <Heading sub={def.description}>{def.name}</Heading>
      <div className="mx-3 mt-1 flex shrink-0 items-center gap-2 rounded-lg bg-black/40 px-2 py-1 text-[13px]">
        <HeroFace hero={v} size={28} />
        <span className="min-w-0 flex-1 truncate">
          <b>{v.name}</b>が町にいます
        </span>
        <span className="flex items-center gap-0.5 font-bold text-amber-200 tabular-nums">
          <Coins size={14} />
          {v.gold}G
        </span>
        {mine && jobOptions(v).length > 0 && (
          <button onClick={() => { useBattle.setState({ activeId: v.id }); openSheet('jobs'); }} className={`btn flex h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-[12px] font-bold ${canChangeNow(game, v) ? 'btn-gold' : 'btn-dark'}`}>
            <ArrowUpCircle size={15} />
            聖堂（転職）
          </button>
        )}
      </div>
      <MyPetCall game={game} hero={v} />
      {/* タブは画面の幅を5等分（横にスクロールさせない。「売却」が切れないように） */}
      <div className="mt-1 grid shrink-0 grid-cols-5 gap-1 px-2 pb-1" data-town-tabs>
        {TOWN_TABS.map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)} className={`btn flex min-h-11 min-w-0 flex-col items-center justify-center rounded-lg px-0.5 py-0.5 text-[12px] leading-4 font-bold ${tab === x.id ? 'btn-gold' : 'btn-dark'}`}>
            <x.Icon size={16} />
            <span className="whitespace-nowrap">{x.name}</span>
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6" data-town-body>
        {tab === 'shop' && stock && (
          <div className="flex flex-col gap-1">
            {stock.items.map((s, i) => {
              const it = getItem(s.item.itemId);
              return (
                <div key={s.item.uid} className={`flex items-center gap-2 rounded-lg bg-black/30 p-1.5 ${s.sold ? 'opacity-40' : ''}`}>
                  <ItemInfoArea itemId={it.id} heroId={v.id} className="flex flex-1 items-center gap-2">
                    <ItemIcon item={it} size={42} />
                    <span className="min-w-0 flex-1 leading-4">
                      <span className="block text-[14px] font-bold" style={{ color: RARITY_STYLE[it.rarity].color }}>
                        {it.name}
                      </span>
                      <span className="block truncate text-[12px] text-zinc-400">{itemSummary(it)}</span>
                    </span>
                  </ItemInfoArea>
                  <button
                    disabled={!mine || s.sold || v.gold < shopPriceFor(v, s.price)}
                    onClick={() => buy('item', i)}
                    className="btn btn-gold flex h-11 w-[78px] shrink-0 items-center justify-center gap-0.5 rounded-lg text-[13px] font-bold"
                  >
                    {s.sold ? '売り切れ' : (
                      <>
                        <Coins size={14} />
                        {shopPriceFor(v, s.price)}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
            <div className="font-display mt-2 text-[15px] text-amber-200">{getClass(v.classId).name}のカード</div>
            {myCards.length === 0 && <div className="py-2 text-center text-[13px] text-zinc-500">今は{getClass(v.classId).name}のカードを売っていません</div>}
            <div className="flex flex-wrap justify-center gap-2">
              {myCards.map(({ c, i }) => {
                const h = v;
                const on = cardSel === i;
                return (
                  <div key={i} className={`flex flex-col items-center gap-1 ${c.sold ? 'opacity-40' : ''}`}>
                    <button
                      onClick={() => setCardSel((x) => (x === i ? null : i))}
                      className="btn transition-transform duration-150"
                      style={on ? { transform: 'scale(1.1) translateY(-3px)', zIndex: 2 } : undefined}
                      aria-pressed={on}
                      aria-label={getCard(c.cardId).name}
                      data-pick-card={i}
                    >
                      <CardFace card={getCard(c.cardId)} chance={chanceOf(h, c.cardId)} width={96} height={146} />
                    </button>
                    <span className="flex items-center gap-1 text-[12px]">
                      <HeroFace hero={h} size={18} />
                      {h.name}
                    </span>
                    <button
                      disabled={c.sold}
                      onClick={() => setCardSel(i)}
                      className="btn btn-gold flex h-11 w-[96px] items-center justify-center gap-0.5 rounded-lg text-[13px] font-bold"
                      data-pick-card={i}
                    >
                      {c.sold ? '売り切れ' : (
                        <>
                          <Coins size={14} />
                          {shopPriceFor(v, c.price)}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            {selCard && cardSel !== null && myCards.some((x) => x.i === cardSel) && (
              <CardPickPanel
                card={getCard(selCard.cardId)}
                chance={chanceOf(v, selCard.cardId)}
                who={`${v.name}の成功率`}
                action={
                  <>
                    <Coins size={18} />
                    {shopPriceFor(v, selCard.price)}Gで買う
                  </>
                }
                disabled={!mine || selCard.sold || v.gold < shopPriceFor(v, selCard.price)}
                note={selCard.sold ? '売り切れです' : !mine ? `${v.name}の担当の人が買えます` : v.gold < shopPriceFor(v, selCard.price) ? 'お金が足りません' : undefined}
                onAction={() => {
                  buy('card', cardSel);
                  setCardSel(null);
                }}
                onClose={closeCardSel}
              />
            )}
            <div className="mt-1 text-center text-[12px] text-zinc-500">品揃えは{BALANCE.shopRefreshTurns}ワールドターンごとに入れ替わります</div>
          </div>
        )}
        {tab === 'inn' && (
          <div className="flex flex-col gap-2">
            <div className="panel rounded-xl p-2 text-[14px]">
              宿屋に泊まると、{v.name}のHPとフォーカスが全回復し、悪い状態異常も治ります（{v.name}のお金で払います）。手番は使いません。
            </div>
            {[v].map((h) => (
              <div key={h.id} className="flex items-center gap-2 rounded-lg bg-black/30 p-1.5 text-[13px]">
                <HeroFace hero={h} size={32} />
                <span className="flex-1 font-bold">{h.name}</span>
                <span className="tabular-nums text-zinc-300">
                  HP {h.hp}/{heroMaxHp(h)}・★{h.focus}/{heroFocusMax(h)}
                </span>
              </div>
            ))}
            <button
              disabled={!mine || v.gold < def.innCost}
              onClick={() => dispatchGame({ type: 'TOWN_INN', heroId: v.id, playerId: p })}
              className="btn btn-gold font-display flex h-12 items-center justify-center gap-1 rounded-xl text-[18px]"
            >
              <BedDouble size={20} /> 泊まる（{def.innCost}G）
            </button>
          </div>
        )}
        {tab === 'quests' && (
          <div className="flex flex-col gap-2">
            {(def.quests ?? []).length === 0 && <div className="py-4 text-center text-[13px] text-zinc-500">この町に依頼はありません</div>}
            {[...new Set([...(def.quests ?? []), ...w.quests.filter((q) => (QUESTS.get(q.id).reportTown ?? q.town) === def.id).map((q) => q.id)])].map((id) => {
              const q = QUESTS.get(id);
              const st = w.quests.find((x) => x.id === id);
              const prog = st ? questProgress(st) : undefined;
              const canReport = st ? canReportQuest(game, id) : false;
              return (
                <div key={id} className="panel panel-gold-edge rounded-xl p-2">
                  <div className="font-display text-[17px] text-amber-100">{q.title}</div>
                  <div className="text-[13px] leading-5 text-zinc-200">{q.text}</div>
                  <div className="mt-1 text-[12px] text-sky-200">目標: {objectiveHandler(q.objective).describe(q.objective as never)}</div>
                  <div className="text-[12px] text-amber-200">報酬: {q.rewardText}</div>
                  <div className="mt-1.5">
                    {!st ? (
                      <button disabled={!mine} onClick={() => dispatchGame({ type: 'QUEST_ACCEPT', heroId: v.id, playerId: p, questId: id })} className="btn btn-gold h-11 w-full rounded-lg text-[14px] font-bold">
                        依頼を受ける
                      </button>
                    ) : st.reported ? (
                      <div className="flex items-center justify-center gap-1 text-[14px] font-bold text-emerald-300">
                        <Check size={16} /> 達成済み
                      </div>
                    ) : canReport ? (
                      <button disabled={!mine} onClick={() => dispatchGame({ type: 'QUEST_REPORT', heroId: v.id, playerId: p, questId: id })} className="btn btn-gold h-11 w-full rounded-lg text-[14px] font-bold">
                        報告して報酬を受け取る
                      </button>
                    ) : (
                      <div className="text-center text-[13px] text-zinc-300">
                        進行中 {prog?.now}/{prog?.goal}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'remove' && (
          <div className="flex flex-col gap-2">
            <div className="text-[13px] text-zinc-300">
              山札からいらないカードを1枚取り除きます（{def.removeCost}G・{BALANCE.minDeckSize}枚より少なくはできません）
            </div>
            <div className="text-[12px] text-zinc-400">{v.name}の山札（タップして選ぶ）</div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {v.deck.map((c) => (
                <button
                  key={c.uid}
                  disabled={!mine || v.gold < def.removeCost}
                  onClick={() => setConfirmRemove(c.uid)}
                  className="btn"
                  aria-label={`${cardOf(c).name}を取り除く`}
                >
                  <CardFace card={cardOf(c)} width={78} height={120} />
                </button>
              ))}
            </div>
          </div>
        )}
        {tab === 'sell' && (
          <div className="flex flex-col gap-1">
            {sellable.length === 0 && <div className="py-4 text-center text-[13px] text-zinc-500">売れる装備がありません（装備中のものは売れません）</div>}
            {sellable.map((s) => {
              const it = getItem(s.itemId);
              return (
                <div key={s.uid} className="flex items-center gap-2 rounded-lg bg-black/30 p-1.5">
                  <ItemIcon item={it} size={40} />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-bold" style={{ color: RARITY_STYLE[it.rarity].color }}>
                    {it.name}
                  </span>
                  <button disabled={!mine} onClick={() => dispatchGame({ type: 'TOWN_SELL', heroId: v.id, playerId: p, itemUid: s.uid })} className="btn btn-dark flex h-11 w-[84px] items-center justify-center gap-0.5 rounded-lg text-[13px] font-bold">
                    <Coins size={14} />
                    {sellPrice(s.itemId)}で売る
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="relative shrink-0 px-3 pt-1 pb-3 shadow-[0_-10px_14px_-6px_rgba(0,0,0,.75)]" data-town-exit>
        <FacilityExit game={game} />
      </div>
      <BuyNotice game={game} bought={bought} onClose={closeBought} />
      {confirmRemove && (
        <ConfirmDialog
          title="カードを取り除きますか？"
          text={`「${cardOf(v.deck.find((c) => c.uid === confirmRemove) ?? { cardId: v.deck[0].cardId }).name}」を${v.name}の山札から取り除きます（${def.removeCost}G）。元には戻せません。`}
          ok="取り除く"
          onOk={() => {
            dispatchGame({ type: 'TOWN_REMOVE_CARD', playerId: p, heroId: v.id, cardUid: confirmRemove });
            setConfirmRemove(null);
          }}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </Screen>
  );
}

// ---------- 神殿・祭壇 ----------

export function SanctuaryScreen() {
  const game = useBattle(s => s.game)!;
  const openSheet = useBattle(s => s.openSheet);
  const visit = game.sanctuary!;
  const def = SANCTUARIES.get(visit.sanctuaryId);
  return (
    <Screen>
      <WorldTopBar game={game} />
      <div data-sanctuary={def.kind} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <FacilityRoster game={game} />
        <h1 className="font-display text-[24px] text-amber-100">{def.name}</h1>
        <p className="panel mt-3 rounded-xl p-3 text-[15px] leading-6">{def.text}</p>
        <p className="mt-3 text-[14px] leading-6">{def.kind === 'temple' ? '中位Lv3と条件を満たすと特殊職、中位Lv4と条件を満たすと最上位職へ進めます。' : '中位Lv3と条件を満たすと、この祭壇に対応する特殊職へ進めます。'}</p>
        <button onClick={() => openSheet('jobs')} className="btn btn-gold mt-4 min-h-12 w-full rounded-xl px-3 text-[15px] font-bold">転職先を見る</button>
      </div>
      <div className="shrink-0 px-3 pb-3">
        <FacilityExit game={game} />
      </div>
    </Screen>
  );
}

// ---------- 祠 ----------

export function ShrineScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const s = game.shrine!;
  const def = SHRINES.get(s.shrineId);
  const heroes = sceneHeroes(game).filter(h => facilityMembers(game).includes(h.id));
  const [heroId, setHeroId] = useState(heroes.find(h => isLocalPlayer(h.playerId))?.id ?? s.heroId);
  return (
    <Screen>
      <WorldTopBar game={game} goldHeroId={heroId} />
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <BattleBackground kind="shrine" className="absolute inset-0 h-full w-full opacity-40" />
        <div className="relative px-3 pt-4">
          <div className="flex items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-emerald-300 bg-emerald-950/60">
              <Sparkles size={26} className="text-emerald-200" />
            </span>
            <div className="font-display text-outline text-[24px] text-amber-100">{def.name}</div>
          </div>
          <div className="panel mt-3 rounded-xl p-3 text-[15px] leading-6">{def.text}どれか1つの恵みを受けられる。</div>
          {!s.result && (
            <>
              <div className="mt-2 text-[12px] text-zinc-300">祈るキャラ（永続の加護は1人{BALANCE.maxBlessings}つまで）</div>
              <div className="mt-1 flex gap-1">
                {heroes.map((h) => (
                  <button key={h.id} disabled={!isLocalPlayer(h.playerId) || facilityVisit(game)?.finished?.includes(h.id)} onClick={() => setHeroId(h.id)} className={`btn flex min-w-0 flex-1 flex-col items-center rounded-lg border-2 py-1 ${heroId === h.id ? 'sel-on' : 'border-white/10 bg-black/30'}`}>
                    <HeroFace hero={h} size={30} />
                    <span className="truncate text-[12px] font-bold">{h.name}</span>
                    <span className="text-[12px] text-zinc-400">加護 {h.blessings ?? 0}/{BALANCE.maxBlessings}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {def.options.map((o, i) => (
                  <button key={i} disabled={!isLocalPlayer(game.heroes.find(h => h.id === heroId)!.playerId) || facilityVisit(game)?.finished?.includes(heroId)} onClick={() => dispatchGame({ type: 'SHRINE_CHOOSE', playerId: game.heroes.find(h => h.id === heroId)!.playerId, optionIndex: i, heroId })} className="btn btn-dark min-h-12 rounded-xl px-3 text-left text-[14px] font-bold">
                    {o.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {s.result && <div className="mt-3 text-center text-[16px] font-bold text-emerald-300">{s.result.text}</div>}
        </div>
      </div>
      <div className="shrink-0 px-3 pt-1 pb-3">
        <FacilityExit game={game} />
      </div>
    </Screen>
  );
}

// ---------- エンディング ----------

export function EndingScreen() {
  const game = useBattle((s) => s.game)!;
  const abandon = useBattle((s) => s.abandonGame);
  const story = game.world?.story;
  const st = game.stats;
  return (
    <Screen>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-6">
        <div className="font-display text-outline text-center text-[30px] text-amber-100">{getScenario(game.scenarioId).name}</div>
        <div className="font-display text-center text-[16px] text-amber-300">クリア！</div>
        <div className="mt-3 flex flex-col gap-2">
          {(story?.lines ?? []).map((l, i) => (
            <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.7 }} className="text-[15px] leading-7 text-zinc-100">
              {l}
            </motion.p>
          ))}
        </div>
        <div className="panel mt-4 grid grid-cols-2 gap-1 rounded-xl p-3 text-[13px]">
          <span>かかった日数</span>
          <b className="text-right">{Math.ceil((game.world?.worldTurn ?? 1) / (BALANCE.turnsPerTimeOfDay * 4))}日</b>
          <span>最後の{corruptionName(game.scenarioId)}</span>
          <b className="text-right">{game.world?.corruption ?? 0}%</b>
          <span>残った命の灯火</span>
          <b className="text-right">{game.lives}</b>
          <span>戦闘の勝利</span>
          <b className="text-right">{st.battlesWon}回</b>
          <span>開けた宝箱</span>
          <b className="text-right">{st.chestsOpened}個</b>
          <span>最高の宝</span>
          <b className="text-right">{st.bestRarity ? RARITY_STYLE[st.bestRarity].name : '-'}</b>
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {game.heroes.map((h) => (
            <div key={h.id} className="flex flex-col items-center text-[12px]">
              <HeroFace hero={h} size={44} dim={!!h.retired} />
              <span className="font-bold">{h.name}</span>
              <span className="text-amber-300">Lv{h.level}</span>
            </div>
          ))}
        </div>
        <PetAwards heroes={game.heroes} />
        <EndPetRecord game={game} />
      </div>
      <div className="shrink-0 px-3 pt-1 pb-3">
        <button onClick={abandon} className="btn btn-gold font-display h-12 w-full rounded-xl text-[18px]">
          タイトルへ
        </button>
      </div>
    </Screen>
  );
}

// ---------- 依頼の一覧（メニューから） ----------

export function QuestList() {
  const game = useBattle((s) => s.game)!;
  const w = game.world;
  if (!w) return <div className="p-3 text-[13px] text-zinc-400">依頼はありません</div>;
  if (!w.quests.length) return <div className="p-3 text-[13px] text-zinc-400">受けている依頼はありません。町の掲示板で受けられます。</div>;
  return (
    <div className="flex flex-col gap-1.5">
      {w.quests.map((q) => {
        const def = QUESTS.get(q.id);
        const prog = questProgress(q);
        return (
          <div key={q.id} className="rounded-lg bg-black/30 p-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-[15px] text-amber-100">{def.title}</span>
              <span className={`text-[12px] font-bold ${q.reported ? 'text-emerald-300' : q.done ? 'text-amber-300' : 'text-zinc-300'}`}>
                {q.reported ? '達成済み' : q.done ? '報告できる' : `${prog.now}/${prog.goal}`}
              </span>
            </div>
            <div className="text-[12px] text-sky-200">{objectiveHandler(def.objective).describe(def.objective as never)}</div>
            <div className="text-[12px] text-zinc-400">
              報告先: {TOWNS.get(def.reportTown ?? q.town).name}・報酬: {def.rewardText}
            </div>
          </div>
        );
      })}
      {Object.keys(getScenario(game.scenarioId).story?.keys ?? {}).length > 0 && (
        <div className="mt-1 rounded-lg bg-black/30 p-2 text-[12px]">
          <div className="font-display text-[15px] text-amber-100">封印の鍵</div>
          {Object.entries(getScenario(game.scenarioId).story!.keys!).map(([k, name]) => (
            <div key={k} className={w.keys.includes(k) ? 'text-amber-200' : 'text-zinc-500'}>
              {w.keys.includes(k) ? '✓' : '・'} {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


