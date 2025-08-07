import { create } from "zustand";

type UIOptionsStore = {
  optimizeUI: boolean;
  renderMath: boolean;

  setOptimizeUI: (optimize: boolean) => void;
  setRenderMath: (option: boolean) => void;
};

export const useUIOptionsStore = create<UIOptionsStore>((set) => ({
  optimizeUI: false,
  renderMath: true,

  setOptimizeUI: (optimize) => set((state) => ({ optimizeUI: optimize })),
  setRenderMath: (option) => set((state) => ({ renderMath: option })),
}));
