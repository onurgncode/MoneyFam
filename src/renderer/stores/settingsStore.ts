import { create } from 'zustand';
import { toast } from './toastStore';

interface SettingsState {
  savings_target_pct: number;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  loaded: boolean;
  load: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  savings_target_pct: 0.2,
  currency: 'TRY',
  theme: 'light',
  loaded: false,
  load: async () => {
    const result = await window.api.settings.getAll();
    if (!result.ok) {
      toast('error', `Ayarlar yüklenemedi: ${result.error}`);
      return;
    }
    const map = new Map(result.data.map((r) => [r.key, r.value]));
    set({
      savings_target_pct: Number(map.get('savings_target_pct') ?? '0.20'),
      currency: map.get('currency') ?? 'TRY',
      theme: (map.get('theme') as 'light' | 'dark' | 'system') ?? 'light',
      loaded: true,
    });
  },
}));
