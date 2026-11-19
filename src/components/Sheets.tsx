import { SettingsControls } from './ui/SettingsControls';
import { getDifficulty } from '../data/rules';
import { QuestList } from './world/Places';
// ===== メニュー・戦闘ログ・山札/捨札・パーティ（装備）・道具袋・冒険をやめる確認 =====
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowUpCircle, Backpack, ChevronRight, DoorOpen, ScrollText, Users, X } from 'lucide-react';
import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { CharacterArt } from '../art';
import { cardOf } from '../data/cards';
import { getClass } from '../data/classes';
import { getItem, POUCH_LIMIT } from '../data/items';
import { EQUIP_SLOTS, STAT_IDS, affinityFromStats, jobOptions, battleDeck, canBreak, canEquip, enemyName, itemTargetsEnemy, describeAbility, expToNext, findAlly, heroFocusMax, heroMaxHp, heroStats, pouchLimitOf, weaponRarity } from '../engine';
import { LOCAL_PLAYER, isLocalPlayer, isOnlinePlay } from '../store/battleConfig';
import { PLAYER_COLOR } from '../data/theme';
import { useBattle } from '../store/battleStore';
import { useOnline } from '../store/onlineStore';
import { OnlinePanel } from './screens/OnlineScreens';
import type { CardInstance, EquipSlot, GameState, Hero } from '../types';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { CandidateLine, ItemInfoArea } from './ItemDetail';
import { usePress } from '../hooks/usePress';
import { canChangeNow, JobSheetBody } from './JobSheet';
import { PetPanel } from './ui/PetToken';
import { BookOpen, HelpCircle, WifiOff } from 'lucide-react';
import { useHelp } from '../store/help';
import { useLore } from '../store/lore';

import { giveBlockReason, giveCommand, goldChoices, itemRows, liveRow, placeMates, useBlockReason, type OpenRow } from './sheetItems';
import { LAYER } from './ui/layers';
import { screenInfo } from '../hooks/useAppHeight';
import { contentVersion } from '../data/contentVersion';
import { GAME_VERSION } from '../engine';

/** この端末のキャラのうち、今の場面にいるキャラ */
function sceneLocalHeroes(game: GameState): Hero[] {
  return game.heroes.filter(
    (h) => !h.retired && h.hp > 0 && isLocalPlayer(h.playerId) && (game.party ? game.party.includes(h.id) : !game.expeditions?.some((x) => x.heroes.includes(h.id))),
  );
}
import { Bar, Crest, HeroFace, ItemIcon, itemSummary, RARITY_STYLE, STAT_LABEL } from './ui/game';
import { CATEGORY_STYLE, EffectChip } from './ui/icons';
import { HiddenNoticeBadge } from './ui/HiddenNotices';

/**
 * 下から出るシートの土台（実機の不具合② 2026-11-14）。
 * - 画面のいちばん手前の独立した層（fixed。重なりの順番は ui/layers.ts）。待ちの帯・通信の知らせの帯がシートの見出しと×にかぶらない
 * - 高さは見えている高さ（--app-h。LINE 内ブラウザで 100dvh より短い時も下が切れない）
 * - 見出しと×は上に固定、その下は1本の縦スクロール（ボタンを下に固定しない）
 * - 縦 640px より低い画面では、背の高いシートは画面いっぱい（index.css の .sheet-tall）
 */
