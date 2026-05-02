import { create } from 'zustand';
import type { Person } from '@shared/types';
import { toast } from './toastStore';

interface PersonsState {
  items: Person[];
  loaded: boolean;
  load: () => Promise<void>;
}

export const usePersonsStore = create<PersonsState>((set) => ({
  items: [],
  loaded: false,
  load: async () => {
    const result = await window.api.persons.list();
    if (!result.ok) {
      toast('error', `Kişiler yüklenemedi: ${result.error}`);
      return;
    }
    set({ items: result.data, loaded: true });
  },
}));
