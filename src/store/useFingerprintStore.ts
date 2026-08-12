import { create } from "zustand";

export type FingerprintStatus = "idle" | "loading" | "ready" | "failed";

export type PowProgress = {
  progress: number;
  max: number;
  seconds: number;
  unit: string;
};

type Nfp = {
  start: () => void;
  fresh: () => void;
  get: () => Promise<string | null>;
  status: () => FingerprintStatus;
  age: () => number;
  onStatus: (cb: (s: FingerprintStatus) => void) => () => void;
  pow: (
    kind: "aes" | "hash",
    message: unknown,
    onProgress?: (p: { progress: number; max: number; seconds: number }) => void,
  ) => Promise<any>;
};

declare global {
  interface Window {
    __nfp__?: Nfp;
    __nfp_base__?: string;
  }
}

export const VPN_ASSETS = (process.env.REACT_APP_VPN_API_URL || "/api/vpn").replace(/\/+$/, "");

const FP_MAX_AGE_MS = 300_000;

const SCRIPTS = [`${VPN_ASSETS}/output/bundle.js`, `${VPN_ASSETS}/fp.js`];

type FingerprintStore = {
  status: FingerprintStatus;
  booted: boolean;
  pow: PowProgress | null;

  boot: () => void;
  take: () => Promise<string | null>;
  refresh: () => void;
  solveHashPow: (digest: string, difficulty: number) => Promise<{ solution: number }>;
  solveAesPow: (puzzle: unknown) => Promise<{ result: any }>;
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(el);
  });
}

async function ensureScripts(): Promise<Nfp> {
  if (window.__nfp__) return window.__nfp__;
  window.__nfp_base__ = `${VPN_ASSETS}/`;
  for (const src of SCRIPTS) await loadScript(src);
  if (!window.__nfp__) throw new Error("fingerprint module did not initialise");
  return window.__nfp__;
}

export const useFingerprintStore = create<FingerprintStore>((set, get) => ({
  status: "idle",
  booted: false,
  pow: null,

  boot: () => {
    if (get().booted) return;
    set({ booted: true, status: "loading" });

    ensureScripts()
      .then((nfp) => {
        nfp.onStatus((status) => set({ status }));
        nfp.start();
      })
      .catch(() => set({ status: "failed" }));
  },

  take: async () => {
    get().boot();
    let nfp: Nfp;
    try {
      nfp = await ensureScripts();
    } catch {
      set({ status: "failed" });
      return null;
    }

    const status = nfp.status();
    if (status === "failed" || (status === "ready" && nfp.age() > FP_MAX_AGE_MS)) nfp.fresh();
    return nfp.get();
  },

  refresh: () => {
    window.__nfp__?.fresh();
  },

  solveHashPow: async (digest, difficulty) => {
    const nfp = await ensureScripts();
    const onProgress = (p: { progress: number; max: number; seconds: number }) =>
      set({ pow: { ...p, unit: "hashes" } });
    set({ pow: { progress: 0, max: 1, seconds: 0, unit: "hashes" } });
    try {
      return await nfp.pow("hash", { digest, difficulty }, onProgress);
    } finally {
      set({ pow: null });
    }
  },

  solveAesPow: async (puzzle) => {
    const nfp = await ensureScripts();
    const onProgress = (p: { progress: number; max: number; seconds: number }) => set({ pow: { ...p, unit: "keys" } });
    set({ pow: { progress: 0, max: 1, seconds: 0, unit: "keys" } });
    try {
      return await nfp.pow("aes", puzzle, onProgress);
    } finally {
      set({ pow: null });
    }
  },
}));
