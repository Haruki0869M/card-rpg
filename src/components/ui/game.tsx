// ===== 冒険の画面で共通に使う部品 =====
import {
  CloudFog,
  Crosshair,
  Crown,
  Droplet,
  FlaskConical,
  Footprints,
  Gem,
  Hammer,
  Pill,
  Shield,
  Shirt,
  Sparkle,
  Star,
  Sword,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { CharacterArt } from '../../art';
import { getClass } from '../../data/classes';
import { getItem } from '../../data/items';
import { expToNext, heroFocusMax, heroMaxHp } from '../../engine';
import type { Hero, ItemDef, Rarity, StatId } from '../../types';

export const RARITY_STYLE: Record<Rarity, { name: string; color: string; glow: string; bg: string }> = {
  common: { name: 'コモン', color: '#d8dce6', glow: 'rgba(220,225,235,.35)', bg: 'linear-gradient(160deg,#3a3d46,#1c1d22)' },
  rare: { name: 'レア', color: '#5ab0ff', glow: 'rgba(80,170,255,.55)', bg: 'linear-gradient(160deg,#173a66,#0b1830)' },
  epic: { name: 'エピック', color: '#c58bff', glow: 'rgba(190,120,255,.6)', bg: 'linear-gradient(160deg,#3d1c66,#170a2c)' },
  legend: { name: 'レジェンド', color: '#ffcf4a', glow: 'rgba(255,200,70,.7)', bg: 'linear-gradient(160deg,#5a3a08,#22140a)' },
};

export const STAT_LABEL: Record<StatId, string> = { str: '力', vit: '体力', int: '知力', per: '感知', dex: '器用', agi: '素早さ', luk: '運' };

const ITEM_ICON: Record<string, LucideIcon> = {
  sword: Sword,
  staff: WandSparkles,
  hammer: Hammer,
  bow: Crosshair,
  armor: Shield,
  robe: Shirt,
  charm: Sparkle,
  ring: Gem,
  amulet: Gem,
  crest: Crown,
  boots: Footprints,
  potion: FlaskConical,
  ether: Droplet,
  antidote: Pill,
  smoke: CloudFog,
};

/** アイテムのアイコン（レア度の色の枠と光） */
export function ItemIcon({ item, size = 44 }: { item: ItemDef; size?: number }) {
  const r = RARITY_STYLE[item.rarity];
  const Icon = ITEM_ICON[item.icon] ?? Star;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-lg border-2"
      style={{ width: size, height: size, borderColor: r.color, background: r.bg, boxShadow: `0 0 10px ${r.glow}, inset 0 1px 0 rgba(255,255,255,.15)` }}
    >
      <Icon size={size * 0.56} strokeWidth={2.2} style={{ color: r.color }} />
    </span>
  );
}

/** 装備・消費アイテムの効果の短い説明 */
export function itemSummary(item: ItemDef): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(item.stats ?? {})) if (v) parts.push(`${STAT_LABEL[k as StatId]}+${v}`);
  if (item.maxHp) parts.push(`最大HP+${item.maxHp}`);
  if (item.focusMax) parts.push(`フォーカス最大+${item.focusMax}`);
  if (item.startBlock) parts.push(`開始時ブロック${item.startBlock}`);
  if (item.extraDraw) parts.push(`毎ターン+${item.extraDraw}枚`);
  for (const c of item.cards ?? []) parts.push(`カード追加×${c.count}`);
  if (item.use) parts.push(item.description);
  return parts.join('・') || item.description;
}

export const itemDef = (itemId: string) => getItem(itemId);

/** キャラの顔（丸） */
export function HeroFace({ hero, size = 40, dim }: { hero: Pick<Hero, 'classId' | 'gender'>; size?: number; dim?: boolean }) {
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full border-2 bg-[#1d2440] ${dim ? 'grayscale' : ''}`}
      style={{ width: size, height: size, borderColor: getClass(hero.classId).color }}
    >
      <CharacterArt classId={hero.classId} gender={hero.gender} face className="h-full w-full" />
    </span>
  );
}

/** 横長のバー（HP・経験値など） */
export function Bar({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  const r = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <div className="w-full overflow-hidden rounded-full border border-black/70 bg-black/60" style={{ height }}>
      <div className="h-full w-full origin-left transition-transform duration-500" style={{ transform: `scaleX(${r})`, background: color }} />
    </div>
  );
}

/** キャラの小さな状態（拠点・ダンジョン用） */
export function HeroMini({ hero, onTap }: { hero: Hero; onTap?: () => void }) {
  const maxHp = heroMaxHp(hero);
  return (
    <button onClick={onTap} className="btn panel flex min-w-0 flex-1 flex-col gap-1 rounded-lg p-1 text-left">
      <div className="flex items-center gap-1">
        <HeroFace hero={hero} size={28} dim={hero.hp <= 0} />
        <div className="min-w-0 leading-[13px]">
          <div className="truncate text-[12px] font-bold">{hero.name}</div>
          <div className="text-[12px] text-amber-300">Lv{hero.level}</div>
        </div>
      </div>
      <div className="text-[12px] leading-none text-zinc-300 tabular-nums">
        HP {hero.hp}/{maxHp}
      </div>
      <Bar value={hero.hp} max={maxHp} color="linear-gradient(90deg,#22b45a,#7dffa8)" height={6} />
      <div className="flex items-center justify-between text-[12px] leading-none tabular-nums">
        <span className="flex items-center gap-px text-amber-300">
          <Star size={12} className="fill-amber-400/70" />
          {hero.focus}/{heroFocusMax(hero)}
        </span>
      </div>
      <Bar value={hero.exp} max={expToNext(hero.level)} color="linear-gradient(90deg,#8a6aff,#c8b0ff)" height={4} />
    </button>
  );
}

/** 画面全体の枠（背景・余白） */
export function Screen({ children }: { children: ReactNode }) {
  return <div className="game-bg safe-pad relative flex h-full w-full max-w-[480px] flex-col overflow-hidden">{children}</div>;
}

/** 見出し（重厚な文字＋飾り線） */
export function Heading({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="px-3 pt-2 text-center">
      <div className="font-display text-outline text-[22px] leading-7 text-amber-100">{children}</div>
      {sub && <div className="text-[12px] text-zinc-400">{sub}</div>}
      <div className="mx-auto mt-1 h-px w-2/3 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
    </div>
  );
}
