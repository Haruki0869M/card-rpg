// ===== 冒険の拠点（仮。M3で世界マップに置き換える） =====
import { Backpack, Castle, Coins, Crown, Menu, Shuffle, Swords, Users } from 'lucide-react';
import { BattleBackground } from '../../art';
import { DUNGEONS } from '../../data/dungeons';
import { availableDungeons, chestOdds, totalGold } from '../../engine';
import { LOCAL_PLAYER } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { CHEST_NAME, fmtPct } from '../ui/ChestOdds';
import { HeroMini, RARITY_STYLE, Screen } from '../ui/game';

export function HubScreen() {
  const game = useBattle((s) => s.game)!;
  const dispatchGame = useBattle((s) => s.dispatchGame);
  const openSheet = useBattle((s) => s.openSheet);

  return (
    <Screen>
      <div className="relative h-[190px] shrink-0 overflow-hidden">
        <BattleBackground className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0b0810]" />
        <div className="absolute inset-x-0 top-2 flex items-center gap-2 px-2">
          <div className="panel flex h-9 items-center gap-1 rounded-full px-3 text-[14px] font-bold text-amber-200 tabular-nums">
            <Coins size={16} /> {totalGold(game)}G
          </div>
          <div className="flex-1" />
          <button onClick={() => openSheet('menu')} aria-label="メニュー" className="btn btn-dark flex h-11 w-11 items-center justify-center rounded-lg">
            <Menu size={22} />
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-3 text-center">
          <div className="font-display text-outline text-[26px] text-amber-100">
            <Castle size={22} className="mr-1 inline" />
            冒険の拠点
          </div>
          <div className="text-outline text-[12px] text-zinc-200">ここに戻ると全員のHPとフォーカスが全回復します（世界マップは M3 で追加）</div>
        </div>
      </div>

      <div className="flex shrink-0 gap-1 px-2">
        {game.heroes.map((h) => (
          <HeroMini key={h.id} hero={h} onTap={() => openSheet('party')} />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-2">
        <div className="font-display text-[16px] text-amber-200">行き先を選ぶ</div>
        <div className="mt-1 flex flex-col gap-2">
          {availableDungeons(game).map((id) => {
            const d = DUNGEONS.get(id);
            const cleared = game.clearedDungeons.includes(id);
            const random = !!d.random;
            const r = RARITY_STYLE[d.bossChest];
            return (
              <button
                key={id}
                onClick={() => dispatchGame({ type: 'ENTER_DUNGEON', playerId: LOCAL_PLAYER, dungeonId: id })}
                className="btn panel panel-gold-edge flex items-center gap-3 rounded-xl p-3 text-left"
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2"
                  style={{ borderColor: random ? '#c58bff' : '#5ad08a', background: random ? '#2a1446' : '#0f3a24' }}
                >
                  {random ? <Shuffle size={28} className="text-fuchsia-300" /> : <Swords size={28} className="text-emerald-300" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-display flex items-center gap-1 text-[18px] text-amber-50">
                    {d.name}
                    {cleared && (
                      <span className="flex items-center gap-0.5 rounded-full bg-amber-500/25 px-1.5 text-[12px] text-amber-200">
                        <Crown size={12} />
                        制覇済み
                      </span>
                    )}
                  </span>
                  <span className="block text-[12px] leading-4 text-zinc-300">{d.description}</span>
                  <span className="mt-0.5 block text-[12px] text-zinc-400">
                    敵 Lv{d.baseLevel + (random ? game.clearedDungeons.length : 0)}〜・
                    {random ? '入るたびに形が変わる' : 'シナリオダンジョン'}・最奥の大宝箱：
                    <span style={{ color: r.color }}>{CHEST_NAME[d.bossChest]}</span>（レジェンド{fmtPct(chestOdds(d.bossChest, 0)[3])}）
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 px-3 pt-1 pb-3">
        <button onClick={() => openSheet('party')} className="btn btn-dark flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-bold">
          <Users size={18} className="text-amber-300" /> パーティ・装備
        </button>
        <button onClick={() => openSheet('pouch')} className="btn btn-dark flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-bold">
          <Backpack size={18} className="text-amber-300" /> 道具袋
        </button>
      </div>
    </Screen>
  );
}
