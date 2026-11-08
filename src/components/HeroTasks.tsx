// ===== イベントの後にキャラごとにすること: お供を迎える / カードを1枚選ぶ / 行商人で買い物（設計 v2.1 §4・§5） =====
// イベントの窓・戦闘・報酬が閉じてから出す（どの場面にいても、この端末のキャラなら出す）
import { motion } from 'framer-motion';
import { Coins, Heart, X } from 'lucide-react';
import { useState } from 'react';
import { cardOf, getCard } from '../data/cards';
import { getItem } from '../data/items';
import { getPet } from '../data/pets';
import { BALANCE } from '../data/balance';
import { affinityFromStats, finalChance, heroStats, isPetMaster } from '../engine';
import { isLocalPlayer } from '../store/battleConfig';
import { useBattle } from '../store/battleStore';
import type { GameCommand, Hero } from '../types';
import { CardBody } from './ui/CardBody';
import { HeroFace, ItemIcon, itemSummary, RARITY_STYLE } from './ui/game';
import { PetToken } from './ui/PetToken';

const CALM = new Set(['world', 'dungeon', 'rest', 'town', 'hub', 'shrine']);

const TASK_TEXT = { upgrade: '強化するカードを1枚選んでください', remove: '山札から外すカードを1枚選んでください', mutate: '捧げるカードを1枚選んでください（別の系統のレア以上のカードに変わります）' };

