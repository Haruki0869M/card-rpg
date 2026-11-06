// ===== データ一覧（確認用ページ: URL の末尾に #data） =====
// 職業・敵・カード・装備・状態異常・ルールの数値を、データからそのまま表にする（バランス調整用）。
import { useState } from 'react';
import { BALANCE } from '../data/balance';
import { CARDS } from '../data/cards';
import { CLASSES } from '../data/classes';
import { contentVersion } from '../data/contentVersion';
import { DUNGEONS } from '../data/dungeons';
import { ELEMENTS, getElement } from '../data/elements';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { DIFFICULTIES, describeDifficulty, ROOM_TYPES, WEAPON_TYPES } from '../data/rules';
import { SCENARIOS } from '../data/scenarios';
import { STATUSES } from '../data/statuses';
import { CATEGORY_LABEL, RARITY_NAME, STAT_LABEL } from '../data/terms';
import { RARITY_COLOR } from '../data/theme';
import { affinityFromStats, describeAbility, describeEffect, describeStatus, enemyLevelFactors } from '../engine';
import type { Rarity, StatId } from '../types';
import { itemSummary } from './ui/game';
import { tierRange } from './format';

const STATS = Object.keys(STAT_LABEL) as StatId[];
const scenarioName = (id?: string) => (id ? (SCENARIOS.tryGet(id)?.name ?? id) : '共通');
const TABS = ['職業', '敵', 'カード', '装備', '状態異常', 'ルール'] as const;
type Tab = (typeof TABS)[number];

