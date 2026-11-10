import { beforeEach, describe, expect, it } from 'vitest';
import { GLOSSARY, HELP_TOPICS, topicOf, type HelpTopicId } from '../components/help/helpTopics';
import { GUIDE_TEXT, guideWanted, nextGuideStep, useHelp } from './help';
import { normalizeSettings } from './settings';

describe('遊び方・用語集の中身', () => {
  it('頼まれた項目が全部そろっていて、IDが重ならない', () => {
    const want: HelpTopicId[] = ['flow', 'world', 'town', 'dungeon', 'battle', 'focus', 'lives', 'corruption', 'jobs', 'equipment', 'pets', 'coop', 'lorebook'];
    const ids = HELP_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of want) expect(topicOf(id), id).toBeTruthy();
  });

  it('文章に数値の書き間違い（undefined・NaN）や空の段落が無い', () => {
    const texts = [...HELP_TOPICS.flatMap((t) => [t.title, ...t.body]), ...GLOSSARY.flatMap((g) => [g.term, g.text])];
    for (const s of texts) {
      expect(s.trim().length).toBeGreaterThan(0);
      expect(s).not.toMatch(/undefined|NaN|null/);
    }
  });

  it('扉の予兆の5色・先読み・周囲の警戒・技を磨くを説明している', () => {
    const d = topicOf('dungeon')!.body.join('');
    for (const w of ['赤＝魔物の群れ', '紫＝強敵の棲処', '金＝宝物庫', '緑＝焚き火の休憩所', '青＝未知の出来事', '先読み', '周囲の警戒', '技を磨く', '手番が1回終わります']) expect(d).toContain(w);
  });

  it('用語集の行き先の項目がある', () => {
    for (const g of GLOSSARY) if (g.topic) expect(topicOf(g.topic), g.term).toBeTruthy();
  });
});

describe('遊び方の開け閉め（戻る）', () => {
  beforeEach(() => useHelp.getState().close());

  it('目次から項目を開いたら、戻るで目次 → もう一度で閉じる', () => {
    useHelp.getState().openHelp();
    useHelp.setState({ topic: 'battle', direct: false });
    useHelp.getState().back();
    expect(useHelp.getState()).toMatchObject({ open: true, topic: null });
    useHelp.getState().back();
    expect(useHelp.getState().open).toBe(false);
  });

  it('上のバーから項目を直接開いたら、戻る1回で元の画面へ', () => {
    useHelp.getState().openHelp('lives');
    expect(useHelp.getState()).toMatchObject({ open: true, topic: 'lives', direct: true });
    useHelp.getState().back();
    expect(useHelp.getState().open).toBe(false);
  });
});

describe('はじめての戦闘の案内', () => {
  it('設定が無ければ、戦闘に勝ったことが無い端末だけに出す', () => {
    expect(guideWanted({}, 0)).toBe(true);
    expect(guideWanted({}, 3)).toBe(false);
    expect(guideWanted({ firstGuide: false }, 0)).toBe(false);
    expect(guideWanted({ firstGuide: true }, 9)).toBe(true);
  });

  it('① → カードを選ぶと② → 1枚使うと③。③からは戻らない', () => {
    expect(nextGuideStep(1, { selecting: false, played: false })).toBe(1);
    expect(nextGuideStep(1, { selecting: true, played: false })).toBe(2);
    expect(nextGuideStep(2, { selecting: false, played: false })).toBe(1);
    expect(nextGuideStep(2, { selecting: false, played: true })).toBe(3);
    expect(nextGuideStep(3, { selecting: true, played: false })).toBe(3);
  });

  it('案内の文は指示どおり', () => {
    expect(GUIDE_TEXT[1]).toBe('手札のカードをタップし、狙う敵を選んで『発動』を押そう！（長押しで詳しい効果も見られます）');
    expect(GUIDE_TEXT[2]).toBe('技の威力はスロットの成功数で決まる！『＋』で★フォーカスを使うと、1枠が必ず成功するぞ');
    expect(GUIDE_TEXT[3]).toBe('同じターンに別の仲間が同じ敵を攻撃すると『連携＋20%』！マナを使い切ったら右下の『ターン終了』へ');
  });

  it('設定の「はじめての案内」は、決めた値だけ保存し、古い設定には足さない', () => {
    expect(normalizeSettings({ firstGuide: false }).firstGuide).toBe(false);
    expect(normalizeSettings({ firstGuide: true }).firstGuide).toBe(true);
    expect('firstGuide' in normalizeSettings({ fastMode: true })).toBe(false);
    expect('firstGuide' in normalizeSettings({ firstGuide: 'yes' })).toBe(false);
  });
});
