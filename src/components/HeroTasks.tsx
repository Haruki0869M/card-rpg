// ===== イベントの後にキャラごとにすること: お供を迎える / カードを1枚選ぶ / 行商人で買い物（設計 v2.1 §4・§5） =====
// イベントの窓・戦闘・報酬が閉じてから出す（どの場面にいても、この端末のキャラなら出す）
import { ItemInfoArea } from './ItemDetail';
import { motion } from 'framer-motion';
import { Coins, Heart, X } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { cardOf, getCard } from '../data/cards';
import { getItem } from '../data/items';
import { getPet } from '../data/pets';
import { BALANCE } from '../data/balance';
import { affinityFromStats, altarTransmutePool, finalChance, heroStats, isPetMaster } from '../engine';
import { isLocalPlayer } from '../store/battleConfig';
import { useBattle } from '../store/battleStore';
import type { GameCommand, Hero } from '../types';
import { CardBody } from './ui/CardBody';
import { HeroFace, ItemIcon, itemSummary, RARITY_STYLE } from './ui/game';
import { PetReveal } from './ui/PetReveal';
import { useProfile } from '../store/profileStore';
import { isNewPetCoat } from '../store/profile';

const CALM = new Set(['world', 'dungeon', 'rest', 'town', 'hub', 'shrine']);

const TASK_TEXT = {
  upgrade: '強化するカードを1枚選んでください',
  remove: '山札から外すカードを1枚選んでください',
  mutate: '捧げるカードを1枚選んでください（別の系統のレア以上のカードに変わります）',
  altar: '晶石の祭壇: カードを1枚、強化か変異ができます',
};
/** 晶石の祭壇の2つの選び方の説明（段階7a） */
const ALTAR_TEXT = { upgrade: '選んだカードを＋に強化します', transmute: '選んだカードが、同じ格の別のカードに変わります（何になるかは変わるまで秘密）' };

