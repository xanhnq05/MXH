import { create } from "zustand";

export interface LightboxAction {
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "danger";
  onClick: () => void | Promise<void>;
}

interface LightboxState {
  open: boolean;
  /** "image" = lightbox đơn ảnh với menu; "gallery" = nhiều ảnh prev/next */
  mode: "image" | "gallery";
  images: string[];
  index: number;
  title?: string;
  actions: LightboxAction[];
  show: (images: string[], index?: number) => void;
  /** Mở lightbox 1 ảnh với menu actions (dùng cho avatar/cover profile) */
  showImage: (url: string, opts?: { title?: string; actions?: LightboxAction[] }) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

export const useLightbox = create<LightboxState>((set) => ({
  open: false,
  mode: "gallery",
  images: [],
  index: 0,
  title: undefined,
  actions: [],
  show: (images, index = 0) =>
    set({ open: true, mode: "gallery", images, index, title: undefined, actions: [] }),
  showImage: (url, opts) =>
    set({
      open: true,
      mode: "image",
      images: [url],
      index: 0,
      title: opts?.title,
      actions: opts?.actions || [],
    }),
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
