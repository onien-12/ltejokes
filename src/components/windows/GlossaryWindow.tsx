import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ClipLoader } from "react-spinners";
import {
  useGlossaryStore,
  GlossaryTerm,
  GlossaryDefinition,
} from "../../store/useGlossaryStore";
import { Icon } from "@iconify-icon/react";
import clsx from "clsx";
import Input from "../utils/Input";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface GlossaryWindowProps {
  initialTerm?: string;
  currentContextGroup?: string;
}

const GlossaryWindow: React.FC<GlossaryWindowProps> = ({
  initialTerm = "",
  currentContextGroup,
}) => {
  const { terms, loading, error, fetchGlossary } = useGlossaryStore();
  const [searchTerm, setSearchTerm] = useState(initialTerm);

  useEffect(() => {
    if (terms.length === 0 && !loading && !error) {
      fetchGlossary();
    }
  }, [terms.length, loading, error, fetchGlossary]);

  const filteredTerms = useMemo(() => {
    if (!searchTerm) {
      return [...terms].sort((a, b) => a.word.localeCompare(b.word));
    }

    const lowerSearchTerm = searchTerm.toLowerCase();

    return terms
      .filter((term) => {
        const matchesWord = term.word.toLowerCase().includes(lowerSearchTerm);
        const matchesDefinition = term.definitions.some((def) =>
          def.text.toLowerCase().includes(lowerSearchTerm)
        );
        return matchesWord || matchesDefinition;
      })
      .sort((a, b) => {
        const aWordLower = a.word.toLowerCase();
        const bWordLower = b.word.toLowerCase();

        const aExact = aWordLower === lowerSearchTerm;
        const bExact = bWordLower === lowerSearchTerm;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStartsWith = aWordLower.startsWith(lowerSearchTerm);
        const bStartsWith = bWordLower.startsWith(lowerSearchTerm);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return aWordLower.localeCompare(bWordLower);
      });
  }, [terms, searchTerm]);

  const renderDefinition = useCallback(
    (term: GlossaryTerm) => {
      let definitionsToDisplay: GlossaryDefinition[] = [];
      let showingSpecificContext = false;
      let fallbackContext = false;

      const definitionMatchesContext = (
        def: GlossaryDefinition,
        targetCtx: string
      ) => {
        return Array.isArray(def.context)
          ? def.context.includes(targetCtx)
          : def.context === targetCtx;
      };

      if (currentContextGroup) {
        const specificDef = term.definitions.find((def) =>
          definitionMatchesContext(def, currentContextGroup)
        );

        if (specificDef) {
          definitionsToDisplay = [specificDef];
          showingSpecificContext = true;
        } else {
          const generalDef = term.definitions.find((def) =>
            definitionMatchesContext(def, "general")
          );
          if (generalDef) {
            definitionsToDisplay = [generalDef];
            fallbackContext = true;
          } else if (term.definitions.length > 0) {
            definitionsToDisplay = [term.definitions[0]];
            fallbackContext = true;
          } else {
            definitionsToDisplay = []; // No definitions at all
          }
        }
      } else {
        definitionsToDisplay = term.definitions;
      }

      if (definitionsToDisplay.length === 0) {
        return <p className="text-gray-500">No definition available.</p>;
      }

      return (
        <div className="space-y-2 ml-3">
          {definitionsToDisplay.map((def, index) => (
            <p
              key={def.context.reduce((acc, next) => acc + next) || index}
              className={clsx(
                "text-gray-300",
                index != definitionsToDisplay.length - 1
                  ? "border-b border-b-neutral-700 pb-1"
                  : ""
              )}
            >
              <div className="w-fit inline">
                <Markdown
                  remarkPlugins={[remarkMath]}
                  //@ts-ignore
                  rehypePlugins={[[rehypeKatex, { trust: true }]]}
                >
                  {def.text}
                </Markdown>
              </div>
              <div className="mt-1 space-x-1">
                {def.context.map((ctx) => (
                  <span
                    key={ctx}
                    className={clsx("px-1 py-0.5 rounded text-xs", {
                      "bg-blue-600/30 text-blue-300":
                        currentContextGroup &&
                        ctx === currentContextGroup &&
                        showingSpecificContext,
                      "bg-yellow-600/30 text-yellow-300":
                        currentContextGroup &&
                        ctx === "general" &&
                        fallbackContext,
                      "bg-gray-600/30 text-gray-300":
                        !currentContextGroup ||
                        (currentContextGroup &&
                          !showingSpecificContext &&
                          !fallbackContext) ||
                        (currentContextGroup && ctx !== currentContextGroup),
                    })}
                  >
                    {ctx}
                  </span>
                ))}
              </div>
            </p>
          ))}
          {currentContextGroup &&
            definitionsToDisplay.length < term.definitions.length && (
              <p className="text-gray-500 text-xs mt-2">
                <Icon
                  icon="material-symbols:info"
                  className="inline-block align-bottom mr-1"
                />
                Showing definition for current context.{" "}
                <span
                  className="underline cursor-pointer"
                  onClick={() => setSearchTerm(term.word)}
                >
                  Click to see all contexts.
                </span>
              </p>
            )}
        </div>
      );
    },
    [currentContextGroup, searchTerm, terms]
  );

  return (
    <div className="flex flex-col h-full bg-[#2a2a2a]/80 rounded-lg shadow-inner text-white select-text">
      <div className="p-4 border-b border-[#444]">
        <Input
          placeholder="Search glossary..."
          value={searchTerm}
          onChange={setSearchTerm}
          type="search"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <ClipLoader color="#fff" />
            <span className="ml-2 text-gray-400">Loading glossary...</span>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : filteredTerms.length === 0 ? (
          <div className="text-gray-500 text-center">
            No results found for "{searchTerm}".
          </div>
        ) : (
          filteredTerms.map((term) => (
            <div
              key={term.word}
              className={clsx(
                "py-3 px-4 rounded-md border border-[#444] bg-[#1e1e1e]/60 hover:bg-[#19191b]/60",
                "transition-all duration-300 hover:shadow-sm",
                "mb-4 last:mb-0",
                "text-left"
              )}
            >
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                <Icon
                  icon="material-symbols:book"
                  className="mr-2 text-gray-400"
                />
                {term.word}
              </h3>
              {renderDefinition(term)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GlossaryWindow;
