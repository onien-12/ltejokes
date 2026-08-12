import { create } from "zustand";
import { isPayloadRejection } from "../components/windows/apps/Vpn/api";

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

// Bumped by hardReset so a re-download cannot be served from cache.
let scriptCacheBuster = 0;

type FingerprintStore = {
  status: FingerprintStatus;
  booted: boolean;
  pow: PowProgress | null;

  boot: () => void;
  take: (force?: boolean) => Promise<string | null>;
  refresh: () => void;
  hardReset: () => Promise<void>;
  attempt: <T>(send: (payload: string) => Promise<T>) => Promise<T>;
  solveHashPow: (digest: string, difficulty: number) => Promise<{ solution: number }>;
  solveAesPow: (puzzle: unknown) => Promise<{ result: any }>;
};

function loadScript(src: string): Promise<void> {
  const url = scriptCacheBuster ? `${src}?r=${scriptCacheBuster}` : src;
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) return resolve();
    const el = document.createElement("script");
    el.src = url;
    el.dataset.fpAsset = "1";
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`failed to load ${url}`));
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

  take: async (force = false) => {
    get().boot();
    let nfp: Nfp;
    try {
      nfp = await ensureScripts();
    } catch {
      set({ status: "failed" });
      return null;
    }

    // age() is Infinity while the first payload is still being computed, so
    // testing it alone would throw away work in progress.
    const status = nfp.status();
    if (force || status === "failed" || (status === "ready" && nfp.age() > FP_MAX_AGE_MS)) nfp.fresh();
    return nfp.get();
  },

  refresh: () => {
    window.__nfp__?.fresh();
  },

  /**
   * Throws away the loaded antifraud code and fetches it again.
   *
   * refresh() only re-runs the payload builder against the bundle already in
   * memory, which cannot help when that memory is the problem. Re-executing
   * bundle.js publishes a fresh set of builder keys — the closest thing to a
   * page reload without actually reloading.
   */
  hardReset: async () => {
    document.querySelectorAll("script[data-fp-asset]").forEach((el) => el.remove());
    delete window.__nfp__;
    // Cache-busted, so a corrupted or truncated copy is not simply reused.
    scriptCacheBuster = Date.now();
    set({ booted: false, status: "loading" });
    try {
      const nfp = await ensureScripts();
      nfp.onStatus((status) => set({ status }));
      nfp.start();
    } catch {
      set({ status: "failed" });
    }
  },

  /**
   * Sends a request that needs a fingerprint, escalating if the server says the
   * payload itself was unusable: reuse, then re-acquire, then re-download the
   * antifraud code entirely.
   *
   * Without this a bad payload sticks in the cache and every retry fails
   * identically until the page is reloaded by hand — which is exactly what was
   * happening in production.
   */
  attempt: async (send) => {
    let lastError: unknown = new Error("fingerprint unavailable");

    for (const stage of ["cached", "fresh", "reload"] as const) {
      if (stage === "reload") await get().hardReset();

      const payload = await get().take(stage !== "cached");
      if (!payload) continue;

      try {
        return await send(payload);
      } catch (e) {
        // "Looks like a bot" is a verdict, not a glitch; retrying repeats it.
        if (!isPayloadRejection(e)) throw e;
        lastError = e;
      }
    }
    throw lastError;
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
