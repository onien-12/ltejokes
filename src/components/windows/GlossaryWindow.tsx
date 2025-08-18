import React, { useEffect, useState, useMemo, useCallback, JSX, useRef } from "react";
import { ClipLoader } from "react-spinners";
import { useGlossaryStore, GlossaryTerm, GlossaryDefinition } from "../../store/useGlossaryStore";
import { Icon } from "@iconify-icon/react";
import clsx from "clsx";
import Input from "../utils/Input";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { ProtocolDefinition, ProtocolElement, useProtocolsStore } from "../../store/useProtocolsStore";
import { useVirtualizer } from "@tanstack/react-virtual";
import RenderIfVisible from "../utils/RenderIfVisible";

interface GlossaryWindowProps {
  initialTerm?: string;
  currentContextGroup?: string;
  initialTab?: "glossary" | "protocols";
}

const ProtocolElementRenderer: React.FC<{
  element: ProtocolElement;
  level?: number;
  searchTermLower?: string;
}> = ({ element, level = 0, searchTermLower = "" }) => {
  const termSegments = searchTermLower.split(".");
  const matches = (segs: string[], where?: string) => where && segs.find((s) => where.toLowerCase().includes(s));

  const isMatch =
    searchTermLower &&
    (matches(termSegments, element.name) ||
      matches(termSegments, element?.type) ||
      matches(termSegments, element?.description));
  const showDescription = element.description && (!searchTermLower || isMatch);

  const Tag = (level === 0 ? "h3" : level === 1 ? "h4" : level === 2 ? "h5" : "div") as keyof JSX.IntrinsicElements;
  const paddingLeft = level * 16;

  const Optimize = useMemo(
    () =>
      ({ children }: { children: React.ReactNode }) =>
        level == 2 ? <RenderIfVisible>{children}</RenderIfVisible> : <>{children}</>,
    [searchTermLower]
  );

  const DefinitionMarkdownRenderer: React.FC<{ markdown: string }> = React.memo(({ markdown }) => {
    const markdownComponents = {
      p: ({ node, ...props }: any) => (
        <p {...props} className="mt-0 mb-0">
          {props.children}
        </p>
      ),
    };
    return (
      <div className="markdown-definition-content text-sm text-gray-300">
        <Markdown
          remarkPlugins={[remarkMath]}
          //@ts-ignore
          rehypePlugins={[[rehypeKatex, { trust: true }]]}
          components={markdownComponents}
        >
          {markdown}
        </Markdown>
      </div>
    );
  });

  return (
    <div
      className={clsx(
        "py-2 px-3 rounded-md",
        "border border-transparent",
        "transition-colors",
        "hover:border-white/10",
        { "bg-white/5": isMatch && searchTermLower },
        {
          "border-white/5 bg-black/20 mt-2":
            showDescription || (element.elements && element.elements.length > 0 && level > 0),
        }
      )}
      style={{ marginLeft: `${paddingLeft}px` }}
    >
      <Optimize>
        <Tag
          className={clsx("flex items-center font-semibold", {
            "text-lg text-white": level === 0,
            "text-base text-white/90": level === 1,
            "text-sm text-white/80": level >= 2,
          })}
        >
          {level === 0 && <Icon icon="material-symbols:folder" className="mx-2 text-gray-400" />}
          {level === 1 && <Icon icon="material-symbols:insert-page-break" className="mr-2 text-gray-500" />}
          {level >= 2 && <Icon icon="material-symbols:chevron-right" className="mr-1 text-gray-600" />}
          <span className={clsx({ "text-blue-400 font-bold": isMatch })}>{element.name}</span>
          {element.type && <span className="ml-2 text-gray-500 font-normal text-xs">{element.type}</span>}
          {element.optional && (
            <span className="ml-2 text-gray-300 font-normal text-xs p-1 bg-gray-800 rounded-md">optional</span>
          )}
        </Tag>

        {showDescription && (
          <div className="mt-1 ml-6 text-gray-400 text-sm">
            <DefinitionMarkdownRenderer markdown={element.description!} />
          </div>
        )}

        {element.elements &&
          element.elements.map((childElement) => (
            <ProtocolElementRenderer
              key={childElement.name}
              element={childElement}
              level={level + 1}
              searchTermLower={searchTermLower}
            />
          ))}
      </Optimize>
    </div>
  );
};

