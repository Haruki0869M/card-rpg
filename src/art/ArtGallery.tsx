// アートの一覧（確認用ページ: URL の末尾に #art）
import '@fontsource/zen-antique/400.css';
import { CLASSES } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import { RARITY_NAME } from '../data/terms';
import type { Rarity } from '../types';
import { BattleBackground, CharacterArt, ChestImage, EnemyArt, ItemImage } from './index';

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legend'];
const ICONS = ['sword', 'staff', 'hammer', 'bow', 'armor', 'robe', 'ring', 'amulet', 'charm', 'crest', 'boots', 'potion', 'ether', 'antidote', 'smoke'];

function H({ children }: { children: React.ReactNode }) {
  return <h1 className="font-display mt-4 mb-2 text-[20px] text-amber-200">{children}</h1>;
}

export default function ArtGallery() {
  return (
    <div className="overflow-auto bg-[#0b0910] p-3 text-zinc-100" style={{ position: 'fixed', inset: 0 }}>
      <H>味方（職業 × 性別）</H>
      <div className="grid grid-cols-4 gap-2">
        {CLASSES.all.flatMap((c) =>
          (['male', 'female'] as const).map((g) => (
            <div key={c.id + g} className="rounded-lg bg-gradient-to-b from-[#24345a] to-[#0c0f1c] p-1 text-center">
              <CharacterArt classId={c.id} gender={g} className="mx-auto block h-[190px] w-full" />
              <div className="text-[13px] font-bold">
                {c.name}（{g === 'male' ? '男' : '女'}）
              </div>
            </div>
          )),
        )}
      </div>
      <H>武器のレア度で見た目が変わる（戦士）</H>
      <div className="grid grid-cols-4 gap-2">
        {RARITIES.map((r) => (
          <div key={r} className="rounded-lg bg-gradient-to-b from-[#24345a] to-[#0c0f1c] p-1 text-center">
            <CharacterArt classId="warrior" gender="male" weapon={r} className="mx-auto block h-[170px] w-full" />
            <div className="text-[13px] font-bold">{RARITY_NAME[r]}</div>
          </div>
        ))}
      </div>
      <H>敵（ボスは形態ごと）</H>
      <div className="grid grid-cols-4 gap-2">
        {ENEMIES.all.flatMap((e) =>
          Array.from({ length: 1 + (e.phases?.length ?? 0) }, (_, ph) => (
            <div key={e.id + ph} className="rounded-lg bg-gradient-to-b from-[#3a1030] to-[#0c0609] p-1 text-center">
              <EnemyArt defId={e.id} phase={ph} className="mx-auto block h-[170px] w-full" />
              <div className="text-[13px] font-bold">{ph ? e.phases![ph - 1].name : e.name}</div>
            </div>
          )),
        )}
        <div className="rounded-lg bg-gradient-to-b from-[#3a1030] to-[#0c0609] p-1 text-center">
          <EnemyArt defId="unknown" className="mx-auto block h-[170px] w-full" />
          <div className="text-[13px] font-bold">絵が未作成の敵</div>
        </div>
      </div>
      <H>背景</H>
      <div className="grid grid-cols-3 gap-2">
        {['plains', 'forest', 'temple', 'swamp', 'volcano', 'castle'].map((k) => (
          <div key={k} className="h-[150px] overflow-hidden rounded-lg">
            <BattleBackground kind={k} className="h-full w-full" />
          </div>
        ))}
      </div>
      <H>宝箱（閉じた姿 / 開いた姿）</H>
      <div className="grid grid-cols-4 gap-2">
        {RARITIES.map((r) => (
          <div key={r} className="rounded-lg bg-black/40 p-1 text-center">
            <ChestImage rarity={r} className="mx-auto block h-[80px] w-full" />
            <ChestImage rarity={r} open className="mx-auto block h-[80px] w-full" />
            <div className="text-[13px] font-bold">{RARITY_NAME[r]}</div>
          </div>
        ))}
      </div>
      <H>アイテム（レア度ごとの光）</H>
      <div className="grid grid-cols-8 gap-1">
        {ICONS.flatMap((icon) =>
          (['common', 'legend'] as Rarity[]).map((r) => (
            <div key={icon + r} className="rounded-md bg-black/40 p-0.5">
              <ItemImage icon={icon} rarity={r} className="block h-[64px] w-full" />
            </div>
          )),
        )}
      </div>
    </div>
  );
}
