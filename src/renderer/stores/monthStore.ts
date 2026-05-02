import { create } from 'zustand';
import { currentYearMonth } from '@renderer/lib/date';

interface MonthState {
  year: number;
  month: number;
  set: (year: number, month: number) => void;
  goPrev: () => void;
  goNext: () => void;
  goToday: () => void;
}

export const useMonthStore = create<MonthState>((set) => ({
  ...currentYearMonth(),
  set: (year, month) => set({ year, month }),
  goPrev: () =>
    set((s) => (s.month === 1 ? { year: s.year - 1, month: 12 } : { year: s.year, month: s.month - 1 })),
  goNext: () =>
    set((s) => (s.month === 12 ? { year: s.year + 1, month: 1 } : { year: s.year, month: s.month + 1 })),
  goToday: () => set(currentYearMonth()),
}));
