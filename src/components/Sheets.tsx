import { getDifficulty } from '../data/rules';
// ===== メニュー・戦闘ログ・山札/捨札・パーティ（装備）・道具袋・冒険をやめる確認 =====
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronRight, DoorOpen, ScrollText, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CharacterArt } from '../art';
import { cardOf } from '../data/cards';
import { getClass } from '../data/classes';
import { getItem } from '../data/items';
import { EQUIP_SLOTS, STAT_IDS, affinityFromStats, battleDeck, canEquip, describeAbility, expToNext, findAlly, heroFocusMax, heroMaxHp, heroStats, weaponRarity } from '../engine';
import { LOCAL_PLAYER } from '../store/battleConfig';
import { useBattle } from '../store/battleStore';
import type { CardInstance, EquipSlot, Hero, ItemDef } from '../types';
import { Bar, HeroFace, ItemIcon, itemSummary, RARITY_STYLE, STAT_LABEL } from './ui/game';
import { CATEGORY_STYLE, EffectChip } from './ui/icons';

function BottomSheet({ title, onClose, children, tall }: { title: string; onClose: () => void; children: ReactNode; tall?: boolean }) {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-black/65"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        transition={{ duration: 0.12 }}
        onClick={(e) => e.stopPropagation()}
        className={`panel safe-pad flex flex-col rounded-t-2xl border-b-0 ${tall ? 'h-[92%]' : 'max-h-[86%]'}`}
      >
        <div className="flex items-center justify-between px-3 pt-1">
          <div className="font-display text-[18px] text-amber-100">{title}</div>
          <button onClick={onClose} aria-label="閉じる" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
            <X size={22} />
          </button>
        </div>
        <div className="mx-3 my-1 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="btn btn-dark flex h-12 w-full items-center justify-between rounded-lg px-3 text-[14px]">
      <span>{label}</span>
      <span className={`flex h-7 w-12 items-center rounded-full p-0.5 transition-colors ${on ? 'bg-amber-500' : 'bg-zinc-700'}`}>
        <span className={`h-6 w-6 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

function MenuSheet() {
  const game = useBattle((s) => s.game);
  const settings = useBattle((s) => s.settings);
  const setSettings = useBattle((s) => s.setSettings);
  const openSheet = useBattle((s) => s.openSheet);
  const setConfirmAbandon = useBattle((s) => s.setConfirmAbandon);
  const row = 'btn btn-dark flex h-12 w-full items-center gap-2 rounded-lg px-3 text-[14px] font-bold';
  return (
    <BottomSheet title="メニュー" onClose={() => openSheet(null)}>
      <div className="flex flex-col gap-2">
        <Toggle label="高速モード（演出2倍速）" on={settings.fastMode} onChange={(v) => setSettings({ fastMode: v })} />
        <Toggle label="振動" on={settings.vibration} onChange={(v) => setSettings({ vibration: v })} />
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
          <DoorOpen size={18} /> 冒険をやめてタイトルへ
        </button>
        <div className="pt-1 text-center text-[12px] text-zinc-500">冒険は自動で保存されます。長押しで詳細を表示できます。</div>
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
    <BottomSheet title="戦闘ログ" onClose={() => openSheet('menu')}>
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
    <BottomSheet title={`${ally?.name ?? ''}の${kind === 'draw' ? '山札（順不同）' : '捨札'} ${pile.length}枚`} onClose={() => openSheet(null)}>
      <DeckRows cards={pile} />
    </BottomSheet>
  );
}

/** 装備を変えた時の能力値などの変化 */
function diffText(hero: Hero, slot: EquipSlot, next: ItemDef | null): { label: string; delta: number }[] {
  const cur = hero.equipment[slot] ? getItem(hero.equipment[slot]!.itemId) : null;
  const out: { label: string; delta: number }[] = [];
  for (const k of STAT_IDS) {
    const d = (next?.stats?.[k] ?? 0) - (cur?.stats?.[k] ?? 0);
    if (d) out.push({ label: STAT_LABEL[k], delta: d });
  }
  const pairs: [string, keyof ItemDef][] = [
    ['最大HP', 'maxHp'],
    ['フォーカス最大', 'focusMax'],
    ['開始時ブロック', 'startBlock'],
    ['ドロー', 'extraDraw'],
  ];
  for (const [label, key] of pairs) {
    const d = ((next?.[key] as number | undefined) ?? 0) - ((cur?.[key] as number | undefined) ?? 0);
    if (d) out.push({ label, delta: d });
  }
  return out;
}

const SLOT_NAME: Record<EquipSlot, string> = { weapon: '武器', armor: '防具', accessory: '装飾品' };

function PartySheet() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const openSheet = useBattle((s) => s.openSheet);
  const [idx, setIdx] = useState(0);
  const [slot, setSlot] = useState<EquipSlot | null>(null);
  const [showDeck, setShowDeck] = useState(false);
  const hero = game.heroes[Math.min(idx, game.heroes.length - 1)];
  const cls = getClass(hero.classId);
  const stats = heroStats(hero);
  const aff = affinityFromStats(stats);
  const inBattle = game.mode === 'battle';
  const mine = hero.playerId === LOCAL_PLAYER;
  const candidates = slot ? game.stash.filter((s) => getItem(s.itemId).slot === slot) : [];

  return (
    <BottomSheet title="パーティ・装備" onClose={() => openSheet(null)} tall>
      <div className="flex gap-1">
        {game.heroes.map((h, i) => (
          <button
            key={h.id}
            onClick={() => {
              setIdx(i);
              setSlot(null);
            }}
            className={`btn flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border-b-2 py-1 ${i === idx ? 'border-amber-300 bg-amber-500/15' : 'border-transparent bg-black/30'}`}
          >
            <HeroFace hero={h} size={30} dim={h.hp <= 0} />
            <span className="truncate text-[12px] font-bold">{h.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <CharacterArt classId={hero.classId} gender={hero.gender} weapon={weaponRarity(hero)} className="h-[132px] w-[100px] shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-display text-[20px] leading-6">
            {hero.name} <span className="text-[13px]" style={{ color: cls.color }}>{cls.name}</span>
          </div>
          <div className="text-[13px] text-amber-300">
            Lv{hero.level} <span className="text-zinc-400">EXP {hero.exp}/{expToNext(hero.level)}</span>
          </div>
          <Bar value={hero.exp} max={expToNext(hero.level)} color="linear-gradient(90deg,#8a6aff,#c8b0ff)" height={5} />
          <div className="mt-1 text-[13px] tabular-nums">
            HP {hero.hp}/{heroMaxHp(hero)}・フォーカス {hero.focus}/{heroFocusMax(hero)}
          </div>
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
      </div>

      <div className="font-display mt-2 text-[15px] text-amber-200">装備{inBattle && <span className="ml-1 text-[12px] text-zinc-400">（戦闘中は変えられません）</span>}</div>
      <div className="mt-1 flex flex-col gap-1">
        {EQUIP_SLOTS.map((s) => {
          const inst = hero.equipment[s];
          const it = inst ? getItem(inst.itemId) : null;
          return (
            <button
              key={s}
              disabled={inBattle || !mine}
              onClick={() => setSlot(slot === s ? null : s)}
              className={`btn flex min-h-14 items-center gap-2 rounded-lg border px-2 text-left ${slot === s ? 'border-amber-300 bg-amber-500/10' : 'border-white/10 bg-black/30'}`}
            >
              <span className="w-12 shrink-0 text-[12px] text-zinc-400">{SLOT_NAME[s]}</span>
              {it ? <ItemIcon item={it} size={40} /> : <span className="h-10 w-10 rounded-lg border-2 border-dashed border-zinc-600" />}
              <span className="min-w-0 flex-1 leading-4">
                <span className="block text-[14px] font-bold" style={{ color: it ? RARITY_STYLE[it.rarity].color : '#888' }}>
                  {it?.name ?? 'なし'}
                </span>
                {it && <span className="block truncate text-[12px] text-zinc-400">{itemSummary(it)}</span>}
              </span>
              {!inBattle && mine && <ChevronRight size={18} className="text-zinc-400" />}
            </button>
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
              const diff = diffText(hero, slot, it);
              return (
                <div key={inst.uid} className="flex items-center gap-2 rounded-lg bg-black/30 p-1.5">
                  <ItemIcon item={it} size={40} />
                  <span className="min-w-0 flex-1 leading-4">
                    <span className="block text-[14px] font-bold" style={{ color: RARITY_STYLE[it.rarity].color }}>
                      {it.name}
                    </span>
                    <span className="flex flex-wrap gap-x-1.5 text-[12px]">
                      {diff.map((d) => (
                        <span key={d.label} className={d.delta > 0 ? 'text-emerald-300' : 'text-red-300'}>
                          {d.label}
                          {d.delta > 0 ? '+' : ''}
                          {d.delta}
                        </span>
                      ))}
                      {it.cards?.map((c) => (
                        <span key={c.cardId} className="text-sky-300">
                          「{cardOf({ cardId: c.cardId }).name}」×{c.count}
                        </span>
                      ))}
                      {why && <span className="text-red-300">{why}</span>}
                    </span>
                  </span>
                  <button
                    disabled={!!why}
                    onClick={() => {
                      dispatchGame({ type: 'EQUIP', playerId: LOCAL_PLAYER, heroId: hero.id, itemUid: inst.uid });
                      setSlot(null);
                    }}
                    className="btn btn-gold h-11 shrink-0 rounded-lg px-3 text-[14px] font-bold"
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
      {game.stash.length > 0 && (
        <div className="mt-2 text-[12px] text-zinc-400">持ち物の装備品：{game.stash.length}個（装備欄をタップして選ぶ）</div>
      )}
    </BottomSheet>
  );
}

function PouchSheet() {
  const game = useBattle((s) => s.game)!;
  const battle = useBattle((s) => s.battle);
  const usePouch = useBattle((s) => s.usePouch);
  const openSheet = useBattle((s) => s.openSheet);
  const [chosen, setChosen] = useState<string | null>(null);
  const inBattle = game.mode === 'battle';
  const groups = new Map<string, string[]>();
  for (const p of game.pouch) groups.set(p.itemId, [...(groups.get(p.itemId) ?? []), p.uid]);
  const chosenDef = chosen ? getItem(game.pouch.find((p) => p.uid === chosen)!.itemId) : null;
  const targets = game.heroes.map((h) => {
    const a = inBattle ? battle.allies.find((x) => x.id === h.id) : undefined;
    const hp = a ? a.hp : h.hp;
    const max = a ? a.maxHp : heroMaxHp(h);
    return { h, hp, max, dead: a ? a.dead : h.hp <= 0 };
  });
  return (
    <BottomSheet title={`道具袋（${game.pouch.length}）`} onClose={() => openSheet(null)}>
      {groups.size === 0 && <div className="py-6 text-center text-[13px] text-zinc-500">道具を持っていません</div>}
      <div className="flex flex-col gap-1">
        {[...groups.entries()].map(([itemId, uids]) => {
          const it = getItem(itemId);
          const active = chosen && uids.includes(chosen);
          return (
            <button
              key={itemId}
              onClick={() => setChosen(active ? null : uids[0])}
              className={`btn flex min-h-14 items-center gap-2 rounded-lg border px-2 text-left ${active ? 'border-amber-300 bg-amber-500/10' : 'border-white/10 bg-black/30'}`}
            >
              <ItemIcon item={it} size={42} />
              <span className="min-w-0 flex-1 leading-4">
                <span className="block text-[14px] font-bold">
                  {it.name} <span className="text-amber-200">×{uids.length}</span>
                </span>
                <span className="block text-[12px] text-zinc-400">{itemSummary(it)}</span>
              </span>
            </button>
          );
        })}
      </div>
      {chosenDef && (
        <div className="mt-2 rounded-xl border border-amber-400/40 bg-black/40 p-2">
          <div className="text-[13px] text-zinc-300">
            「{chosenDef.name}」を誰に使う？{chosenDef.use?.some((e) => e.kind === 'escape') && '（使うと戦闘から逃げる）'}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {targets.map(({ h, hp, max, dead }) => (
              <button
                key={h.id}
                disabled={dead}
                onClick={() => {
                  usePouch(chosen!, h.id);
                  setChosen(null);
                }}
                className="btn btn-dark flex h-12 items-center gap-1.5 rounded-lg px-2 text-left"
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
      {!inBattle && <div className="mt-2 text-[12px] text-zinc-500">戦闘中は、ターン中に下の「道具」ボタンから使えます。</div>}
    </BottomSheet>
  );
}

function ConfirmAbandon() {
  const setConfirmAbandon = useBattle((s) => s.setConfirmAbandon);
  const abandon = useBattle((s) => s.abandonGame);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 px-6"
      onClick={(e) => {
        e.stopPropagation();
        setConfirmAbandon(false);
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="panel panel-gold-edge w-full max-w-xs rounded-2xl p-4">
        <div className="font-display text-[18px]">冒険をやめますか？</div>
        <div className="mt-1 text-[13px] text-zinc-400">この冒険の進行は失われ、タイトル画面に戻ります。</div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setConfirmAbandon(false)} className="btn btn-dark h-12 flex-1 rounded-lg font-bold">
            続ける
          </button>
          <button onClick={abandon} className="btn h-12 flex-1 rounded-lg border border-red-300/60 bg-red-700 font-bold">
            やめる
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function Sheets() {
  const sheet = useBattle((s) => s.sheet);
  const confirm = useBattle((s) => s.confirmAbandon);
  const hasGame = useBattle((s) => !!s.game);
  return (
    <>
      <AnimatePresence>
        {sheet === 'menu' && <MenuSheet key="menu" />}
        {sheet === 'log' && <LogSheet key="log" />}
        {(sheet === 'draw' || sheet === 'discard') && <PileSheet key={sheet} kind={sheet} />}
        {sheet === 'party' && hasGame && <PartySheet key="party" />}
        {sheet === 'pouch' && hasGame && <PouchSheet key="pouch" />}
      </AnimatePresence>
      <AnimatePresence>{confirm && <ConfirmAbandon />}</AnimatePresence>
    </>
  );
}

