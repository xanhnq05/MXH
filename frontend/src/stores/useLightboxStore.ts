import { create } from "zustand";

interface LightboxState {
  images: string[];
  index: number;
  open: boolean;
  show: (images: string[], index: number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

export const useLightbox = create<LightboxState>((set) => ({
  images: [],
  index: 0,
  open: false,
  show: (images, index) => set({ images, index, open: true }),
  close: () => set({ open: false }),
  next: () =>
    set((s) => ({
      index: (s.index + 1) % Math.max(s.images.length, 1),
    })),
  prev: () =>
    set((s) => ({
      index: (s.index - 1 + Math.max(s.images.length, 1)) % Math.max(s.images.length, 1),
    })),
}));
