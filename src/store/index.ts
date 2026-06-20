import { create } from 'zustand';
import type { Photographer } from '@shared/types';
import { api } from '@/api/client';

interface AppState {
  photographers: Photographer[];
  loading: boolean;
  error: string | null;
  fetchPhotographers: () => Promise<void>;
  getPhotographerName: (id: string) => string;
}

export const useAppStore = create<AppState>((set, get) => ({
  photographers: [],
  loading: false,
  error: null,
  fetchPhotographers: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getPhotographers();
      set({ photographers: data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '获取摄影师列表失败', loading: false });
    }
  },
  getPhotographerName: (id: string) => {
    const photographer = get().photographers.find((p) => p.id === id);
    return photographer?.name || '未分配';
  },
}));