function Frame({ title, hero, children }: { title: string; hero: Hero; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[70] flex flex-col bg-[#0b0910] px-3 pt-4 pb-3" data-hero-task>
      <div className="flex items-center justify-center gap-2">
        <HeroFace hero={hero} size={30} />
        <div className="font-display text-outline text-[22px] text-amber-100">{title}</div>
      </div>
      {children}
    </motion.div>
  );
}

function AdoptPet({ hero, send }: { hero: Hero; send: (c: GameCommand) => void }) {
  const offer = hero.petOffer!;
  const colorOf = (id: string) => hero.petOfferColors?.[id] ?? getPet(id).colors[0].id;
  const [petId, setPetId] = useState(offer[0]);
  const def = getPet(petId);
  const color = colorOf(petId);
  const coat = def.colors.find(c => c.id === color)!;
  const [name, setName] = useState('');
  // NEW! は画面を開いた時の伝承の書の記録で決める（開いた後に「出会った」が記録されても消えない）
  const [fresh] = useState(() => {
    const prof = useProfile.getState().profile;
    return Object.fromEntries(offer.map((id) => [id, isNewPetCoat(prof, id, colorOf(id))]));
  });
  // 演出が終わった子（選び直した時は短い版で出し直す）
  const [shownOnce, setShownOnce] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [more, setMore] = useState(false);
  // 説明は2行まで。収まらない時だけ「くわしく」を出す
  const descRef = useRef<HTMLSpanElement>(null);
  const [clamped, setClamped] = useState(false);
  useLayoutEffect(() => {
    const e = descRef.current;
    if (e && !more) setClamped(e.scrollHeight > e.clientHeight + 1);
  }, [petId, more]);
  const pick = (id: string) => {
    if (id === petId) return;
    setPetId(id);
    setRevealed(false);
    setMore(false);
  };
  const master = isPetMaster(hero);
  return (
    <Frame title="旅のお供" hero={hero}>
      <div className="mt-1 text-center text-[13px] text-zinc-300">{offer.length > 1 ? '迎える子を選んでください' : `${def.name}が${hero.name}を見つめている`}</div>
      {offer.length > 1 && (
        <div className="mt-2 flex justify-center gap-2">
          {offer.map((id) => (
            <button key={id} data-pet-pick={id} onClick={() => pick(id)} className={`btn flex h-14 w-24 flex-col items-center justify-center rounded-xl border-2 ${id === petId ? 'border-amber-300 bg-amber-500/15' : 'border-white/15 bg-black/40'}`}>
              <span className="text-[24px] leading-7">{getPet(id).icon}</span>
              <span className="text-[12px] font-bold">{getPet(id).name}</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-1 flex min-h-0 flex-col items-center">
        <PetReveal
          key={petId}
          petId={petId}
          color={color}
          name={name || def.name}
          rare={coat.rarity === 'rare'}
          isNew={fresh[petId]}
          short={shownOnce.length > 0}
          size={152}
          onRevealed={() => { setRevealed(true); setShownOnce((l) => (l.includes(petId) ? l : [...l, petId])); }}
        />
        <div className="font-display text-[20px] leading-6 text-amber-100">
          {def.name}
          {def.rare && <span className="ml-1 rounded-full bg-violet-600/70 px-1.5 align-middle text-[12px]">めったに会えない</span>}
        </div>
        <button type="button" disabled={!clamped && !more} onClick={() => setMore((v) => !v)} className="mt-0.5 px-2 text-center text-[13px] leading-5 text-zinc-200" aria-expanded={more}>
          <span ref={descRef} className={more ? 'block' : 'line-clamp-2'}>{def.description}</span>
          {(clamped || more) && <span className="text-[12px] text-amber-200/80">{more ? '▲ とじる' : '▼ くわしく'}</span>}
        </button>
        <div className="mt-1 rounded-lg bg-black/40 px-2 py-1 text-[12px] leading-4 text-zinc-300">
          {(master ? def.masterAbilities : def.abilities).map((a) => a.name).join('・')}
          {master && <span className="ml-1 text-amber-300">（獣使い: 効果2倍）</span>}
        </div>
      </div>
      <div className="mt-2 rounded-xl border border-amber-200/25 bg-black/30 p-1.5 text-center text-[15px]" data-pet-coat={color} data-pet-revealed={revealed ? '' : undefined}>
        {revealed ? (
          <>
            毛色：<span className="mx-1 inline-block h-4 w-4 rounded-full align-middle" style={{ background: coat.color }} />{coat.name}
            {coat.rarity === 'rare' ? <span className="ml-1 font-bold text-amber-200" data-rare-coat>（✨珍しい毛色！）</span> : <span className="ml-1 text-[13px] text-zinc-300">（通常の色）</span>}
          </>
        ) : (
          <span className="text-zinc-400">毛色：？？？</span>
        )}
      </div>
      <div className="mt-2 text-[13px] font-bold text-zinc-300">名前</div>
      <input
        value={name}
        maxLength={BALANCE.petNameMax}
        disabled={!revealed}
        onChange={(e) => setName(e.target.value)}
        placeholder={`例: ${def.names[0]}`}
        className="mt-1 h-11 w-full rounded-lg border border-white/20 bg-black/50 px-3 text-[16px] text-amber-50 outline-none focus:border-amber-300 disabled:opacity-50"
        aria-label="お供の名前"
      />
      {hero.pet && <div className="mt-2 rounded-lg bg-red-950/60 px-2 py-1.5 text-[13px] text-red-100">今の「{hero.pet.name}」とはお別れになります（お供は1匹まで）</div>}
      <div className="mt-auto grid grid-cols-[1fr_2fr] gap-2 pt-3">
        <button onClick={() => send({ type: 'ADOPT_PET', playerId: hero.playerId, heroId: hero.id })} className="btn btn-dark h-12 rounded-xl text-[15px] font-bold">
          見送る
        </button>
        <button disabled={!revealed} onClick={() => send({ type: 'ADOPT_PET', playerId: hero.playerId, heroId: hero.id, petId, color, name: name.trim() || def.names[0] })} className="btn btn-gold font-display flex h-12 items-center justify-center gap-1.5 rounded-xl text-[18px] disabled:opacity-50">
          <Heart size={18} className="fill-current" /> お供にする
        </button>
      </div>
    </Frame>
  );
}

function CardTask({ hero, send }: { hero: Hero; send: (c: GameCommand) => void }) {
  const task = hero.cardTask!;
  const full = useBattle((s) => s.full);
  const [sel, setSel] = useState<string | null>(null);
  // 晶石の祭壇（段階7a）: 強化か変異か（最初は強化）
  const [altar, setAltar] = useState<'upgrade' | 'transmute'>('upgrade');
  const aff = affinityFromStats(heroStats(hero));
  const upgrading = task === 'upgrade' || (task === 'altar' && altar === 'upgrade');
  const cards = hero.deck.filter((c) => (!upgrading || !c.upgraded) && (task !== 'altar' || altar !== 'transmute' || !full || altarTransmutePool(full, hero, c.cardId).length > 0));
  const title = task === 'altar' ? '晶石の祭壇' : task === 'upgrade' ? 'カードの強化' : task === 'remove' ? 'カードを外す' : 'カードを捧げる';
  const verb = task === 'altar' ? (altar === 'upgrade' ? '強化する' : '変異させる') : task === 'upgrade' ? '強化する' : task === 'remove' ? '外す' : '捧げる';
  return (
    <Frame title={title} hero={hero}>
      <div className="mt-1 text-center text-[13px] text-zinc-300">{TASK_TEXT[task]}</div>
      {task === 'altar' && (
        <>
          <div className="mt-2 grid grid-cols-2 gap-1.5" data-altar-modes>
            {(['upgrade', 'transmute'] as const).map((m) => (
              <button key={m} onClick={() => { setAltar(m); setSel(null); }} aria-pressed={altar === m} data-altar-mode={m} className={`btn h-11 rounded-xl border-2 text-[15px] font-bold ${altar === m ? 'border-sky-300 bg-sky-500/20 text-sky-100' : 'border-white/15 bg-black/40 text-zinc-300'}`}>
                {m === 'upgrade' ? '＋に強化' : '変異させる'}
              </button>
            ))}
          </div>
          <div className="mt-1 text-center text-[12px] leading-4 text-sky-100/80">{ALTAR_TEXT[altar]}</div>
        </>
      )}
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-3 content-start gap-1.5 overflow-y-auto pb-2">
        {cards.map((c) => {
          const card = upgrading && sel === c.uid ? getCard(c.cardId, true) : cardOf(c);
          return (
            <button key={c.uid} onClick={() => setSel(c.uid)} className="btn" aria-label={card.name} aria-pressed={sel === c.uid}>
              <CardBody card={card} chance={finalChance(card, aff)} width={104} height={150} selected={sel === c.uid} compact />
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-[1fr_2fr] gap-2 pt-2">
        <button onClick={() => send({ type: 'CARD_TASK', playerId: hero.playerId, heroId: hero.id })} className="btn btn-dark h-12 rounded-xl text-[15px] font-bold">
          やめる
        </button>
        <button disabled={!sel} onClick={() => sel && send({ type: 'CARD_TASK', playerId: hero.playerId, heroId: hero.id, cardUid: sel, ...(task === 'altar' ? { altar } : {}) })} className="btn btn-gold font-display h-12 rounded-xl text-[18px] disabled:opacity-40" data-card-task-go>
          {verb}
        </button>
      </div>
    </Frame>
  );
}

function Peddler({ hero, send }: { hero: Hero; send: (c: GameCommand) => void }) {
  const shop = hero.peddler!;
  const aff = affinityFromStats(heroStats(hero));
  // 闇商人（段階7a・無法者の隠れ処）: 行商人と同じ画面。名前と、専用の装備の案内だけが違う
  const black = shop.kind === 'blackMarket';
  return (
    <Frame title={black ? '闇商人' : 'さすらいの行商人'} hero={hero}>
      <div className="mt-1 flex items-center justify-center gap-1 text-[14px] font-bold text-amber-200">
        <Coins size={15} /> 所持金 {hero.gold}G
      </div>
      {black && <div className="mt-1 text-center text-[12px] leading-4 text-zinc-300" data-black-market>「専用」の装備は、ここと黄金箱でしか手に入らない。値段は町より高め。買わなくてもよい</div>}
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {shop.items.map((s, i) => {
          const it = getItem(s.item.itemId);
          return (
            <div key={s.item.uid} className={`panel flex items-center gap-2 rounded-lg p-1.5 ${s.sold ? 'opacity-40' : ''}`}>
              <ItemInfoArea itemId={it.id} heroId={hero.id} className="flex flex-1 items-center gap-2">
                <ItemIcon item={it} size={44} />
                <span className="block min-w-0 flex-1 leading-4">
                  <span className="block text-[14px] font-bold" style={{ color: RARITY_STYLE[it.rarity].color }}>
                    {it.source && <span className="mr-1 rounded bg-amber-500/80 px-1 text-[12px] text-black" data-exclusive-tag>専用</span>}
                    {it.name}
                  </span>
                  <span className="block truncate text-[12px] text-zinc-400">{itemSummary(it)}</span>
                </span>
              </ItemInfoArea>
              <button disabled={s.sold || hero.gold < s.price} onClick={() => send({ type: 'PEDDLER_BUY', playerId: hero.playerId, heroId: hero.id, kind: 'item', index: i })} className="btn btn-gold h-11 w-20 shrink-0 rounded-lg text-[14px] font-bold disabled:opacity-40">
                {s.sold ? '済' : `${s.price}G`}
              </button>
            </div>
          );
        })}
        {shop.cards.length > 0 && <div className="mt-1 text-[13px] font-bold text-zinc-300">他の系統のカード</div>}
        <div className="flex gap-2">
          {shop.cards.map((c, i) => {
            const card = getCard(c.cardId);
            return (
              <div key={c.cardId} className={`flex flex-col items-center gap-1 ${c.sold ? 'opacity-40' : ''}`}>
                <CardBody card={card} chance={finalChance(card, aff)} width={110} height={160} />
                <button disabled={c.sold || hero.gold < c.price} onClick={() => send({ type: 'PEDDLER_BUY', playerId: hero.playerId, heroId: hero.id, kind: 'card', index: i })} className="btn btn-gold h-11 w-full rounded-lg text-[14px] font-bold disabled:opacity-40">
                  {c.sold ? '済' : `${c.price}G`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <button onClick={() => send({ type: 'PEDDLER_BUY', playerId: hero.playerId, heroId: hero.id })} className="btn btn-dark mt-2 flex h-12 items-center justify-center gap-1.5 rounded-xl text-[15px] font-bold">
        <X size={18} /> {black ? '闇商人と別れる' : '行商人と別れる'}
      </button>
    </Frame>
  );
}

/** この端末のキャラに、イベントの後の作業があれば出す */
export function HeroTaskOverlay() {
  const screen = useBattle(s => s.screen);
  const full = useBattle((s) => s.full);
  const mode = useBattle((s) => s.game?.mode);
  const dispatchWire = useBattle((s) => s.dispatchWire);
  const showToast = useBattle((s) => s.showToast);
  if (screen !== 'game' || !full || !mode || !CALM.has(mode)) return null;
  const hero = full.heroes.find((h) => isLocalPlayer(h.playerId) && !h.jobPick?.length && (h.petOffer?.length || h.cardTask || h.peddler));
  if (!hero) return null;
  const send = (c: GameCommand) => {
    const err = dispatchWire(c);
    if (err) showToast(err);
  };
  if (hero.petOffer?.length) return <AdoptPet key={`pet${hero.id}`} hero={hero} send={send} />;
  if (hero.cardTask) return <CardTask key={`task${hero.id}`} hero={hero} send={send} />;
  return <Peddler key={`shop${hero.id}`} hero={hero} send={send} />;
}
