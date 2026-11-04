// アートの一覧（確認用ページ: URL の末尾に #art）
import { CLASSES } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import '@fontsource/zen-antique/400.css';
import { PlainsBackground } from './backgrounds/Plains';
import { CharacterArt, EnemyArt } from './index';

export default function ArtGallery() {
  return (
    <div className="min-h-dvh overflow-auto bg-[#0b0910] p-3 text-zinc-100" style={{ position: 'fixed', inset: 0 }}>
      <h1 className="mb-2 text-[18px] font-black text-amber-200">味方（職業 × 性別）</h1>
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
        <div className="rounded-lg bg-gradient-to-b from-[#24345a] to-[#0c0f1c] p-1 text-center">
          <CharacterArt classId="unknown" gender="male" className="mx-auto block h-[190px] w-full" />
          <div className="text-[13px] font-bold">絵が未作成の職業</div>
        </div>
      </div>
      <h1 className="mt-4 mb-2 text-[18px] font-black text-red-300">敵</h1>
      <div className="grid grid-cols-4 gap-2">
        {ENEMIES.all.map((e) => (
          <div key={e.id} className="rounded-lg bg-gradient-to-b from-[#3a1030] to-[#0c0609] p-1 text-center">
            <EnemyArt defId={e.id} className="mx-auto block h-[190px] w-full" />
            <div className="text-[13px] font-bold">{e.name}</div>
          </div>
        ))}
        <div className="rounded-lg bg-gradient-to-b from-[#3a1030] to-[#0c0609] p-1 text-center">
          <EnemyArt defId="unknown" className="mx-auto block h-[190px] w-full" />
          <div className="text-[13px] font-bold">絵が未作成の敵</div>
        </div>
      </div>
      <h1 className="mt-4 mb-2 text-[18px] font-black text-amber-200">戦場のイメージ（背景＋配置。画面の作り込みはステップ3）</h1>
      <div className="relative mx-auto h-[300px] w-[390px] overflow-hidden rounded-xl border border-amber-500/40">
        <PlainsBackground className="absolute inset-0 h-full w-full" />
        <EnemyArt defId="goblinBrute" className="absolute top-[10px] left-[200px] h-[130px] w-[110px]" />
        <EnemyArt defId="chaosShaman" className="absolute top-[18px] left-[285px] h-[118px] w-[100px]" />
        <EnemyArt defId="goblinScout" className="absolute top-[70px] left-[130px] h-[110px] w-[95px]" />
        <CharacterArt classId="warrior" gender="male" className="absolute top-[150px] left-[20px] h-[140px] w-[105px]" />
        <CharacterArt classId="mage" gender="female" className="absolute top-[160px] left-[110px] h-[130px] w-[95px]" />
      </div>
      <h1 className="mt-4 mb-2 text-[18px] font-black text-amber-200">見出しフォント</h1>
      <div className="flex flex-col gap-2">
        {[
          ['Zen Antique（採用）', "'Zen Antique'"],
        ].map(([label, family]) => (
          <div key={label} className="rounded-lg border border-amber-500/30 bg-gradient-to-b from-[#2a2030] to-[#120c16] px-3 py-2">
            <div className="text-[12px] text-zinc-400">{label}</div>
            <div style={{ fontFamily: family, fontWeight: family.includes('Shippori') ? 800 : 400 }} className="text-[28px] leading-tight text-amber-100">
              勝利！ ターン終了 侵食の魔王
            </div>
            <div style={{ fontFamily: family, fontWeight: family.includes('Shippori') ? 800 : 400 }} className="text-[18px] text-zinc-200">
              ヘビースイング　完全成功！ 26 DMG
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