const Rar = ({ r }: { r?: Rarity }) => <span style={{ color: RARITY_COLOR[r ?? 'common'].color }}>{RARITY_NAME[r ?? 'common']}</span>;

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-max min-w-full border-collapse text-[12px]">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="sticky top-0 border-b border-amber-300/40 bg-[#1a1420] px-1.5 py-1 text-left whitespace-nowrap text-amber-200">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white/[.03]">
              {r.map((c, j) => (
                <td key={j} className="border-b border-white/5 px-1.5 py-1 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClassesTab() {
  return (
    <Table
      head={['職業', 'HP', '+HP/Lv', ...STATS.map((s) => STAT_LABEL[s]), '適性(物/魔/ス)', '武器', '初期デッキ', '戦闘の特殊能力']}
      rows={CLASSES.all.map((c) => {
        const a = affinityFromStats(c.stats);
        return [
          <b>{c.name}</b>,
          c.baseMaxHp,
          c.hpPerLevel,
          ...STATS.map((s) => c.stats[s]),
          `${a.physical}/${a.magic}/${a.skill}`,
          WEAPON_TYPES.tryGet(c.weaponType)?.name ?? c.weaponType,
          `${c.deck.reduce((n, d) => n + d.count, 0)}枚`,
          <span>
            《{c.battleAbility.name}》{describeAbility(c.battleAbility)}
          </span>,
        ];
      })}
    />
  );
}

function EnemiesTab() {
  const lv = [0, 2, 4];
  return (
    <Table
      head={['敵', 'シナリオ', '基準Lv', ...lv.map((d) => `HP(+${d}Lv)`), ...lv.map((d) => `攻撃×(+${d}Lv)`), '経験値', 'G', '弱点', '耐性', '行動', '決め方']}
      rows={ENEMIES.all.map((e) => [
        <b>{e.name}</b>,
        scenarioName(ENEMIES.scenarioOf(e.id)),
        e.baseLevel,
        ...lv.map((d) => Math.floor(e.maxHp * enemyLevelFactors(e, e.baseLevel + d).hp)),
        ...lv.map((d) => enemyLevelFactors(e, e.baseLevel + d).attack.toFixed(2)),
        e.exp,
        e.gold,
        (e.weak ?? []).map((x) => getElement(x).name).join('・'),
        (e.resist ?? []).map((x) => getElement(x).name).join('・'),
        <span>
          {[...e.actions, ...(e.phases ?? []).flatMap((p) => p.actions)].map((a) => (
            <div key={a.id}>
              {a.name}：{a.effects.map((x) => describeEffect(x, 'enemy')).join('、')}
            </div>
          ))}
          {(e.abilities ?? []).map((ab) => (
            <div key={ab.name} className="text-fuchsia-200">
              《{ab.name}》{describeAbility(ab, 'enemy')}
            </div>
          ))}
        </span>,
        e.pattern,
      ])}
    />
  );
}

function CardsTab() {
  return (
    <Table
      head={['カード', '格', '種類', 'コスト', '枠', '基礎%', '効果（成功数ごと）', '特殊能力']}
      rows={CARDS.all.map((c) => [
        <b>{c.name}</b>,
        <Rar r={c.rarity} />,
        CATEGORY_LABEL[c.category],
        c.cost,
        c.slots,
        c.baseChance,
        <span>
          {c.tiers.map((t, i) => (
            <div key={i}>
              {tierRange(c, i)}：{t.effects.map((e) => describeEffect(e, 'ally', c)).join('、')}
            </div>
          ))}
        </span>,
        c.trait ? `《${c.trait.name}》${describeAbility(c.trait)}` : '',
      ])}
    />
  );
}

function ItemsTab() {
  return (
    <Table
      head={['アイテム', '格', '欄', '武器の種類', '効果']}
      rows={ITEMS.all.map((i) => [<b>{i.name}</b>, <Rar r={i.rarity} />, i.slot, i.weaponType ? (WEAPON_TYPES.tryGet(i.weaponType)?.name ?? i.weaponType) : '', itemSummary(i)])}
    />
  );
}

function StatusesTab() {
  return (
    <div className="flex flex-col gap-3">
      <Table
        head={['属性', '与える状態異常', '確率', '量']}
        rows={ELEMENTS.all.map((e) => [<b style={{ color: e.color }}>{e.name}</b>, e.status ? STATUSES.get(e.status).name : '', e.status ? `${e.chance ?? 0}%（完全成功なら必ず）` : '', e.status ? (e.amount ?? 1) : ''])}
      />
      <Table
      head={['状態異常', '悪い効果', '説明']}
      rows={STATUSES.all.map((s) => [
        <b style={{ color: s.color }}>{s.name}</b>,
        s.harmful ? '○' : '',
        describeStatus(s),
      ])}
      />
    </div>
  );
}

function RulesTab() {
  return (
    <div className="flex flex-col gap-3">
      <Table head={['難易度', '内容']} rows={DIFFICULTIES.all.map((d) => [<b>{d.name}</b>, describeDifficulty(d)])} />
      <Table
        head={['部屋', '動き', '敵Lv加算', 'カード報酬', 'ドロップ', '自動生成の重み']}
        rows={ROOM_TYPES.all.map((r) => [
          <b style={{ color: r.color }}>{r.name}</b>,
          r.behavior,
          r.battle?.levelBonus ?? '',
          r.battle ? (BALANCE.cardRewardOdds[r.battle.cardOdds] ?? []).join(' / ') : '',
          r.battle?.equipmentDrop ? `装備（エピック${r.battle.equipmentDrop.epicChance}%）` : r.battle?.consumableDrop ? `消費アイテム${r.battle.consumableDrop.chance}%` : r.battle?.boss ? '大宝箱' : '',
          r.layoutWeight ?? 0,
        ])}
      />
      <Table
        head={['ダンジョン', 'シナリオ', '基準Lv', '大宝箱', '形']}
        rows={DUNGEONS.all.map((d) => [<b>{d.name}</b>, scenarioName(DUNGEONS.scenarioOf(d.id)), d.baseLevel, <Rar r={d.bossChest} />, d.random ? 'ランダム' : '固定'])}
      />
      <Table head={['シナリオ', '遊べる', '開始の持ち物']} rows={SCENARIOS.all.map((s) => [<b>{s.name}</b>, s.unlocked ? '○' : '', (s.start.pouch ?? []).map((p) => `${ITEMS.get(p.itemId).name}×${p.count}`).join('、')])} />
    </div>
  );
}

export default function DataCatalog() {
  const [tab, setTab] = useState<Tab>('職業');
  return (
    <div className="flex flex-col bg-[#0b0910] text-zinc-100" style={{ position: 'fixed', inset: 0 }}>
      <div className="shrink-0 border-b border-amber-300/30 px-3 pt-2">
        <div className="font-display text-[18px] text-amber-200">データ一覧</div>
        <div className="text-[12px] text-zinc-400">コンテンツの版 {contentVersion()}・数値は src/content と src/data/balance.ts で変える</div>
        <div className="mt-1 flex gap-1 overflow-x-auto pb-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`btn h-11 shrink-0 rounded-lg px-3 text-[13px] font-bold ${tab === t ? 'btn-gold' : 'btn-dark'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {tab === '職業' && <ClassesTab />}
        {tab === '敵' && <EnemiesTab />}
        {tab === 'カード' && <CardsTab />}
        {tab === '装備' && <ItemsTab />}
        {tab === '状態異常' && <StatusesTab />}
        {tab === 'ルール' && <RulesTab />}
      </div>
    </div>
  );
}
