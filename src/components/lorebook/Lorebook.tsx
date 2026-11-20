// ===== 伝承の書（タイトルから開く、冒険をまたいだ記録の本。K5） =====
// 図鑑（お供・ジョブ・カード・装備・敵）と記録。この端末の記録（store/profileStore）を読むだけ。
// 強さを上げる物は置かない（オーナーの方針）。
import { BookOpen, Layers, PawPrint, ScrollText, Shield, Skull, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CharacterArt, EnemyArt } from '../../art';
import { CARDS } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { ENEMIES } from '../../data/enemies';
import { ITEMS } from '../../data/items';
import { PETS } from '../../data/pets';
import { WEAPON_TYPES } from '../../data/rules';
import { SCENARIOS } from '../../data/scenarios';
import { CATEGORY_LABEL, RARITY_NAME } from '../../data/terms';
import { describeAbility } from '../../engine';
import { useBackButton } from '../../hooks/useBackButton';
import type { SeenGot } from '../../store/profile';
import { useProfile } from '../../store/profileStore';
import type { CardDef, ClassDef, EnemyDef, ItemDef, PetDef } from '../../types';
import { TIER_NAME } from '../JobSheet';
import { CardFace } from '../ui/CardFace';
import { CATEGORY_STYLE, ElementTag } from '../ui/icons';
import { ItemIcon, itemSummary, RARITY_STYLE } from '../ui/game';
import { PetToken } from '../ui/PetToken';
import { LoreReadOnly, UchinokoDetail, UchinokoSection } from './MyPets';
import { hiddenBosses, rareEnemyIds } from './loreSections';
import { useLore } from '../../store/lore';

type Tab = 'pets' | 'jobs' | 'cards' | 'items' | 'enemies' | 'record';
const TABS: { id: Tab; label: string; Icon: typeof BookOpen }[] = [
  { id: 'pets', label: 'お供', Icon: PawPrint },
  { id: 'jobs', label: 'ジョブ', Icon: Users },
  { id: 'cards', label: 'カード', Icon: Layers },
  { id: 'items', label: '装備', Icon: Shield },
  { id: 'enemies', label: '敵', Icon: Skull },
  { id: 'record', label: '記録', Icon: ScrollText },
];

type Mark = 'got' | 'seen' | 'none';
const markOf = (id: string, sg: SeenGot): Mark => (sg.got.includes(id) ? 'got' : sg.seen.includes(id) ? 'seen' : 'none');

type Detail =
  | { kind: 'card'; def: CardDef; mark: Mark }
  | { kind: 'item'; def: ItemDef; mark: Mark }
  | { kind: 'enemy'; def: EnemyDef; mark: Mark; kills: number }
  | { kind: 'job'; def: ClassDef; mark: Mark }
  | { kind: 'pet'; def: PetDef; color: string; mark: Mark }
  | { kind: 'uchinoko'; uid: string };