function Frame({ title, hero, children }: { title: string; hero: Hero; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[70] flex flex-col bg-[#0b0910]/[.97] px-3 pt-4 pb-3" data-hero-task>
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
  const [petId, setPetId] = useState(offer[0]);
  const def = getPet(petId);
  const color = hero.petOfferColors?.[petId] ?? def.colors[0].id;
  const coat = def.colors.find(c => c.id === color)!;
  const [name, setName] = useState('');
  const pick = (id: string) => {
    setPetId(id);
  };
  const master = isPetMaster(hero);
  return (
    <Frame title="旅のお供" hero={hero}>
      <div className="mt-1 text-center text-[13px] text-zinc-300">{offer.length > 1 ? '迎える子を選んでください' : `${def.name}が${hero.name}を見つめている`}</div>
      {offer.length > 1 && (
        <div className="mt-2 flex justify-center gap-2">
          {offer.map((id) => (
            <button key={id} onClick={() => pick(id)} className={`btn flex h-16 w-24 flex-col items-center justify-center rounded-xl border-2 ${id === petId ? 'border-amber-300 bg-amber-500/15' : 'border-white/15 bg-black/40'}`}>
              <span className="text-[28px] leading-8">{getPet(id).icon}</span>
              <span className="text-[12px] font-bold">{getPet(id).name}</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-col items-center">
        <div key={petId} className={coat.rarity === 'rare' ? 'pet-rare-reveal rounded-full p-2' : 'p-2'}><PetToken pet={{ petId, color, name, love: 0 }} size={84} /></div>
        <div className="font-display mt-1 text-[20px] text-amber-100">
          {def.name}
          {def.rare && <span className="ml-1 rounded-full bg-violet-600/70 px-1.5 align-middle text-[12px]">めったに会えない</span>}
        </div>
        <div className="mt-0.5 px-2 text-center text-[13px] leading-5 text-zinc-200">{def.description}</div>
        <div className="mt-1 rounded-lg bg-black/40 px-2 py-1 text-[12px] leading-4 text-zinc-300">
          {(master ? def.masterAbilities : def.abilities).map((a) => a.name).join('・')}
          {master && <span className="ml-1 text-amber-300">（獣使い: 効果2倍）</span>}
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-amber-200/25 bg-black/30 p-2 text-center text-[15px]" data-pet-coat={color}>
        <span className="mr-2 inline-block h-4 w-4 rounded-full align-middle" style={{ background: coat.color }} />{coat.name}
        {coat.rarity === 'rare' && <div className="mt-1 font-bold text-amber-200" data-rare-coat>✨珍しい毛色！</div>}
        <div className="mt-1 text-[12px] text-zinc-300">出会った時の毛色です</div>
      </div>
      <div className="mt-3 text-[13px] font-bold text-zinc-300">名前</div>
      <input
        value={name}
        maxLength={BALANCE.petNameMax}
        onChange={(e) => setName(e.target.value)}
        placeholder={`例: ${def.names[0]}`}
        className="mt-1 h-11 w-full rounded-lg border border-white/20 bg-black/50 px-3 text-[16px] text-amber-50 outline-none focus:border-amber-300"
        aria-label="お供の名前"
      />
      {hero.pet && <div className="mt-2 rounded-lg bg-red-950/60 px-2 py-1.5 text-[13px] text-red-100">今の「{hero.pet.name}」とはお別れになります（お供は1匹まで）</div>}
      <div className="mt-auto grid grid-cols-[1fr_2fr] gap-2 pt-3">
        <button onClick={() => send({ type: 'ADOPT_PET', playerId: hero.playerId, heroId: hero.id })} className="btn btn-dark h-12 rounded-xl text-[15px] font-bold">
          見送る
        </button>
        <button onClick={() => send({ type: 'ADOPT_PET', playerId: hero.playerId, heroId: hero.id, petId, color, name: name.trim() || def.names[0] })} className="btn btn-gold font-display flex h-12 items-center justify-center gap-1.5 rounded-xl text-[18px]">
          <Heart size={18} className="fill-current" /> お供にする
        </button>
      </div>
    </Frame>
  );
}

function CardTask({ hero, send }: { hero: Hero; send: (c: GameCommand) => void }) {
  const task = hero.cardTask!;
  const [sel, setSel] = useState<string | null>(null);
  const aff = affinityFromStats(heroStats(hero));
  const cards = hero.deck.filter((c) => task !== 'upgrade' || !c.upgraded);
  return (
    <Frame title={task === 'upgrade' ? 'カードの強化' : task === 'remove' ? 'カードを外す' : 'カードを捧げる'} hero={hero}>
      <div className="mt-1 text-center text-[13px] text-zinc-300">{TASK_TEXT[task]}</div>
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-3 content-start gap-1.5 overflow-y-auto pb-2">
        {cards.map((c) => {
          const card = task === 'upgrade' && sel === c.uid ? getCard(c.cardId, true) : cardOf(c);
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
        <button disabled={!sel} onClick={() => sel && send({ type: 'CARD_TASK', playerId: hero.playerId, heroId: hero.id, cardUid: sel })} className="btn btn-gold font-display h-12 rounded-xl text-[18px] disabled:opacity-40">
          {task === 'upgrade' ? '強化する' : task === 'remove' ? '外す' : '捧げる'}
        </button>
      </div>
    </Frame>
  );
}

function Peddler({ hero, send }: { hero: Hero; send: (c: GameCommand) => void }) {
  const shop = hero.peddler!;
  const aff = affinityFromStats(heroStats(hero));
  return (
    <Frame title="さすらいの行商人" hero={hero}>
      <div className="mt-1 flex items-center justify-center gap-1 text-[14px] font-bold text-amber-200">
        <Coins size={15} /> 所持金 {hero.gold}G
      </div>
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {shop.items.map((s, i) => {
          const it = getItem(s.item.itemId);
          return (
            <div key={s.item.uid} className={`panel flex items-center gap-2 rounded-lg p-1.5 ${s.sold ? 'opacity-40' : ''}`}>
              <ItemIcon item={it} size={44} />
              <div className="min-w-0 flex-1 leading-4">
                <div className="text-[14px] font-bold" style={{ color: RARITY_STYLE[it.rarity].color }}>
                  {it.name}
                </div>
                <div className="truncate text-[12px] text-zinc-400">{itemSummary(it)}</div>
              </div>
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
        <X size={18} /> 行商人と別れる
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
