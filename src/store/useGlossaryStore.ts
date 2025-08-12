import { create } from "zustand";
import { readFile } from "../utils";

export interface GlossaryDefinition {
  context: string[];
  text: string;
}

export interface GlossaryTerm {
  word: string;
  definitions: GlossaryDefinition[];
}

interface GlossaryState {
  terms: GlossaryTerm[];
  loading: boolean;
  error: string | null;
  fetchGlossary: () => Promise<void>;
}

export const useGlossaryStore = create<GlossaryState>((set) => ({
  terms: [],
  loading: false,
  error: null,
  fetchGlossary: async () => {
    set({ loading: true, error: null });
    try {
      const response = await readFile("/system/glossary.json").catch(
        () => null
      );
      if (!response) {
        throw new Error(`Failed to fetch glossary:`);
      }
      const dec = new TextDecoder();
      const data = JSON.parse(dec.decode(response));
      if (!Array.isArray(data.glossary)) {
        throw new Error(
          "Invalid glossary data format from API: expected an array"
        );
      }
      set({ terms: data.glossary, loading: false });
    } catch (err: any) {
      console.error("Error fetching glossary:", err);
      set({ error: err.message || "Failed to load glossary", loading: false });
    }
  },
}));
