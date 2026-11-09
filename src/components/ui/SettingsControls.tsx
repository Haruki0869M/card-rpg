import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { playSound } from '../../audio/player';
import type { SoundId } from '../../audio/ids';
import { useBattle } from '../../store/battleStore';
import type { Settings } from '../../store/settings';
import { guideWanted } from '../../store/help';
import { useProfile } from '../../store/profileStore';

/** 音量（0〜10。0 = オフ）。押すたびに1つずつ変える（スマホで押しやすいように） */
function VolumeRow({ label, field, sample }: { label: string; field: 'sfxVolume' | 'bgmVolume' | 'petVolume'; sample?: SoundId }) {
  const value = useBattle(s => s.settings[field]), set = useBattle(s => s.setSettings);
  const change = (v: number) => {
    const next = Math.max(0, Math.min(10, v));
    set({ [field]: next } as Partial<Settings>);
    if (sample && next > 0) playSound(sample);
  };
  const step = 'btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg disabled:opacity-40';
  return <div role="group" aria-label={`${label}の音量`}>
    <div className="mb-1 text-[14px] font-bold">{label}</div>
    <div className="flex items-center gap-2">
      <button data-sfx="none" aria-label={`${label}を小さく`} disabled={value <= 0} onClick={() => change(value - 1)} className={step}><Minus size={18} /></button>
      <div className="flex h-11 min-w-0 flex-1 items-center gap-[3px] rounded-lg border border-white/20 bg-black/30 px-2" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => <span key={i} className={`h-4 flex-1 rounded-sm ${i < value ? 'bg-amber-400' : 'bg-white/15'}`} />)}
      </div>
      <span className="w-10 shrink-0 text-center text-[14px] font-bold" data-volume={field}>{value > 0 ? value : 'オフ'}</span>
      <button data-sfx="none" aria-label={`${label}を大きく`} disabled={value >= 10} onClick={() => change(value + 1)} className={step}><Plus size={18} /></button>
    </div>
  </div>;
}

/** 振動の ON/OFF と「振動を試す」（0.2秒）。振動の設定が OFF でも試せる。押した操作の中で呼ぶ（ブラウザは押した時だけ振動を許す） */
function VibrationRow() {
  const vibration = useBattle(s => s.settings.vibration), set = useBattle(s => s.setSettings);
  const [note, setNote] = useState<string | null>(null);
  const test = () => {
    let ok = false;
    try {
      ok = typeof navigator.vibrate === 'function' && navigator.vibrate(200) !== false;
    } catch {
      ok = false;
    }
    setNote(ok ? null : 'この端末では振動が使えません');
  };
  return <div>
    <div className="flex gap-2">
      <button aria-pressed={vibration} onClick={() => set({ vibration: !vibration })} className="btn btn-dark flex min-h-11 flex-1 items-center justify-between rounded-lg px-3 text-[14px]"><span>振動</span><span>{vibration ? 'ON' : 'OFF'}</span></button>
      <button onClick={test} className="btn btn-dark min-h-11 shrink-0 rounded-lg px-3 text-[14px]" data-vibration-test>振動を試す</button>
    </div>
    {note && <p className="mt-1 text-[12px] text-zinc-300" role="status" data-vibration-note>{note}</p>}
  </div>;
}

/** タイトルと冒険中で同じ設定を使う。値はこの端末だけに保存する。 */
export function SettingsControls() {
  const settings = useBattle(s => s.settings), set = useBattle(s => s.setSettings);
  const won = useProfile(s => s.profile.battles.length);
  const guide = guideWanted(settings, won);
  const choice = 'btn min-h-11 flex-1 rounded-lg border px-2 text-[14px] font-bold';
  return <div className="flex flex-col gap-3" data-settings-controls>
    <div role="group" aria-label="移動・戦闘アニメ速度">
      <div className="mb-1 text-[14px] font-bold">移動・戦闘アニメ速度</div>
      <div className="flex gap-2">{([false, true] as const).map(fast => <button key={String(fast)} aria-pressed={settings.fastMode === fast} onClick={() => set({ fastMode: fast })} className={`${choice} ${settings.fastMode === fast ? 'border-amber-300 bg-amber-500/20 text-amber-100' : 'border-white/20 bg-black/30'}`}>{fast ? '高速' : '通常'}</button>)}</div>
      <p className="mt-1 text-[12px] text-zinc-300">高速は2倍速。宝箱・報酬の演出にも適用します</p>
    </div>
    <div role="group" aria-label="お供・能力カットイン">
      <div className="mb-1 text-[14px] font-bold">お供・能力カットイン</div>
      <div className="flex gap-2">{(['standard', 'simple'] as const).map(mode => <button key={mode} aria-pressed={settings.cutinMode === mode} onClick={() => set({ cutinMode: mode })} className={`${choice} ${settings.cutinMode === mode ? 'border-amber-300 bg-amber-500/20 text-amber-100' : 'border-white/20 bg-black/30'}`}>{mode === 'standard' ? '標準' : '簡易'}</button>)}</div>
      <p className="mt-1 text-[12px] text-zinc-300">簡易は動きを抑え、能力名と数値を短く表示します</p>
    </div>
    <VolumeRow label="効果音" field="sfxVolume" sample="sfx_ui_ok" />
    <VolumeRow label="お供の鳴き声" field="petVolume" sample="pet_okame" />
    <VolumeRow label="BGM" field="bgmVolume" />
    <p className="-mt-2 text-[12px] text-zinc-300">iPhone はマナーモードだと鳴りません</p>
    <VibrationRow />
    <div>
      <button aria-pressed={guide} onClick={() => set({ firstGuide: !guide })} className="btn btn-dark flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-[14px]" data-setting-first-guide><span>はじめての案内</span><span>{guide ? 'ON' : 'OFF'}</span></button>
      <p className="mt-1 text-[12px] text-zinc-300">ONにすると、次の戦闘で操作の案内（3つ）をもう一度出します</p>
    </div>
  </div>;
}
