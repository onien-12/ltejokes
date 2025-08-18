import { create } from "zustand";
import { readFile } from "../utils";

export interface ProtocolElement {
  name: string;
  type?: string;
  description?: string;
  elements?: ProtocolElement[];
  optional?: boolean;
}

export interface ProtocolDefinition {
  name: string;
  elements: ProtocolElement[];
}

interface ProtocolsState {
  protocols: ProtocolDefinition[];
  loading: boolean;
  error: string | null;
  fetchProtocols: () => Promise<void>;
}

export const useProtocolsStore = create<ProtocolsState>((set) => ({
  protocols: [],
  loading: false,
  error: null,
  fetchProtocols: async () => {
    set({ loading: true, error: null });
    try {
      const response = await readFile("/system/protocols.json").catch(() => null);
      if (!response) {
        throw new Error(`Failed to fetch protocols`);
      }

      const data = JSON.parse(new TextDecoder().decode(response));
      if (!Array.isArray(data.protocols)) {
        throw new Error("Invalid protocol data format from API.");
      }
      set({ protocols: data.protocols, loading: false });
    } catch (err: any) {
      console.error("Error fetching protocols:", err);
      set({ error: err.message || "Failed to load protocols", loading: false });
    }
  },
}));