function BottomSheet({ name, title, onClose, children, tall }: { name: string; title: string; onClose: () => void; children: ReactNode; tall?: boolean }) {
  useOnline((s) => s.tick);
  const room = useOnline((s) => s.room);
  const offline = !!room && !room.connected;
  return (
    <motion.div
      className="fixed inset-x-0 top-0 flex justify-center bg-black/65"
      style={{ zIndex: LAYER.sheet, height: 'var(--app-h, 100dvh)' }}
      data-sheet={name}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="flex h-full w-full max-w-[480px] flex-col justify-end">
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
          transition={{ duration: 0.12 }}
          onClick={(e) => e.stopPropagation()}
          className={`panel panel-ornate safe-pad flex min-h-0 flex-col rounded-t-2xl border-b-0 ${tall ? 'sheet-tall' : 'sheet-short'}`}
          data-sheet-panel
        >
          <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-1" data-sheet-header>
            <div className="font-display min-w-0 flex-1 truncate text-[18px] text-amber-100">{title}</div>
            {/* 【提案】通信の知らせはシートの後ろに回るので、出ている時だけ小さな印。押すとシートを閉じて知らせが見える */}
            <HiddenNoticeBadge onOpen={onClose} />
            <button onClick={onClose} aria-label="閉じる" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" data-sheet-close>
              <X size={22} />
            </button>
          </div>
          {/* 通信の知らせの帯はシートの後ろに回るので、自分の通信が切れている事だけはここにも出す（押せない飾り） */}
          {offline && (
            <div role="status" className="pointer-events-none mx-3 mt-1 flex shrink-0 items-center gap-1.5 rounded-full bg-red-950/90 px-3 py-1 text-[12px] text-red-100" data-sheet-offline>
              <WifiOff size={14} /> 通信が切れました。つながり直しています…
            </div>
          )}
          <div className="mx-3 my-1 h-px shrink-0 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3" data-sheet-body>
            {children}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/** メニューの「画面の情報」（実機の不具合②: LINE 内ブラウザで切れた時に、この写真で原因を決める） */
function ScreenInfo() {
  const [info, setInfo] = useState<string[] | null>(null);
  return (
    <div className="rounded-lg bg-black/30 px-3 py-2 text-[12px] text-zinc-400" data-screen-info>
      <button onClick={() => setInfo(info ? null : screenInfo().lines)} className="btn btn-dark h-11 w-full rounded-lg text-[13px] font-bold">
        画面の情報を{info ? '閉じる' : '見る'}
      </button>
      {info && (
        <div className="mt-1 break-all leading-5 select-text" data-screen-info-lines>
          {info.map((l) => (
            <div key={l}>{l}</div>
          ))}
          <div>版 {GAME_VERSION}・データ {contentVersion()}</div>
          <div className="mt-1 text-zinc-500">画面が切れる時は、この表示の写真を送ってください。</div>
        </div>
      )}
    </div>
  );
}

function MenuSheet() {
  const game = useBattle((s) => s.game);
  const openSheet = useBattle((s) => s.openSheet);
  const setConfirmAbandon = useBattle((s) => s.setConfirmAbandon);
  const online = useOnline((s) => !!s.room);
  const row = 'btn btn-dark flex h-12 w-full items-center gap-2 rounded-lg px-3 text-[14px] font-bold';
  return (
    <BottomSheet name="menu" title="メニュー" onClose={() => openSheet(null)}>
      <div className="flex flex-col gap-2">
        {/* 遊び方・用語集（Step A ③）: メニューの上に重ねて開く。閉じるとこのメニューに戻る */}
        <button onClick={() => useHelp.getState().openHelp()} className={row} data-menu-help>
          <HelpCircle size={18} className="text-amber-300" /> 遊び方・用語集
          <ChevronRight size={18} className="ml-auto" />
        </button>
        {/* 伝承の書（Step C ②）: メニューの上に重ねて開く。読むだけ。閉じるとこのメニューに戻る */}
        <button onClick={() => useLore.getState().openLore()} className={row} data-menu-lore>
          <BookOpen size={18} className="text-amber-300" /> 伝承の書（図鑑）
          <ChevronRight size={18} className="ml-auto" />
        </button>
        <SettingsControls />
        {online && <OnlinePanel />}
        {game?.world && game.mode === 'world' && (
          <>
            <button onClick={() => openSheet('party')} className={row}>
              <Users size={18} className="text-amber-300" /> パーティ・装備
              <ChevronRight size={18} className="ml-auto" />
            </button>
            <button onClick={() => openSheet('pouch')} className={row}>
              <Backpack size={18} className="text-amber-300" /> 道具の袋
              <ChevronRight size={18} className="ml-auto" />
            </button>
            <button onClick={() => openSheet('quests')} className={row}>
              <ScrollText size={18} className="text-amber-300" /> 依頼と封印の鍵
              <ChevronRight size={18} className="ml-auto" />
            </button>
            <button onClick={() => openSheet('jobs')} className={row}>
              <ArrowUpCircle size={18} className="text-amber-300" /> 転職
              <ChevronRight size={18} className="ml-auto" />
            </button>
          </>
        )}
        {game?.mode === 'battle' && (
          <button onClick={() => openSheet('log')} className={row}>
            <ScrollText size={18} className="text-amber-300" /> 戦闘ログ
            <ChevronRight size={18} className="ml-auto" />
          </button>
        )}
        {game && (
          <div className="rounded-lg bg-black/30 px-3 py-2 text-[13px] text-zinc-400">
            シード <span className="font-mono text-amber-200 select-text">{game.seed}</span>・難易度 {getDifficulty(game.difficulty).name}
          </div>
        )}
        <button onClick={() => setConfirmAbandon(true)} className="btn flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-red-400/50 bg-red-950/70 text-[14px] font-bold text-red-100">
          <DoorOpen size={18} /> {online ? '部屋を出てタイトルへ' : '冒険をやめてタイトルへ'}
        </button>
        <ScreenInfo />
        <div className="pt-1 text-center text-[12px] text-zinc-500">{online ? '冒険は部屋に保存されます。同じ合言葉でまた入れます。' : '冒険は自動で保存されます。'}状態アイコンをタップ、カードを長押しすると詳細を確認できます。</div>
      </div>
    </BottomSheet>
  );
}

function LogSheet() {
  const log = useBattle((s) => s.battle.log);
  const openSheet = useBattle((s) => s.openSheet);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView(), []);
  return (
    <BottomSheet name="log" title="戦闘ログ" onClose={() => openSheet('menu')}>
      <div className="flex flex-col gap-1 text-[12px] leading-5 select-text">
        {log.map((l) => (
          <div key={l.id} className={l.text.startsWith('---') ? 'font-display pt-1 text-amber-300' : 'text-zinc-200'}>
            {!l.text.startsWith('---') && <span className="mr-1 text-zinc-500">T{l.turn}</span>}
            {l.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </BottomSheet>
  );
}

/** 山札の中身をカードごとにまとめた行 */
function DeckRows({ cards }: { cards: CardInstance[] }) {
  const counts = new Map<string, { n: number; c: CardInstance }>();
  for (const c of cards) {
    const k = `${c.cardId}${c.upgraded ? '+' : ''}${c.fromWeapon ? 'w' : ''}`;
    counts.set(k, { n: (counts.get(k)?.n ?? 0) + 1, c });
  }
  const rows = [...counts.values()].sort((a, b) => cardOf(a.c).name.localeCompare(cardOf(b.c).name, 'ja'));
  if (!rows.length) return <div className="py-4 text-center text-[13px] text-zinc-500">カードがありません</div>;
  return (
    <div className="flex flex-col gap-1">
      {rows.map(({ n, c }) => {
        const card = cardOf(c);
        const cat = CATEGORY_STYLE[card.category];
        const top = card.tiers[card.tiers.length - 1];
        return (
          <div key={`${c.cardId}${c.upgraded}${c.fromWeapon}`} className="flex items-center gap-2 rounded-lg border-l-4 bg-black/30 px-2 py-1.5 text-[13px]" style={{ borderColor: cat.frame }}>
            <span className="w-7 shrink-0 font-bold text-amber-200">×{n}</span>
            <span className="font-display w-[104px] shrink-0 truncate">
              {card.name}
              {c.fromWeapon && <span className="ml-0.5 text-[12px] text-sky-300">武</span>}
            </span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-1 text-[12px] text-zinc-400">
              {card.cost}マナ・{card.slots}枠・完全:
              {top.effects.map((e, j) => (
                <EffectChip key={j} e={e} />
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PileSheet({ kind }: { kind: 'draw' | 'discard' }) {
  const battle = useBattle((s) => s.battle);
  const activeId = useBattle((s) => s.activeId);
  const openSheet = useBattle((s) => s.openSheet);
  const ally = findAlly(battle, activeId);
  const pile = (kind === 'draw' ? ally?.drawPile : ally?.discard) ?? [];
  return (
    <BottomSheet name={kind} title={`${ally?.name ?? ''}の${kind === 'draw' ? '山札（順不同）' : '捨札'} ${pile.length}枚`} onClose={() => openSheet(null)}>
      <DeckRows cards={pile} />
    </BottomSheet>
  );
}

const SLOT_NAME: Record<EquipSlot, string> = { weapon: '武器', armor: '防具', accessory: '装飾品' };

/** 遊ぶ人が2人以上か（1人で全員を動かす時は、持ち主を出さない） */
export function showOwners(game: Pick<GameState, 'heroes'>) {
  return isOnlinePlay() || new Set(game.heroes.map((h) => h.playerId)).size > 1;
}

/** どのプレイヤーのキャラか（P1〜P4。オンラインで自分のキャラは「自分」） */
export function PlayerTag({ hero }: { hero: Pick<Hero, 'playerId'> }) {
  const self = isOnlinePlay() && isLocalPlayer(hero.playerId);
  return (
    <span className="inline-block rounded px-1 text-[12px] leading-[14px] font-bold text-black" style={{ background: PLAYER_COLOR[hero.playerId] }} data-player-tag={hero.playerId}>
      {self ? '自分' : hero.playerId}
    </span>
  );
}

function PartySheet() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const openSheet = useBattle((s) => s.openSheet);
  const sheetEpoch = useBattle((s) => s.sheetEpoch);
  const activeId = useBattle((s) => s.activeId);
  const [idx, setIdx] = useState(() => {
    // 顔を押して開いた時は、そのキャラを見せる（ほかの人のキャラも見るだけならできる）
    const asked = game.heroes.findIndex((h) => h.id === useBattle.getState().sheetHeroId);
    if (asked >= 0) return asked;
    const preferred = game.mode === 'world' ? game.world?.turn : useBattle.getState().activeId;
    const i = game.heroes.findIndex(h => isLocalPlayer(h.playerId) && (h.id === preferred));
    return i >= 0 ? i : Math.max(0, game.heroes.findIndex(h => isLocalPlayer(h.playerId)));
  });
  const [slot, setSlot] = useState<EquipSlot | null>(null);
  const [showDeck, setShowDeck] = useState(false);
  // 持ち物の行（実機の不具合⑥）: 開いている行・ゴールドの量・確認の窓の相手
  const [row, setRow] = useState<OpenRow | null>(null);
  const [goldAmount, setGoldAmount] = useState<number | null>(null);
  const [giveTo, setGiveTo] = useState<{ to: string; itemUid?: string; gold?: number } | null>(null);
  // 点検 F6: つながり直した（状態を取り直した）時は、シートは残し、中の選択だけ消す
  useEffect(() => {
    setSlot(null);
    setRow(null);
    setGoldAmount(null);
    setGiveTo(null);
  }, [sheetEpoch]);
  const hero = game.heroes[Math.min(idx, game.heroes.length - 1)];
  const cls = getClass(hero.classId);
  const stats = heroStats(hero);
  const aff = affinityFromStats(stats);
  const inBattle = game.mode === 'battle';
  const mine = isLocalPlayer(hero.playerId);
  const candidates = slot ? hero.stash.filter((s) => getItem(s.itemId).slot === slot) : [];
  // 遊ぶ人が2人以上の時だけ、どのプレイヤーのキャラかを出す
  const owners = showOwners(game);
  // 開いている行（品物がもう無い時は閉じた扱い。古い物を指したまま描かない）
  const open = liveRow(hero, row);
  const rows = itemRows(hero);
  const toggle = (next: OpenRow) => {
    setGiveTo(null);
    setRow((cur) => (cur && cur.kind === next.kind && cur.mode === next.mode && (cur.kind === 'gold' || (next.kind !== 'gold' && cur.uid === next.uid)) ? null : next));
  };
  // 確認の窓に出す物（品物・相手がもう無い時は窓を出さない）
  const giveItem = giveTo?.itemUid ? [...hero.stash, ...hero.pouch].find((x) => x.uid === giveTo.itemUid) : undefined;
  const giveTarget = giveTo ? game.heroes.find((h) => h.id === giveTo.to) : undefined;
  const giveWhat = giveTo?.gold ? `${giveTo.gold}G` : giveItem ? getItem(giveItem.itemId).name : null;
  const giveValid = !!giveTo && !!giveTarget && !!giveWhat && (giveTo.gold ? giveTo.gold <= hero.gold : true);

  return (
    <BottomSheet name="party" title="パーティ・装備" onClose={() => openSheet(null)} tall>
      <div className="flex gap-1">
        {game.heroes.map((h, i) => (
          <button
            key={h.id}
            onClick={() => {
              setIdx(i);
              setSlot(null);
              setRow(null);
              setGiveTo(null);
              setGoldAmount(null);
            }}
            className={`btn flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border-b-2 py-1 ${i === idx ? 'sel-on' : 'border-transparent bg-black/30'}`}
            // 自動の確認用の見えない印（B18）: キャラの切り替え（値 = キャラの id）
            data-sheet-hero={h.id}
          >
            <HeroFace hero={h} size={30} dim={h.hp <= 0} />
            <span className="flex min-w-0 flex-col items-start leading-[14px]">
              <span className="max-w-full truncate text-[12px] font-bold">{h.name}</span>
              {owners && <PlayerTag hero={h} />}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <CharacterArt classId={hero.classId} gender={hero.gender} weapon={weaponRarity(hero)} className="sheet-art h-[132px] w-[100px] shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-display text-[20px] leading-6">
            {hero.name} <span className="text-[13px]" style={{ color: cls.color }}>{cls.name}</span>
          </div>
          {owners && (
            <div className="text-[12px] text-zinc-300" data-sheet-owner>
              <PlayerTag hero={hero} /> {mine ? 'のキャラ' : 'のキャラ（見るだけ）'}
            </div>
          )}
          <div className="text-[13px] text-amber-300">
            Lv{hero.level} <span className="text-zinc-400">EXP {hero.exp}/{expToNext(hero.level, hero.classId)}</span>
          </div>
          <Bar value={hero.exp} max={expToNext(hero.level, hero.classId)} color="linear-gradient(90deg,#8a6aff,#c8b0ff)" height={5} />
          <div className="mt-1 text-[13px] tabular-nums">
            HP {hero.hp}/{heroMaxHp(hero)}・フォーカス {hero.focus}/{heroFocusMax(hero)}
          </div>
          <div className="text-[13px] font-bold text-amber-200 tabular-nums">所持金 {hero.gold}G</div>
          <div className="mt-1 grid grid-cols-4 gap-x-1 gap-y-0.5 text-[12px]">
            {STAT_IDS.map((k) => (
              <span key={k} className="tabular-nums">
                <span className="text-zinc-400">{STAT_LABEL[k]}</span> <b>{stats[k]}</b>
              </span>
            ))}
          </div>
          <div className="mt-0.5 text-[12px] text-zinc-400">
            物理{aff.physical >= 0 ? '+' : ''}
            {aff.physical}% 魔法{aff.magic >= 0 ? '+' : ''}
            {aff.magic}% スキル{aff.skill >= 0 ? '+' : ''}
            {aff.skill}%
          </div>
        </div>
      </div>
      <div className="mt-1 rounded-lg bg-black/30 p-1.5 text-[12px] leading-4">
        <span className="font-display text-amber-200">《{cls.battleAbility.name}》</span>
        {describeAbility(cls.battleAbility)}
        <br />
        <span className="font-display text-sky-200">《{cls.exploreAbility.name}》</span>
        {cls.exploreAbility.description}
        {hero.carried && (
          <>
            <br />
            <span className="font-display text-violet-200">《{getClass(hero.carried).battleAbility.name}》</span>
            {describeAbility(getClass(hero.carried).battleAbility)}（{getClass(hero.carried).name}から持ち越し）
          </>
        )}
      </div>
      {hero.pet && <PetPanel hero={hero} canPat={!inBattle && mine} onPat={() => dispatchGame({ type: 'PET_PAT', playerId: hero.playerId, heroId: hero.id })} />}
      {!inBattle && mine && jobOptions(hero).length > 0 && (
        <button onClick={() => openSheet('jobs')} className={`btn mt-1 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg text-[14px] font-bold ${canChangeNow(game, hero) ? 'btn-gold' : 'btn-dark'}`}>
          <ArrowUpCircle size={17} /> 転職先を見る{canChangeNow(game, hero) ? '（転職できます）' : ''}
        </button>
      )}

      <div className="font-display mt-2 text-[15px] text-amber-200">装備{inBattle && <span className="ml-1 text-[12px] text-zinc-400">（戦闘中は変えられません）</span>}</div>
      <div className="mt-1 flex flex-col gap-1">
        {EQUIP_SLOTS.map((s) => {
          const inst = hero.equipment[s];
          const it = inst ? getItem(inst.itemId) : null;
          const inner = (
            <>
              <span className="w-12 shrink-0 text-[12px] text-zinc-400">{SLOT_NAME[s]}</span>
              {it ? <ItemIcon item={it} size={40} /> : <span className="h-10 w-10 shrink-0 rounded-lg border-2 border-dashed border-zinc-600" />}
              <span className="min-w-0 flex-1 leading-4">
                <span className="block text-[14px] font-bold" style={{ color: it ? RARITY_STYLE[it.rarity].color : '#888' }}>
                  {it?.name ?? 'なし'}
                </span>
                {it && <span className="block truncate text-[12px] text-zinc-400">{itemSummary(it)}</span>}
              </span>
            </>
          );
          return (
            // 文字の所を押すと詳細、右の「付け替え」で持ち物の候補を出す
            <div key={s} className={`flex min-h-14 items-center gap-1 rounded-lg border pr-1 ${slot === s ? 'border-amber-300 bg-amber-500/10' : 'border-white/10 bg-black/30'}`} data-equip-slot={s}>
              {it && inst ? (
                <ItemInfoArea itemId={it.id} heroId={hero.id} itemUid={inst.uid} className="flex min-h-14 flex-1 items-center gap-2 px-2">
                  {inner}
                </ItemInfoArea>
              ) : (
                <span className="flex min-h-14 min-w-0 flex-1 items-center gap-2 px-2">{inner}</span>
              )}
              {!inBattle && mine && (
                <button onClick={() => setSlot(slot === s ? null : s)} aria-label={`${SLOT_NAME[s]}を付け替える`} aria-expanded={slot === s} className="btn btn-dark flex h-11 shrink-0 items-center rounded-lg pr-0.5 pl-2 text-[12px] font-bold">
                  付け替え
                  <ChevronRight size={16} className="text-zinc-300" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {slot && (
        <div className="mt-2 rounded-xl border border-amber-400/40 bg-black/40 p-2">
          <div className="text-[13px] text-zinc-300">持ち物の{SLOT_NAME[slot]}（{candidates.length}）</div>
          <div className="mt-1 flex flex-col gap-1">
            {candidates.length === 0 && <div className="py-2 text-center text-[13px] text-zinc-500">持っていません</div>}
            {candidates.map((inst) => {
              const it = getItem(inst.itemId);
              const why = canEquip(hero, it);
              return (
                <div key={inst.uid} className="flex items-center gap-2 rounded-lg bg-black/30 p-1.5">
                  <ItemInfoArea itemId={it.id} heroId={hero.id} className="flex flex-1 items-center gap-2">
                    <ItemIcon item={it} size={40} />
                    <span className="min-w-0 flex-1 leading-4">
                      <span className="block text-[14px] font-bold" style={{ color: RARITY_STYLE[it.rarity].color }}>
                        {it.name}
                      </span>
                      <CandidateLine hero={hero} slot={slot} item={it} />
                      {why && <span className="block text-[12px] text-red-300">{why}</span>}
                    </span>
                  </ItemInfoArea>
                  <button
                    disabled={!!why}
                    onClick={() => {
                      dispatchGame({ type: 'EQUIP', playerId: LOCAL_PLAYER, heroId: hero.id, itemUid: inst.uid });
                      setSlot(null);
                    }}
                    className="btn btn-gold h-11 shrink-0 rounded-lg px-3 text-[14px] font-bold"
                    // 自動の確認用の見えない印（B18）: 持ち物の候補を付けるボタン（値 = 品の id）
                    data-row-equip={it.id}
                  >
                    装備
                  </button>
                </div>
              );
            })}
            {hero.equipment[slot] && (
              <button
                onClick={() => {
                  dispatchGame({ type: 'UNEQUIP', playerId: LOCAL_PLAYER, heroId: hero.id, slot });
                  setSlot(null);
                }}
                className="btn btn-dark h-11 rounded-lg text-[14px] font-bold"
                // 自動の確認用の見えない印（B18）: 欄の物を外すボタン（値 = 欄の名前）
                data-slot-unequip={slot}
              >
                外す
              </button>
            )}
          </div>
        </div>
      )}

      <button onClick={() => setShowDeck((v) => !v)} className="btn btn-dark mt-2 flex h-11 w-full items-center justify-center gap-1 rounded-lg text-[14px] font-bold">
        山札（{battleDeck(hero).length}枚）を{showDeck ? '閉じる' : '見る'}
      </button>
      {showDeck && (
        <div className="mt-1">
          <DeckRows cards={battleDeck(hero)} />
          <div className="mt-1 text-[12px] text-zinc-500">「武」は武器を装備している間だけ加わるカード</div>
        </div>
      )}
      {/* 持ち物（実機の不具合⑥）: 行を押すと、その行のすぐ下に「使う」「渡す」「やめる」が開く */}
      <div className="font-display mt-2 text-[15px] text-amber-200">{hero.name}の持ち物</div>
      {mine && (rows.pouch.length > 0 || rows.stash.length > 0) && <div className="text-[12px] text-zinc-400">品物を押すと「使う」「渡す」が開きます（長押しで詳しい説明）</div>}
      <div className="mt-1 flex flex-col gap-1" data-party-items>
        {rows.pouch.length === 0 && rows.stash.length === 0 && <div className="py-1 text-[13px] text-zinc-500">何も持っていません</div>}
        {rows.pouch.length > 0 && (
          <div className="text-[12px] text-zinc-400">
            道具（{hero.pouch.length}/{pouchLimitOf(hero)}）
          </div>
        )}
        {rows.pouch.map(({ itemId, uids }) => (
          <ItemRow
            key={itemId}
            hero={hero}
            kind="pouch"
            itemId={itemId}
            uids={uids}
            mine={mine}
            open={open}
            onToggle={toggle}
            panel={
              open && open.kind === 'pouch' && uids.includes(open.uid) ? (
                <RowPanel mode={open.mode} onCancel={() => setRow(null)}>
                  {{
                    use: <UseSection game={game} hero={hero} itemUid={open.uid} activeId={activeId} onDone={() => setRow(null)} />,
                    give: <GiveSection game={game} hero={hero} pouch onPick={(to) => setGiveTo({ to, itemUid: open.uid })} />,
                  }}
                </RowPanel>
              ) : null
            }
          />
        ))}
        {rows.stash.length > 0 && <div className="mt-1 text-[12px] text-zinc-400">装備の予備（装備中の物は外してから渡せます）</div>}
        {rows.stash.map((inst) => (
          <ItemRow
            key={inst.uid}
            hero={hero}
            kind="stash"
            itemId={inst.itemId}
            uids={[inst.uid]}
            mine={mine}
            open={open}
            onToggle={toggle}
            panel={
              open && open.kind === 'stash' && open.uid === inst.uid ? (
                <RowPanel mode="give" onCancel={() => setRow(null)}>
                  {{ give: <GiveSection game={game} hero={hero} onPick={(to) => setGiveTo({ to, itemUid: inst.uid })} /> }}
                </RowPanel>
              ) : null
            }
          />
        ))}
        {mine && (
          <div className={`mt-1 rounded-lg border ${open?.kind === 'gold' ? 'border-amber-300 bg-amber-500/15' : 'border-white/10 bg-black/30'}`} data-gold-row data-open={open?.kind === 'gold' || undefined}>
            <div className="flex items-center gap-2 p-1 pl-2">
              <span className="min-w-0 flex-1 text-[13px] font-bold text-amber-200 tabular-nums">所持金 {hero.gold}G</span>
              <button
                onClick={() => toggle({ kind: 'gold', mode: 'give' })}
                aria-expanded={open?.kind === 'gold'}
                className={`btn h-11 shrink-0 rounded-lg px-3 text-[13px] font-bold ${open?.kind === 'gold' ? 'btn-gold' : 'btn-dark'}`}
                data-row-give
              >
                ゴールドを渡す
              </button>
            </div>
            {open?.kind === 'gold' && (
              <RowPanel mode="give" onCancel={() => setRow(null)}>
                {{
                  give:
                    hero.gold <= 0 ? (
                      <div className="text-[13px] text-zinc-300" data-give-reason>ゴールドを持っていません</div>
                    ) : (
                      <>
                        <div className="mb-1 flex gap-1" data-gold-amounts>
                          {goldChoices(hero.gold).map((v) => {
                            const on = (goldAmount ?? goldChoices(hero.gold)[0]) === v;
                            return (
                              <button key={v} onClick={() => setGoldAmount(v)} aria-pressed={on} className={`btn h-11 flex-1 rounded-lg text-[13px] font-bold ${on ? 'btn-gold' : 'btn-dark'}`}>
                                {v === hero.gold && v !== 10 && v !== 50 ? `全部（${v}G）` : `${v}G`}
                              </button>
                            );
                          })}
                        </div>
                        <GiveSection game={game} hero={hero} onPick={(to) => setGiveTo({ to, gold: Math.min(goldAmount ?? goldChoices(hero.gold)[0], hero.gold) })} />
                      </>
                    ),
                }}
              </RowPanel>
            )}
          </div>
        )}
      </div>
      {giveTo && giveValid && (
        <ConfirmDialog
          title="渡しますか？"
          text={`${hero.name}から${giveTarget!.name}に、${giveWhat}を渡します。`}
          ok="渡す"
          danger={false}
          onOk={() => {
            const error = dispatchGame(giveCommand(hero, giveTo.to, giveTo.gold ? { gold: giveTo.gold } : { itemUid: giveTo.itemUid }));
            if (error) {
              setGiveTo(null);
              return;
            }
            // 実機の不具合⑥: だれに何を渡したかを出す（受け取った側の画面にも「〜から受け取りました」が出る）
            useBattle.getState().showToast(`${giveWhat}を${giveTarget!.name}に渡しました`);
            setRow(null);
            setGiveTo(null);
            setGoldAmount(null);
          }}
          onCancel={() => setGiveTo(null)}
        />
      )}
    </BottomSheet>
  );
}

/** 押すと開く・長押しで詳しい説明（道具袋の行と同じ押し方） */
function PressArea({ itemId, heroId, onTap, children }: { itemId: string; heroId: string; onTap: () => void; children: ReactNode }) {
  const press = usePress(onTap, { type: 'item', itemId, heroId });
  return (
    <button type="button" {...press} className="btn flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left" data-row-tap={itemId}>
      {children}
    </button>
  );
}

/** パーティ・装備のシートの持ち物の1行（実機の不具合⑥）。開くと、この行のすぐ下に操作の枠が出る */
function ItemRow({ hero, kind, itemId, uids, mine, open, onToggle, panel }: { hero: Hero; kind: 'pouch' | 'stash'; itemId: string; uids: string[]; mine: boolean; open: OpenRow | null; onToggle: (r: OpenRow) => void; panel: ReactNode }) {
  const it = getItem(itemId);
  const isOpen = !!open && open.kind === kind && uids.includes(open.uid);
  const mode = isOpen ? open.mode : null;
  const label = (
    <>
      <ItemIcon item={it} size={34} />
      <span className="min-w-0 flex-1 leading-4">
        <span className="block truncate text-[13px] font-bold" style={{ color: RARITY_STYLE[it.rarity].color }}>
          {it.name}
          {uids.length > 1 && <span className="ml-1 text-amber-200">×{uids.length}</span>}
        </span>
        {kind === 'pouch' && <span className="block truncate text-[12px] text-zinc-400">{itemSummary(it)}</span>}
      </span>
    </>
  );
  return (
    <div className={`rounded-lg border ${isOpen ? 'border-amber-300 bg-amber-500/15' : 'border-white/10 bg-black/30'}`} data-item-row={itemId} data-item-kind={kind} data-open={isOpen || undefined}>
      <div className="flex items-center gap-1 p-1">
        {mine ? (
          <PressArea itemId={itemId} heroId={hero.id} onTap={() => onToggle({ kind, uid: uids[0], mode: kind === 'pouch' ? 'use' : 'give' })}>
            {label}
          </PressArea>
        ) : (
          <ItemInfoArea itemId={itemId} heroId={hero.id} className="flex min-h-11 flex-1 items-center gap-2">
            {label}
          </ItemInfoArea>
        )}
        {mine && kind === 'pouch' && (
          <button onClick={() => onToggle({ kind, uid: uids[0], mode: 'use' })} aria-expanded={mode === 'use'} className={`btn h-11 shrink-0 rounded-lg px-3 text-[13px] font-bold ${mode === 'use' ? 'btn-gold' : 'btn-dark'}`} data-row-use>
            使う
          </button>
        )}
        {mine && (
          <button onClick={() => onToggle({ kind, uid: uids[0], mode: 'give' })} aria-expanded={mode === 'give'} className={`btn h-11 shrink-0 rounded-lg px-3 text-[13px] font-bold ${mode === 'give' ? 'btn-gold' : 'btn-dark'}`} data-row-give>
            渡す
          </button>
        )}
      </div>
      {panel}
    </div>
  );
}

/** 行のすぐ下に開く操作の枠。開いた時に画面に入るように自動で送る。押したボタン（使う／渡す）の段を先に出す */
function RowPanel({ mode, onCancel, children }: { mode: 'use' | 'give'; onCancel: () => void; children: { use?: ReactNode; give?: ReactNode } }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [mode]);
  const parts: ['use' | 'give', ReactNode][] = (mode === 'use' ? (['use', 'give'] as const) : (['give', 'use'] as const)).filter((k) => children[k] !== undefined).map((k) => [k, children[k]]);
  return (
    <div ref={ref} className="flex flex-col gap-1.5 border-t border-amber-300/40 px-2 pt-1.5 pb-2" data-row-panel={mode}>
      {parts.map(([k, node]) => (
        <div key={k} data-row-section={k}>
          <div className="mb-0.5 text-[12px] font-bold text-amber-200">{k === 'use' ? '使う（だれに）' : '渡す（だれに）'}</div>
          {node}
        </div>
      ))}
      <button onClick={onCancel} className="btn btn-dark h-11 w-full rounded-lg text-[13px]" data-row-cancel>
        やめる
      </button>
    </div>
  );
}

/** 渡す相手（同じ場所の仲間）。渡せない時はボタンの代わりに理由の文 */
/**
 * 渡す相手の一覧。pouch = 道具（消耗品）を渡す時: 袋がいっぱいの相手は薄くして押せなくし、「袋がいっぱい」と出す
 * （エンジンの give「〇〇の袋がいっぱいです」と同じ決まり。前は確認の後で断られた。2026-11-19 検証 bot の指摘）
 */
function GiveSection({ game, hero, pouch, onPick }: { game: GameState; hero: Hero; pouch?: boolean; onPick: (to: string) => void }) {
  const reason = giveBlockReason(game, hero);
  if (reason) return <div className="text-[13px] text-zinc-300" data-give-reason>{reason}</div>;
  return (
    <div className="grid grid-cols-2 gap-1">
      {placeMates(game, hero).map((m) => {
        const full = !!pouch && m.pouch.length >= pouchLimitOf(m);
        return (
          <button key={m.id} onClick={() => onPick(m.id)} disabled={full} className="btn btn-dark flex h-12 items-center gap-1.5 rounded-lg px-2" data-give-to={m.id} data-give-full={full ? '' : undefined}>
            <HeroFace hero={m} size={30} />
            <span className="min-w-0 flex-1 text-left leading-4">
              <span className="block truncate text-[13px] font-bold">{m.name}</span>
              {full && <span className="block truncate text-[12px] text-zinc-300">袋がいっぱい</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** 使う相手（道具袋のシートと同じ決まり・同じ命令）。使えない時は理由の文 */
function UseSection({ game, hero, itemUid, activeId, onDone }: { game: GameState; hero: Hero; itemUid: string; activeId: string; onDone: () => void }) {
  const reason = useBlockReason(game, hero, activeId);
  if (reason) return <div className="text-[13px] text-zinc-300" data-use-reason>{reason}</div>;
  return <UsePanel owner={hero} itemUid={itemUid} keepSheet onDone={onDone} bare />;
}

/** 道具袋の1行: 押すと選ぶ（使う相手を決める）、長押しで詳細（指を離しても残る） */
function PouchRow({ itemId, heroId, onTap, className, children }: { itemId: string; heroId?: string; onTap: () => void; className: string; children: ReactNode }) {
  const press = usePress(onTap, { type: 'item', itemId, heroId });
  return (
    <button {...press} className={className} data-pouch-item={itemId}>
      {children}
    </button>
  );
}

/** 戦闘の外でだけ使う道具の種類（区切りE: テント・砥石など） */
const fieldKind = (def: { use?: { kind: string; what?: string }[] }) => def.use?.find((e) => e.kind === 'fieldOnly')?.what;

/**
 * 道具を使う相手を選ぶ枠（道具袋のシートと、パーティ・装備のシートの持ち物の行で共通。実機の不具合⑥）。
 * owner = 袋の持ち主（戦闘中は操作中のキャラ）。keepSheet = 使った後もシートを閉じない。bare = 外の枠を付けない（行の中に置く時）
 */
function UsePanel({ owner, itemUid, keepSheet, onDone, bare }: { owner: Hero; itemUid: string; keepSheet?: boolean; onDone: () => void; bare?: boolean }) {
  const game = useBattle((s) => s.game)!;
  const battle = useBattle((s) => s.battle);
  const usePouch = useBattle((s) => s.usePouch);
  // 区切りE: カード鍛錬の砥石・秘薬で、強化するキャラ
  const [stoneHero, setStoneHero] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!bare) ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [bare, stoneHero]);
  const inst = owner.pouch.find((p) => p.uid === itemUid);
  if (!inst) return null;
  const chosenDef = getItem(inst.itemId);
  const inBattle = game.mode === 'battle';
  // 使える相手: 自分と、同じ場面にいる仲間（回3 B: 世界マップで、同じマスにいてもダンジョンの中の仲間は入れない。
  // 前は入っていて、押すと「そのキャラはダンジョンの中です」と断られた。渡す相手の一覧 placeMates と同じ決まり）
  const mates = placeMates(game, owner);
  const targets = game.heroes.filter((h) => h === owner || mates.includes(h)).map((h) => {
    const a = inBattle ? battle.allies.find((x) => x.id === h.id) : undefined;
    const hp = a ? a.hp : h.hp;
    const max = a ? a.maxHp : heroMaxHp(h);
    return { h, hp, max, dead: a ? a.dead : h.hp <= 0 };
  });
  const use = (target: string, cardUid?: string, stat?: (typeof STAT_IDS)[number]) => {
    const error = usePouch(itemUid, target, owner.id, cardUid, stat, keepSheet);
    if (error) {
      setErr(error);
      return;
    }
    setErr(null);
    setStoneHero(null);
    onDone();
  };
  const box = bare ? '' : 'mt-2 rounded-xl border border-amber-400/40 bg-black/40 p-2';
  return (
    <div ref={ref} data-use-panel>
      {fieldKind(chosenDef) === 'tent' && !inBattle && (
        <div className={box}>
          <div className="text-[13px] text-zinc-300">{owner.name}がテントを張って野営します。夜の魔物に襲われず、HPとフォーカスを50%回復して、手番が終わります。</div>
          <button onClick={() => use(owner.id)} className="btn btn-gold mt-1 h-12 w-full rounded-lg text-[14px] font-bold">ここで野営する</button>
        </div>
      )}
      {fieldKind(chosenDef) === 'elixir' && stoneHero && !inBattle && (
        <div className={box} data-elixir-stats>
          <div className="text-[13px] text-zinc-300">{game.heroes.find((h) => h.id === stoneHero)?.name}のどの能力値を上げる？（この冒険の間 +{(chosenDef.use?.find((e) => e.kind === 'fieldOnly') as { amount?: number } | undefined)?.amount ?? 5}）</div>
          <div className="mt-1 grid grid-cols-4 gap-1">
            {STAT_IDS.map((st) => (
              <button key={st} onClick={() => use(stoneHero, undefined, st)} className="btn btn-dark flex h-11 flex-col items-center justify-center rounded-lg text-[12px] leading-4 font-bold" data-elixir-stat={st}>
                {STAT_LABEL[st]}
                <span className="tabular-nums text-zinc-400">{game.heroes.find((h) => h.id === stoneHero) ? heroStats(game.heroes.find((h) => h.id === stoneHero)!)[st] : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {fieldKind(chosenDef) === 'whetstone' && stoneHero && !inBattle && (
        <div className={box}>
          <div className="text-[13px] text-zinc-300">強化するカードを選んでください（この冒険の間だけ。成功率+10%・効果の数値が上がる）</div>
          <div className="mt-1 flex max-h-72 flex-col gap-1 overflow-y-auto">
            {(game.heroes.find((h) => h.id === stoneHero)?.deck ?? []).filter((c) => !c.upgraded).filter((c, i, all) => all.findIndex((x) => x.cardId === c.cardId) === i).map((c) => (
              <button key={c.uid} onClick={() => use(stoneHero, c.uid)} className="btn btn-dark flex h-11 items-center gap-2 rounded-lg px-2 text-left text-[13px]">
                <span className="min-w-0 flex-1 truncate font-bold">{cardOf(c).name}</span>
                <span className="text-[12px] text-amber-200">→ {cardOf({ cardId: c.cardId, upgraded: true }).name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {inBattle && itemTargetsEnemy(chosenDef.use) && (
        <div className={box} data-pouch-foes>
          <div className="text-[13px] text-zinc-300">「{chosenDef.name}」をどの敵に使う？</div>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {battle.enemies.filter((e) => !e.dead).map((e) => (
              <button key={e.uid} onClick={() => use(e.uid)} className="btn btn-dark flex h-12 items-center gap-1.5 rounded-lg px-2 text-left">
                <span className="min-w-0 flex-1 leading-4">
                  <span className="block truncate text-[13px] font-bold">{enemyName(e)}</span>
                  <span className="block text-[12px] text-zinc-400 tabular-nums">
                    HP {e.hp}/{e.maxHp}
                    {canBreak(e) && <span className="ml-1 text-amber-300">大技の予告</span>}
                  </span>
                </span>
                <ArrowRight size={16} className="ml-auto text-amber-300" />
              </button>
            ))}
          </div>
        </div>
      )}
      {!(inBattle && itemTargetsEnemy(chosenDef.use)) && fieldKind(chosenDef) !== 'tent' && !((fieldKind(chosenDef) === 'whetstone' || fieldKind(chosenDef) === 'elixir') && stoneHero) && (
        <div className={box}>
          <div className="text-[13px] text-zinc-300">
            「{chosenDef.name}」を誰に使う？{chosenDef.use?.some((e) => e.kind === 'escape') && '（使うと戦闘から逃げる）'}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {targets.map(({ h, hp, max, dead }) => (
              <button
                key={h.id}
                disabled={chosenDef.use?.some((e) => e.kind === 'phoenix') ? false : chosenDef.use?.some((e) => e.kind === 'revive') ? !dead : dead}
                onClick={() => {
                  // 砥石は、先にだれのカードかを選ぶ
                  if (fieldKind(chosenDef) === 'whetstone' || fieldKind(chosenDef) === 'elixir') {
                    setStoneHero(h.id);
                    return;
                  }
                  use(h.id);
                }}
                className="btn btn-dark flex h-12 items-center gap-1.5 rounded-lg px-2 text-left"
                data-use-to={h.id}
              >
                <HeroFace hero={h} size={30} dim={dead} />
                <span className="min-w-0 leading-4">
                  <span className="block truncate text-[13px] font-bold">{h.name}</span>
                  <span className="block text-[12px] text-zinc-400 tabular-nums">
                    HP {hp}/{max}
                  </span>
                </span>
                <ArrowRight size={16} className="ml-auto text-amber-300" />
              </button>
            ))}
          </div>
        </div>
      )}
      {err && (
        <div className="mt-1 text-[12px] text-red-300" role="status" data-use-error>
          {err}
        </div>
      )}
    </div>
  );
}

function PouchSheet() {
  const game = useBattle((s) => s.game)!;
  const openSheet = useBattle((s) => s.openSheet);
  const activeId = useBattle((s) => s.activeId);
  const sheetEpoch = useBattle((s) => s.sheetEpoch);
  const [chosen, setChosen] = useState<string | null>(null);
  // 点検 F6: つながり直した時は、選んでいた道具を消す
  useEffect(() => setChosen(null), [sheetEpoch]);
  const inBattle = game.mode === 'battle';
  // だれの袋か: 戦闘中は操作中のキャラ、それ以外は選べる（この端末のキャラで、今の場面にいる）
  const own = sceneLocalHeroes(game);
  const [ownerId, setOwnerId] = useState<string | undefined>(own[0]?.id);
  const owner = inBattle ? game.heroes.find((h) => h.id === activeId) : (own.find((h) => h.id === ownerId) ?? own[0]);
  const pouch = owner?.pouch ?? [];
  const groups = new Map<string, string[]>();
  for (const p of pouch) groups.set(p.itemId, [...(groups.get(p.itemId) ?? []), p.uid]);
  // 選んでいた道具がもう無い（仲間が使った・取り直しで変わった）時は、選んでいない扱い
  const live = chosen && pouch.some((p) => p.uid === chosen) ? chosen : null;
  return (
    <BottomSheet name="pouch" title={`${owner?.name ?? ''}の道具袋（${pouch.length}/${owner ? pouchLimitOf(owner) : POUCH_LIMIT}）`} onClose={() => openSheet(null)}>
      {!inBattle && own.length > 1 && (
        <div className="mb-1 flex gap-1">
          {own.map((h) => (
            <button
              key={h.id}
              onClick={() => {
                setOwnerId(h.id);
                setChosen(null);
              }}
              className={`btn flex h-11 min-w-0 flex-1 items-center gap-1 rounded-lg border-b-2 px-1 ${h.id === owner?.id ? 'sel-on' : 'border-transparent bg-black/30'}`}
            >
              <HeroFace hero={h} size={26} />
              <span className="truncate text-[12px] font-bold">{h.name}</span>
            </button>
          ))}
        </div>
      )}
      {groups.size === 0 && <div className="py-6 text-center text-[13px] text-zinc-500">道具を持っていません</div>}
      <div className="flex flex-col gap-1">
        {[...groups.entries()].map(([itemId, uids]) => {
          const it = getItem(itemId);
          const active = !!live && uids.includes(live);
          return (
            <PouchRow
              key={itemId}
              itemId={itemId}
              heroId={owner?.id}
              onTap={() => setChosen(active ? null : uids[0])}
              className={`btn flex min-h-14 items-center gap-2 rounded-lg border px-2 text-left ${active ? 'border-amber-300 bg-amber-500/10' : 'border-white/10 bg-black/30'}`}
            >
              <ItemIcon item={it} size={42} />
              <span className="min-w-0 flex-1 leading-4">
                <span className="block text-[14px] font-bold">
                  {it.name} <span className="text-amber-200">×{uids.length}</span>
                </span>
                <span className="block text-[12px] text-zinc-400">{itemSummary(it)}</span>
              </span>
            </PouchRow>
          );
        })}
      </div>
      {live && owner && <UsePanel key={live} owner={owner} itemUid={live} onDone={() => setChosen(null)} />}
      {!inBattle && <div className="mt-2 text-[12px] text-zinc-500">戦闘中は、ターン中に下の「道具」ボタンから使えます。</div>}
    </BottomSheet>
  );
}

function ConfirmAbandon() {
  const setConfirmAbandon = useBattle((s) => s.setConfirmAbandon);
  const abandonLocal = useBattle((s) => s.abandonGame);
  const room = useOnline((s) => s.room);
  const leave = useOnline((s) => s.leaveRoom);
  const abandon = room ? () => void leave() : abandonLocal;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="fixed inset-x-0 top-0 flex items-center justify-center bg-black/70 px-6"
      style={{ zIndex: LAYER.sheetConfirm, height: 'var(--app-h, 100dvh)' }}
      onClick={(e) => {
        e.stopPropagation();
        setConfirmAbandon(false);
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="panel panel-gold-edge panel-ornate w-full max-w-xs rounded-2xl p-4 pt-5">
        <Crest />
        <div className="font-display text-[18px]">{room ? '部屋を出ますか？' : '冒険をやめますか？'}</div>
        <div className="mt-1 text-[13px] text-zinc-400">{room ? `冒険は部屋に残ります。「部屋に参加」から合言葉 ${room.code} でまた入れます。` : 'この冒険の進行は失われ、タイトル画面に戻ります。'}</div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setConfirmAbandon(false)} className="btn btn-dark h-12 flex-1 rounded-lg font-bold">
            続ける
          </button>
          <button onClick={abandon} className="btn h-12 flex-1 rounded-lg border border-red-300/60 bg-red-700 font-bold">
            {room ? '出る' : 'やめる'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * シートの中で描画の例外が出た時の小さな守り（実機の不具合② 点検 F6）。
 * エラー境界が無いと画面全体が落ちるので、シートだけを閉じて知らせる。開き直せば、また描く
 */
class SheetGuard extends Component<{ sheet: string | null; children: ReactNode }, { failed: boolean; sheet: string | null }> {
  state = { failed: false, sheet: this.props.sheet };
  static getDerivedStateFromProps(p: { sheet: string | null }, s: { failed: boolean; sheet: string | null }) {
    return p.sheet !== s.sheet ? { failed: false, sheet: p.sheet } : null;
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('シートの表示でつまずきました', error, info.componentStack);
    const st = useBattle.getState();
    st.openSheet(null);
    st.showToast('表示でつまずいたので、画面を閉じました。もう一度開いてください', 'error');
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function Sheets() {
  const sheet = useBattle((s) => s.sheet);
  const confirm = useBattle((s) => s.confirmAbandon);
  const hasGame = useBattle((s) => !!s.game);
  const openSheet = useBattle((s) => s.openSheet);
  return (
    <>
      <SheetGuard sheet={sheet}>
        <AnimatePresence>
          {sheet === 'menu' && <MenuSheet key="menu" />}
          {sheet === 'log' && <LogSheet key="log" />}
          {(sheet === 'draw' || sheet === 'discard') && <PileSheet key={sheet} kind={sheet} />}
          {sheet === 'party' && hasGame && <PartySheet key="party" />}
          {sheet === 'pouch' && hasGame && <PouchSheet key="pouch" />}
          {sheet === 'jobs' && hasGame && (
            <BottomSheet key="jobs" name="jobs" title="転職" onClose={() => openSheet(null)} tall>
              <JobSheetBody />
            </BottomSheet>
          )}
          {sheet === 'quests' && hasGame && (
            <BottomSheet key="quests" name="quests" title="依頼と封印の鍵" onClose={() => openSheet(null)}>
              <QuestList />
            </BottomSheet>
          )}
        </AnimatePresence>
      </SheetGuard>
      <AnimatePresence>{confirm && <ConfirmAbandon />}</AnimatePresence>
    </>
  );
}