const GlossaryWindow: React.FC<GlossaryWindowProps> = ({
  initialTerm = "",
  currentContextGroup,
  initialTab = "glossary",
}) => {
  const { terms, loading: glossaryLoading, error: glossaryError, fetchGlossary } = useGlossaryStore();
  const { protocols, loading: protocolsLoading, error: protocolsError, fetchProtocols } = useProtocolsStore();
  const [searchTerm, setSearchTerm] = useState(initialTerm);
  const [selectedTab, setSelectedTab] = useState(initialTab);

  const glossaryParentRef = useRef<HTMLDivElement>(null);
  const protocolsParentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedTab === "glossary" && terms.length === 0 && !glossaryLoading && !glossaryError) {
      fetchGlossary();
    }
    if (selectedTab === "protocols" && protocols.length === 0 && !protocolsLoading && !protocolsError) {
      fetchProtocols();
    }
  }, [
    selectedTab,
    terms.length,
    glossaryLoading,
    glossaryError,
    fetchGlossary,
    protocols.length,
    protocolsLoading,
    protocolsError,
    fetchProtocols,
  ]);

  const filteredTerms = useMemo(() => {
    if (!searchTerm) {
      return [...terms].sort((a, b) => a.word.localeCompare(b.word));
    }

    const lowerSearchTerm = searchTerm.toLowerCase();

    return terms
      .filter((term) => {
        const matchesWord = term.word.toLowerCase().includes(lowerSearchTerm);
        const matchesDefinition = term.definitions.some((def) => def.text.toLowerCase().includes(lowerSearchTerm));
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

  const renderGlossaryDefinition = useCallback(
    (term: GlossaryTerm) => {
      let definitionsToDisplay: GlossaryDefinition[] = [];
      let showingSpecificContext = false;
      let fallbackContext = false;

      const definitionMatchesContext = (def: GlossaryDefinition, targetCtx: string) => {
        return Array.isArray(def.context) ? def.context.includes(targetCtx) : def.context === targetCtx;
      };

      if (currentContextGroup) {
        const specificDef = term.definitions.find((def) => definitionMatchesContext(def, currentContextGroup));

        if (specificDef) {
          definitionsToDisplay = [specificDef];
          showingSpecificContext = true;
        } else {
          const generalDef = term.definitions.find((def) => definitionMatchesContext(def, "general"));
          if (generalDef) {
            definitionsToDisplay = [generalDef];
            fallbackContext = true;
          } else if (term.definitions.length > 0) {
            definitionsToDisplay = [term.definitions[0]];
            fallbackContext = true;
          } else {
            definitionsToDisplay = [];
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
                index != definitionsToDisplay.length - 1 ? "border-b border-b-neutral-700 pb-1" : ""
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
                        currentContextGroup && ctx === currentContextGroup && showingSpecificContext,
                      "bg-yellow-600/30 text-yellow-300": currentContextGroup && ctx === "general" && fallbackContext,
                      "bg-gray-600/30 text-gray-300":
                        !currentContextGroup ||
                        (currentContextGroup && !showingSpecificContext && !fallbackContext) ||
                        (currentContextGroup && ctx !== currentContextGroup),
                    })}
                  >
                    {ctx}
                  </span>
                ))}
              </div>
            </p>
          ))}
          {currentContextGroup && definitionsToDisplay.length < term.definitions.length && (
            <p className="text-gray-500 text-xs mt-2">
              <Icon icon="material-symbols:info" className="inline-block align-bottom mr-1" />
              Showing definition for current context.{" "}
              <span className="underline cursor-pointer" onClick={() => setSearchTerm(term.word)}>
                Click to see all contexts.
              </span>
            </p>
          )}
        </div>
      );
    },
    [currentContextGroup, searchTerm, terms]
  );

  const filteredProtocols = useMemo(() => {
    if (!searchTerm) {
      return [...protocols].sort((a, b) => a.name.localeCompare(b.name));
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    const searchPathSegments = lowerSearchTerm.split(".").filter(Boolean);

    const matches: ProtocolDefinition[] = [];

    const searchElements = (
      elements: ProtocolElement[],
      pathIndex: number,
      currentProtocolPath: string[]
    ): ProtocolElement[] => {
      const foundElements: ProtocolElement[] = [];

      if (pathIndex >= searchPathSegments.length) {
        elements.forEach((el) => {
          const nameMatches = el.name.toLowerCase().includes(lowerSearchTerm);
          const typeMatches = el.type?.toLowerCase().includes(lowerSearchTerm);
          const descriptionMatches = el.description?.toLowerCase().includes(lowerSearchTerm);

          if (nameMatches || typeMatches || descriptionMatches) {
            foundElements.push(el);
          }
          if (el.elements) {
            foundElements.push(...searchElements(el.elements, pathIndex, [...currentProtocolPath, el.name]));
          }
        });
        return foundElements;
      }

      const currentSearchSegment = searchPathSegments[pathIndex];

      elements.forEach((el) => {
        const elNameLower = el.name.toLowerCase();

        const segmentMatches = elNameLower === currentSearchSegment || elNameLower.includes(currentSearchSegment);

        if (segmentMatches) {
          if (pathIndex === searchPathSegments.length - 1) {
            foundElements.push(el);
          }

          const nameOverallMatches = el.name.toLowerCase().includes(lowerSearchTerm);
          const typeOverallMatches = el.type?.toLowerCase().includes(lowerSearchTerm);
          const descriptionOverallMatches = el.description?.toLowerCase().includes(lowerSearchTerm);

          if (nameOverallMatches || typeOverallMatches || descriptionOverallMatches) {
            if (!foundElements.includes(el)) {
              foundElements.push(el);
            }
          }
        }

        if (el.elements) {
          foundElements.push(
            ...searchElements(el.elements, pathIndex + (segmentMatches ? 1 : 0), [...currentProtocolPath, el.name])
          );
        }
      });
      return foundElements;
    };

    protocols.forEach((protocol) => {
      const protocolNameMatches = protocol.name.toLowerCase().includes(lowerSearchTerm);
      let foundInElements = false;

      const elementsFound = searchElements(protocol.elements, 0, [protocol.name]);
      if (elementsFound.length > 0) {
        foundInElements = true;
      }

      if (protocolNameMatches || foundInElements) {
        matches.push(protocol);
      }
    });

    return matches.sort((a, b) => a.name.localeCompare(b.name));
  }, [protocols, searchTerm]);

  const glossaryRowVirtualizer = useVirtualizer({
    count: filteredTerms.length,
    getScrollElement: () => glossaryParentRef.current,
    estimateSize: useCallback(() => 150, []),
    overscan: 5,
    gap: 12,
  });
  const glossaryVirtualRows = glossaryRowVirtualizer.getVirtualItems();

  return (
    <div className="flex flex-col h-full bg-[#111111]/80 text-white scrollable select-text">
      <div className="flex p-2 border-b border-[#444]">
        <button
          onClick={() => setSelectedTab("glossary")}
          className={clsx(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
            selectedTab === "glossary" ? "bg-blue-600/50 text-white" : "text-gray-400 hover:bg-[#3a3a3a]"
          )}
        >
          Glossary
        </button>
        <button
          onClick={() => setSelectedTab("protocols")}
          className={clsx(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
            selectedTab === "protocols" ? "bg-blue-600/50 text-white" : "text-gray-400 hover:bg-[#3a3a3a]"
          )}
        >
          Protocols
        </button>
      </div>

      <div className="p-4 border-b border-[#444]">
        <Input
          placeholder={selectedTab === "glossary" ? "Search glossary..." : "Search protocols..."}
          value={searchTerm}
          onChange={setSearchTerm}
          type="search"
          className="bg-[#111111]/70"
        />
      </div>

      <div
        ref={glossaryParentRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      >
        {selectedTab === "glossary" &&
          (glossaryLoading ? (
            <div className="flex justify-center items-center h-full">
              <ClipLoader color="#fff" />
              <span className="ml-2 text-gray-400">Loading glossary...</span>
            </div>
          ) : glossaryError ? (
            <div className="text-red-500 text-center">{glossaryError}</div>
          ) : filteredTerms.length === 0 ? (
            <div className="text-gray-500 text-center">No results found for "{searchTerm}".</div>
          ) : (
            <div
              style={{
                height: glossaryRowVirtualizer.getTotalSize(),
                width: "100%",
                position: "relative",
              }}
            >
              {glossaryVirtualRows.map((row) => {
                const term = filteredTerms[row.index];
                return (
                  <div
                    key={row.key}
                    ref={glossaryRowVirtualizer.measureElement}
                    data-index={row.index}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${row.start}px)`,
                    }}
                    className={clsx(
                      "py-3 px-4 rounded-md border border-[#444] bg-[#0e0e0e]/50 hover:bg-[#111111]/50 transition-colors duration-200",
                      "mb-4 last:mb-0",
                      "text-left mb-2"
                    )}
                  >
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                      <Icon icon="material-symbols:book" className="mr-2 text-gray-400" />
                      {term.word}
                    </h3>
                    {renderGlossaryDefinition(term)}{" "}
                  </div>
                );
              })}
            </div>
          ))}

        {selectedTab === "protocols" &&
          (protocolsLoading ? (
            <div className="flex justify-center items-center h-full">
              <ClipLoader color="#fff" />
              <span className="ml-2 text-gray-400">Loading protocols...</span>
            </div>
          ) : protocolsError ? (
            <div className="text-red-500 text-center">{protocolsError}</div>
          ) : filteredProtocols.length === 0 ? (
            <div className="text-gray-500 text-center">No results found for "{searchTerm}".</div>
          ) : (
            <>
              <b className="text-red-500">Not ready yet at all!</b>
              {filteredProtocols.map((protocol) => (
                <div
                  key={protocol.name}
                  className="py-3 px-4 rounded-md border border-[#444] bg-[#0e0e0e]/50 hover:bg-[#111111]/50 
                           transition-colors duration-200 
                           mb-4 last:mb-0 text-left"
                >
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
                    <Icon icon="material-symbols:code" className="mr-2 text-gray-400" />
                    {protocol.name}
                  </h3>
                  {protocol.elements.map((element) => (
                    <ProtocolElementRenderer
                      key={element.name}
                      element={element}
                      level={0}
                      searchTermLower={searchTerm.toLowerCase()}
                    />
                  ))}
                </div>
              ))}
            </>
          ))}
      </div>
    </div>
  );
};

export default GlossaryWindow;
