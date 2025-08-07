import { create } from "zustand";

export type CustomWindow = {
  id: string;
  name: string;
  window: React.ReactNode;
};

type Module = {
  name: string;
  status: string;
  size: string;
};

export type SystemStore = {
  background: string;
  openWindows: string[];
  networkConnected: boolean;
  modules: Module[];
  customWindows: CustomWindow[];

  setBackground: (background: string) => void;

  openWindow: (window: string) => void;
  closeWindow: (window: string) => void;
  focusWindow: (window: string) => void;

  setNetworkConnected: (connected: boolean) => void;

  addModule: (module: Module) => void;
  setModule: (module: Partial<Module>) => void;
  removeModule: (name: string) => void;

  addCustomWindow: (newWindow: CustomWindow) => void;
  setCustomWindow: (
    updatedWindow: Partial<CustomWindow> & { id: string }
  ) => void;
  removeCustomWindow: (windowId: string) => void;
};

export const useSystemStore = create<SystemStore>((set) => ({
  background: "url(default_wallpaper.avif)",
  openWindows: [],
  networkConnected: true,
  modules: [
    { name: "fs", status: "loaded", size: "312 KB" },
    { name: "uidrw", status: "loaded", size: "441 KB" },
    { name: "network", status: "loaded", size: "230 KB" },
  ],
  customWindows: [],

  setBackground: (background) => set((state) => ({ background: background })),

  openWindow: (window) =>
    set((state) =>
      state.openWindows.includes(window)
        ? state
        : { openWindows: [...state.openWindows, window] }
    ),
  closeWindow: (window) =>
    set((state) => ({
      openWindows: state.openWindows.filter((ow) => ow != window),
    })),
  focusWindow: (window) =>
    set((state) => {
      console.log("focus");
      return {
        openWindows: [
          ...state.openWindows.filter((ow) => ow != window),
          window,
        ],
      };
    }),

  setNetworkConnected: (connected) =>
    set((state) => ({ networkConnected: connected })),

  addModule: (module: Module) =>
    set((state) => ({ modules: [...state.modules, module] })),
  setModule: (module: Partial<Module>) =>
    set((state) => ({
      modules: state.modules.map((m) =>
        m.name == module.name ? { ...m, ...module } : m
      ),
    })),
  removeModule: (name: string) =>
    set((state) => ({ modules: state.modules.filter((m) => m.name != name) })),

  addCustomWindow: (newWindow) =>
    set((state) => {
      if (state.customWindows.some((cw) => cw.id === newWindow.id)) {
        return state;
      }
      return {
        customWindows: [...state.customWindows, newWindow],
        openWindows: [
          ...state.openWindows.filter((ow) => ow !== newWindow.id),
          newWindow.id,
        ],
      };
    }),
  setCustomWindow: (updatedWindow) =>
    set((state) => ({
      customWindows: state.customWindows.map((cw) =>
        cw.id === updatedWindow.id ? { ...cw, ...updatedWindow } : cw
      ),
    })),
  removeCustomWindow: (windowId) =>
    set((state) => ({
      customWindows: state.customWindows.filter((cw) => cw.id !== windowId),
      openWindows: state.openWindows.filter((ow) => ow !== windowId),
    })),
}));
