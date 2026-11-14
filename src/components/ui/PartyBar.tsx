// ===== ダンジョンの下の帯: パーティ（顔と細いHP）と、装備・道具（と撤退）のボタンを1行に =====
// 扉を選ぶ画面（DungeonScreen）とイベントの画面（EventScreen）で同じ部品を使う（見た目をそろえる）
import { Backpack, Users, type LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { heroMaxHp } from '../../engine';
import { useBattle } from '../../store/battleStore';
import type { Hero } from '../../types';
import { Bar, HeroFace } from './game';
import { PetToken } from './PetToken';

/** 帯の右に並べるボタン（名前・アイコン・アイコンの色・押した時） */
export type PartyBarButton = readonly [label: string, Icon: LucideIcon, color: string, onClick: () => void];

export function PartyBar({ heroes, extra = [], style }: { heroes: Hero[]; /** 装備・道具の後ろに足すボタン（撤退など） */ extra?: readonly PartyBarButton[]; style?: CSSProperties }) {
  const openSheet = useBattle((s) => s.openSheet);
  const buttons: readonly PartyBarButton[] = [
    ['装備', Users, 'text-amber-300', () => openSheet('party')],
    ['道具', Backpack, 'text-amber-300', () => openSheet('pouch')],
    ...extra,
  ];
  return (
    <div className="flex shrink-0 items-center gap-1 px-2 pt-1.5 pb-3" style={style} data-dungeon-bar>
      <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
        {heroes.map((h) => (
          <button key={h.id} onClick={() => openSheet('party')} aria-label={`${h.name} HP${h.hp}/${heroMaxHp(h)}`} className="btn relative flex h-11 w-11 shrink-0 flex-col items-center justify-center">
            <HeroFace hero={h} size={30} dim={h.hp <= 0} />
            <span className="mt-[2px] block w-[32px]">
              <Bar value={h.hp} max={heroMaxHp(h)} color="linear-gradient(90deg,#22b45a,#7dffa8)" height={4} />
            </span>
            {/* 並びの欄は横にスクロールするので、はみ出すと上が切れる（ステップ1）。ボタンの内側の右上に置く */}
            {h.pet && (
              <span className="absolute top-0 right-0" data-party-pet>
                <PetToken ownerId={h.id} pet={h.pet} size={14} />
              </span>
            )}
          </button>
        ))}
      </div>
      {buttons.map(([label, Icon, color, on]) => (
        <button key={label} onClick={on} className="btn btn-dark flex h-12 w-[52px] shrink-0 flex-col items-center justify-center rounded-xl text-[12px] leading-4 font-bold" data-bar-button={label}>
          <Icon size={17} className={color} />
          {label}
        </button>
      ))}
    </div>
  );
}