/** 「見つけた 〇/〇・手に入れた 〇」と、埋まり具合の帯 */
function Progress({ total, seen, got, gotLabel = '手に入れた' }: { total: number; seen: number; got: number; gotLabel?: string }) {
  const pct = total ? Math.round((seen / total) * 100) : 0;
  return (
    <div className="mb-2" data-lore-progress>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-zinc-300">
          見つけた <b className="tabular-nums text-amber-100">{seen}</b>/<span className="tabular-nums">{total}</span>
        </span>
        <span className="text-zinc-300">
          {gotLabel} <b className="tabular-nums text-emerald-200">{got}</b>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-200" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** 図鑑の1マス（まだ見ていない物は「？？？」で押せない） */
function Cell({ mark, label, onTap, children }: { mark: Mark; label: string; onTap: () => void; children: ReactNode }) {
  const none = mark === 'none';
  return (
    <button
      disabled={none}
      onClick={onTap}
      data-lore-cell={mark}
      className={`relative flex min-h-[76px] min-w-0 flex-col items-center justify-start gap-1 rounded-lg border px-1 pt-1.5 pb-1 text-center ${none ? 'border-white/5 bg-black/30' : 'btn border-amber-200/20 bg-white/[.04]'}`}
    >
      <span className={`flex h-10 items-center justify-center ${none ? 'opacity-40 brightness-0' : mark === 'seen' ? 'opacity-70' : ''}`}>{children}</span>
      <span className={`line-clamp-2 w-full text-[12px] leading-[14px] break-all ${none ? 'text-zinc-600' : 'text-zinc-100'}`}>{none ? '？？？' : label}</span>
      {mark === 'got' && <span className="absolute top-0.5 right-1 text-[12px] leading-none text-emerald-300" aria-label="手に入れた">●</span>}
    </button>
  );
}

const Grid = ({ cols = 4, children }: { cols?: number; children: ReactNode }) => (
  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
    {children}
  </div>
);

function Badge({ mark }: { mark: Mark }) {
  if (mark === 'got') return <span className="rounded-full bg-emerald-700/60 px-2 py-0.5 text-[12px] text-emerald-100">手に入れた</span>;
  return <span className="rounded-full bg-zinc-700/70 px-2 py-0.5 text-[12px] text-zinc-200">見ただけ</span>;
}

// ---------- お供 ----------
function PetsTab({ onDetail }: { onDetail: (d: Detail) => void }) {
  const pets = useProfile((s) => s.profile.pets);
  const total = PETS.all.reduce((n, p) => n + p.colors.length, 0);
  return (
    <>
      <UchinokoSection onOpen={(uid) => onDetail({ kind: 'uchinoko', uid })} />
      <div className="mb-1 font-display text-[15px] text-pink-200">お供図鑑</div>
      <Progress total={total} seen={pets.seen.length} got={pets.got.length} gotLabel="仲間にした" />
      <div className="flex flex-col gap-1.5">
        {PETS.all.map((def) => {
          const anySeen = def.colors.some((c) => pets.seen.includes(`${def.id}:${c.id}`));
          return (
            <div key={def.id} className="flex items-center gap-2 rounded-lg bg-black/30 px-2 py-1.5" data-lore-pet={def.id}>
              <span className="w-[86px] shrink-0 text-[13px] leading-4">
                <span className={anySeen ? 'text-amber-100' : 'text-zinc-500'}>{anySeen ? def.name : '？？？'}</span>
                {def.rare && anySeen && <span className="block text-[12px] text-sky-200">めったに会えない</span>}
              </span>
              <div className="grid min-w-0 flex-1 grid-cols-4 gap-1">
                {def.colors.map((c) => {
                  const mark = markOf(`${def.id}:${c.id}`, pets);
                  return (
                    <button
                      key={c.id}
                      disabled={mark === 'none'}
                      onClick={() => onDetail({ kind: 'pet', def, color: c.id, mark })}
                      data-lore-cell={mark}
                      className={`relative flex min-h-[54px] flex-col items-center justify-center rounded-md ${mark === 'none' ? 'bg-black/30' : 'btn bg-white/[.05]'}`}
                      aria-label={mark === 'none' ? 'まだ会っていない' : `${def.name}（${c.name}）`}
                    >
                      {mark === 'none' ? (
                        <span className="text-[16px] text-zinc-600">？</span>
                      ) : (
                        <span className={mark === 'seen' ? 'opacity-70' : ''}>
                          <PetToken pet={{ petId: def.id, color: c.id, name: '', love: 0 }} size={30} />
                        </span>
                      )}
                      {mark !== 'none' && c.rarity === 'rare' && <span className="absolute top-0 right-0.5 text-[12px] leading-none" aria-label="珍しい毛色">✨</span>}
                      {mark === 'got' && <span className="absolute bottom-0 left-1 text-[12px] leading-none text-pink-300">♥</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] leading-4 text-zinc-400">♥ = 仲間にした毛色。✨ = 珍しい毛色。</p>
    </>
  );
}

// ---------- ジョブ ----------
function JobsTab({ onDetail }: { onDetail: (d: Detail) => void }) {
  const jobs = useProfile((s) => s.profile.jobs);
  const tiers = ['base', 'mid', 'top', 'special'] as const;
  return (
    <>
      <Progress total={CLASSES.all.length} seen={jobs.seen.length} got={jobs.got.length} gotLabel="なった" />
      {tiers.map((t) => {
        const list = CLASSES.all.filter((c) => (c.tier ?? 'base') === t);
        if (!list.length) return null;
        return (
          <div key={t} className="mb-2">
            <div className="mb-1 font-display text-[14px] text-amber-200">{TIER_NAME[t]}</div>
            <Grid>
              {list.map((c) => {
                const mark = markOf(c.id, jobs);
                return (
                  <Cell key={c.id} mark={mark} label={c.name} onTap={() => onDetail({ kind: 'job', def: c, mark })}>
                    <span className="block h-10 w-10 overflow-hidden rounded-full border-2" style={{ borderColor: c.color }}>
                      <CharacterArt classId={c.id} gender="male" face className="h-full w-full" />
                    </span>
                  </Cell>
                );
              })}
            </Grid>
          </div>
        );
      })}
    </>
  );
}

// ---------- カード ----------
function CardsTab({ onDetail }: { onDetail: (d: Detail) => void }) {
  const cards = useProfile((s) => s.profile.cards);
  const [cat, setCat] = useState<'all' | CardDef['category']>('all');
  const list = useMemo(() => CARDS.all.filter((c) => cat === 'all' || c.category === cat), [cat]);
  return (
    <>
      <Progress total={CARDS.all.length} seen={cards.seen.length} got={cards.got.length} />
      <Filter value={cat} onChange={setCat} options={[['all', 'すべて'], ['physical', CATEGORY_LABEL.physical], ['magic', CATEGORY_LABEL.magic], ['skill', CATEGORY_LABEL.skill]]} />
      <Grid cols={3}>
        {list.map((c) => {
          const mark = markOf(c.id, cards);
          const st = CATEGORY_STYLE[c.category];
          return (
            <Cell key={c.id} mark={mark} label={c.name} onTap={() => onDetail({ kind: 'card', def: c, mark })}>
              <span className="flex h-9 w-9 items-center justify-center rounded-md border-2" style={{ borderColor: RARITY_STYLE[c.rarity ?? 'common'].color, background: 'rgba(0,0,0,.35)' }}>
                <st.Icon size={20} style={{ color: st.glow }} />
              </span>
            </Cell>
          );
        })}
      </Grid>
    </>
  );
}

// ---------- 装備 ----------
const SLOT_LABEL: Record<ItemDef['slot'], string> = { weapon: '武器', armor: '鎧', accessory: '装飾品', consumable: '消耗品' };
function ItemsTab({ onDetail }: { onDetail: (d: Detail) => void }) {
  const items = useProfile((s) => s.profile.items);
  const [slot, setSlot] = useState<ItemDef['slot']>('weapon');
  const list = useMemo(() => ITEMS.all.filter((i) => i.slot === slot), [slot]);
  return (
    <>
      <Progress total={ITEMS.all.length} seen={items.seen.length} got={items.got.length} />
      <Filter value={slot} onChange={setSlot} options={(['weapon', 'armor', 'accessory', 'consumable'] as const).map((s) => [s, SLOT_LABEL[s]])} />
      <Grid>
        {list.map((i) => {
          const mark = markOf(i.id, items);
          return (
            <Cell key={i.id} mark={mark} label={i.name} onTap={() => onDetail({ kind: 'item', def: i, mark })}>
              <ItemIcon item={i} size={38} />
            </Cell>
          );
        })}
      </Grid>
    </>
  );
}

// ---------- 敵 ----------
const RARE_IDS = rareEnemyIds();
const HIDDEN = hiddenBosses();
const SPECIAL = new Set([...RARE_IDS, ...HIDDEN.map((h) => h.enemyId)]);
function EnemiesTab({ onDetail }: { onDetail: (d: Detail) => void }) {
  const enemies = useProfile((s) => s.profile.enemies);
  const sg: SeenGot = useMemo(() => ({ seen: enemies.seen, got: Object.keys(enemies.kills) }), [enemies]);
  const cell = (e: EnemyDef) => {
    const mark = markOf(e.id, sg);
    return (
      <Cell key={e.id} mark={mark} label={e.name} onTap={() => onDetail({ kind: 'enemy', def: e, mark, kills: enemies.kills[e.id] ?? 0 })}>
        <span className="text-[28px] leading-none">{e.icon}</span>
      </Cell>
    );
  };
  const seenRare = RARE_IDS.filter((id) => sg.seen.includes(id)).length;
  const seenHidden = HIDDEN.filter((h) => sg.seen.includes(h.enemyId)).length;
  return (
    <>
      <Progress total={ENEMIES.all.length} seen={sg.seen.length} got={sg.got.length} gotLabel="倒した" />
      {/* Step C ②: めったに会えない敵・隠しボスは、別の節にまとめる（数はデータから） */}
      <section className="mb-3" data-lore-rare>
        <div className="mb-1 font-display text-[15px] text-sky-200">✨めったに会えない敵（{seenRare}/{RARE_IDS.length}）</div>
        <Grid>{RARE_IDS.map((id) => cell(ENEMIES.get(id)))}</Grid>
      </section>
      <section className="mb-3" data-lore-hidden>
        <div className="mb-1 font-display text-[15px] text-amber-200">👑隠しボス（{seenHidden}/{HIDDEN.length}）</div>
        <div className="flex flex-col gap-1.5">
          {HIDDEN.map((h) => {
            const e = ENEMIES.get(h.enemyId), mark = markOf(e.id, sg);
            if (mark !== 'none') return <div key={h.enemyId} className="grid grid-cols-4 gap-1.5">{cell(e)}<div className="col-span-3 flex items-center text-[12px] leading-4 text-zinc-300">{h.scenarioName}・{h.regionName}</div></div>;
            return (
              <div key={h.enemyId} className="flex min-h-[52px] items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-2 py-1.5" data-lore-hidden-hint={h.enemyId}>
                <span className="w-10 shrink-0 text-center text-[22px] text-zinc-600">？</span>
                <span className="min-w-0 flex-1 text-[12px] leading-4">
                  <span className="block text-zinc-500">？？？（{h.scenarioName}）</span>
                  <span className="block text-amber-100/80">{h.hint}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <div className="mb-1 font-display text-[15px] text-zinc-200">そのほかの敵</div>
      <Grid>{ENEMIES.all.filter((e) => !SPECIAL.has(e.id)).map(cell)}</Grid>
    </>
  );
}

// ---------- 記録 ----------
function RecordTab() {
  const p = useProfile((s) => s.profile);
  const kills = Object.values(p.enemies.kills).reduce((a, b) => a + b, 0);
  const rows: [string, number, number][] = [
    ['お供', PETS.all.reduce((n, x) => n + x.colors.length, 0), p.pets.seen.length],
    ['ジョブ', CLASSES.all.length, p.jobs.seen.length],
    ['カード', CARDS.all.length, p.cards.seen.length],
    ['装備', ITEMS.all.length, p.items.seen.length],
    ['敵', ENEMIES.all.length, p.enemies.seen.length],
  ];
  return (
    <div className="flex flex-col gap-3 text-[14px]">
      <div className="panel rounded-lg p-2">
        <div className="mb-1 font-display text-[15px] text-amber-200">冒険の記録</div>
        <div className="flex justify-between"><span>始めた冒険</span><b className="tabular-nums">{p.adventures}回</b></div>
        <div className="flex justify-between"><span>倒した敵</span><b className="tabular-nums">{kills}体</b></div>
      </div>
      <div className="panel rounded-lg p-2" data-lore-scenarios>
        <div className="mb-1 font-display text-[15px] text-amber-200">シナリオ</div>
        {SCENARIOS.all.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 border-b border-white/5 py-1 last:border-0">
            <span className="min-w-0 truncate">{s.name}</span>
            <span className="shrink-0 text-[13px] tabular-nums">
              <span className="text-amber-200">クリア {p.clears[s.id] ?? 0}</span>
              <span className="ml-2 text-zinc-400">全滅 {p.gameovers[s.id] ?? 0}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="panel rounded-lg p-2">
        <div className="mb-1 font-display text-[15px] text-amber-200">図鑑の埋まり具合</div>
        {rows.map(([name, total, seen]) => (
          <div key={name} className="flex items-center gap-2 py-0.5">
            <span className="w-14 shrink-0">{name}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-amber-300" style={{ width: `${total ? Math.round((seen / total) * 100) : 0}%` }} />
            </div>
            <span className="w-[72px] shrink-0 text-right text-[13px] tabular-nums">{seen}/{total}</span>
          </div>
        ))}
      </div>
      <p className="text-[12px] leading-4 text-zinc-400">記録はこの端末だけに保存されます。強さが冒険をまたいで上がることはありません。</p>
    </div>
  );
}

function Filter<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="mb-2 flex gap-1">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} className={`btn min-h-11 flex-1 rounded-md text-[13px] ${v === value ? 'btn-gold' : 'btn-dark'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------- 詳細（下から出る板） ----------
function DetailBody({ d }: { d: Detail }) {
  switch (d.kind) {
    case 'card':
      return (
        <div className="flex gap-3">
          <CardFace card={d.def} width={112} height={172} />
          <div className="min-w-0 flex-1 text-[13px] leading-5">
            <div className="font-display text-[17px] text-amber-100">{d.def.name}</div>
            <div className="mb-1"><Badge mark={d.mark} /></div>
            <div style={{ color: RARITY_STYLE[d.def.rarity ?? 'common'].color }}>{RARITY_NAME[d.def.rarity ?? 'common']}</div>
            <div className="text-zinc-300">{CATEGORY_LABEL[d.def.category]}・コスト{d.def.cost}・{d.def.slots}枠・基礎{d.def.baseChance}%</div>
            {d.def.trait && <div className="mt-1 text-violet-200">《{d.def.trait.name}》{describeAbility(d.def.trait)}</div>}
          </div>
        </div>
      );
    case 'item':
      return (
        <div className="flex gap-3">
          <ItemIcon item={d.def} size={64} />
          <div className="min-w-0 flex-1 text-[13px] leading-5">
            <div className="font-display text-[17px] text-amber-100">{d.def.name}</div>
            <div className="mb-1"><Badge mark={d.mark} /></div>
            <div>
              <span style={{ color: RARITY_STYLE[d.def.rarity].color }}>{RARITY_NAME[d.def.rarity]}</span>
              <span className="text-zinc-300">・{SLOT_LABEL[d.def.slot]}{d.def.weaponType ? `（${WEAPON_TYPES.tryGet(d.def.weaponType)?.name ?? d.def.weaponType}）` : ''}</span>
            </div>
            <div className="mt-1 text-zinc-100">{itemSummary(d.def)}</div>
            {d.def.description && <div className="mt-1 text-zinc-400">{d.def.description}</div>}
          </div>
        </div>
      );
    case 'enemy':
      return (
        <div className="flex gap-3">
          <div className="h-[120px] w-[120px] shrink-0 rounded-lg bg-black/40">
            <EnemyArt defId={d.def.id} className="h-full w-full" />
          </div>
          <div className="min-w-0 flex-1 text-[13px] leading-5">
            <div className="font-display text-[17px] text-amber-100">{d.def.name}</div>
            <div className="mb-1">{d.kills ? <span className="rounded-full bg-emerald-700/60 px-2 py-0.5 text-[12px] text-emerald-100">倒した {d.kills}体</span> : <Badge mark="seen" />}</div>
            <div className="text-zinc-300">HP {d.def.maxHp}（Lv{d.def.baseLevel}の時）</div>
            {!!d.def.weak?.length && <div>弱点: {d.def.weak.map((e) => <span key={e} className="mr-1"><ElementTag id={e} /></span>)}</div>}
            {!!d.def.resist?.length && <div>耐性: {d.def.resist.map((e) => <span key={e} className="mr-1"><ElementTag id={e} /></span>)}</div>}
            {d.def.abilities?.map((a, i) => <div key={i} className="mt-1 text-violet-200">《{a.name}》{describeAbility(a, 'enemy')}</div>)}
          </div>
        </div>
      );
    case 'job':
      return (
        <div className="text-[13px] leading-5">
          <div className="flex items-end gap-2">
            <CharacterArt classId={d.def.id} gender="male" className="h-[120px] w-[90px]" />
            <CharacterArt classId={d.def.id} gender="female" className="h-[120px] w-[90px]" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-[17px] text-amber-100">{d.def.name}</div>
              <div className="mb-1"><Badge mark={d.mark} /></div>
              <div className="text-zinc-300">{TIER_NAME[d.def.tier ?? 'base']}・{d.def.role}</div>
              <div className="text-zinc-300">武器: {[d.def.weaponType, ...(d.def.subWeapons ?? [])].map((w) => WEAPON_TYPES.tryGet(w)?.name ?? w).join('・')}</div>
            </div>
          </div>
          <div className="mt-1 text-violet-200">《{d.def.battleAbility.name}》{describeAbility(d.def.battleAbility)}</div>
          <div className="mt-1 text-sky-200">《{d.def.exploreAbility.name}》{d.def.exploreAbility.description}</div>
          {d.def.requires && <div className="mt-1 text-zinc-400">転職の条件: {d.def.requires.text}</div>}
        </div>
      );
    case 'uchinoko':
      return <UchinokoDetail uid={d.uid} />;
    case 'pet': {
      const col = d.def.colors.find((c) => c.id === d.color) ?? d.def.colors[0];
      return (
        <div className="text-[13px] leading-5">
          <div className="flex items-center gap-3">
            <div className="flex h-[96px] w-[96px] shrink-0 items-center justify-center rounded-full bg-pink-300/10">
              <PetToken pet={{ petId: d.def.id, color: col.id, name: '', love: 0 }} size={80} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[17px] text-amber-100">{d.def.name}</div>
              <div className="text-pink-200">{col.name}{col.rarity === 'rare' ? '（✨珍しい毛色）' : ''}</div>
              <div className="mt-0.5">{d.mark === 'got' ? <span className="rounded-full bg-pink-700/60 px-2 py-0.5 text-[12px] text-pink-100">仲間にした</span> : <Badge mark="seen" />}</div>
            </div>
          </div>
          <div className="mt-2 text-zinc-200">{d.def.description}</div>
          {d.def.abilities.map((a, i) => <div key={i} className="mt-1 text-violet-200">《{a.name}》{describeAbility(a)}</div>)}
        </div>
      );
    }
  }
}

/**
 * inAdventure = 冒険の途中にメニューから開いた（Step C ②）。読むだけ（マイペットの登録・解除もしない）。
 * 「戻る」は画面全体（App）がまとめて受け、useLore の backInBook を呼ぶ（メニューまで一緒に閉じないように）
 */
export function Lorebook({ onClose, inAdventure = false }: { onClose: () => void; inAdventure?: boolean }) {
  const [tab, setTab] = useState<Tab>('pets');
  const [detail, setDetail] = useState<Detail | null>(null);
  const back = () => {
    if (detail) {
      setDetail(null);
      return true;
    }
    onClose();
    return false;
  };
  // Android の「戻る」: 詳細 → 本の順に閉じる（冒険の途中は App が受ける）
  useBackButton(!inAdventure, () => (inAdventure ? false : back()));
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    if (!inAdventure) return;
    useLore.setState({ backInBook: () => void backRef.current() });
    return () => useLore.setState({ backInBook: null });
  }, [inAdventure]);
  return (
    <LoreReadOnly.Provider value={inAdventure}>
    <div className="game-bg safe-pad absolute inset-0 z-50 flex flex-col" data-lorebook={inAdventure ? 'adventure' : 'title'}>
      <div className="flex items-center gap-2 border-b border-amber-300/30 px-3 py-2">
        <BookOpen size={22} className="text-amber-300" />
        <div className="font-display flex-1 text-[20px] text-amber-100">伝承の書</div>
        <button onClick={onClose} className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-full" aria-label="閉じる">
          <X size={20} />
        </button>
      </div>
      <div className="grid grid-cols-6 gap-0.5 px-1 pt-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            data-lore-tab={t.id}
            onClick={() => {
              setTab(t.id);
              setDetail(null);
            }}
            className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-t-lg text-[12px] ${tab === t.id ? 'bg-amber-300/20 text-amber-100' : 'text-zinc-400'}`}
          >
            <t.Icon size={18} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-4">
        {tab === 'pets' && <PetsTab onDetail={setDetail} />}
        {tab === 'jobs' && <JobsTab onDetail={setDetail} />}
        {tab === 'cards' && <CardsTab onDetail={setDetail} />}
        {tab === 'items' && <ItemsTab onDetail={setDetail} />}
        {tab === 'enemies' && <EnemiesTab onDetail={setDetail} />}
        {tab === 'record' && <RecordTab />}
      </div>
      {detail && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/50" onClick={() => setDetail(null)}>
          <div className="panel panel-gold-edge max-h-[72%] overflow-y-auto rounded-t-2xl p-3" onClick={(e) => e.stopPropagation()} data-lore-detail>
            <DetailBody d={detail} />
            <button onClick={() => setDetail(null)} className="btn btn-dark mt-3 min-h-11 w-full rounded-lg text-[14px]">
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
    </LoreReadOnly.Provider>
  );
}
