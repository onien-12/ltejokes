/* eslint-disable no-restricted-globals */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import { visit } from "unist-util-visit";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import { VFile } from "vfile";
import rehypeHighlight from "rehype-highlight";

function customDirectivesPlugin() {
  return (tree: any) => {
    visit(
      tree,
      ["textDirective", "leafDirective", "containerDirective"],
      (node: any) => {
        const data = node.data || (node.data = {});
        const tagName = node.name;

        if (tagName === "fs-image") {
          data.hName = "div";
          data.hProperties = {
            className: ["custom-fs-image", "markdown-directive"],
            "data-directive-name": tagName,
            "data-path": node.attributes.path,
            "data-name": node.attributes.name || "",
            "data-alt": node.attributes.alt || node.value || "",
            "data-width": node.attributes.width || "",
            "data-height": node.attributes.height || "",
            "data-max-width": node.attributes.maxWidth || "",
            "data-max-height": node.attributes.maxHeight || "",
            "data-color": node.attributes.color || "",
            ...node.attributes,
          };
          if (node.value) {
            data.hChildren = [{ type: "text", value: node.value }];
          }

          if (node.children) {
            data.hChildren = node.children;
          } else if (node.value) {
            data.hChildren = [{ type: "text", value: node.value }];
          }
        } else if (tagName === "glossary") {
          data.hName = "span";
          data.hProperties = {
            className: ["markdown-glossary-term"],
            "data-directive-name": tagName,
          };
          if (node.children) {
            data.hChildren = node.children;
          } else if (node.value) {
            data.hChildren = [{ type: "text", value: node.value }];
          }
        } else {
          data.hName = "div";
          data.hProperties = {
            className: `markdown-directive markdown-directive-${tagName}`,
            "data-directive-name": tagName,
            ...node.attributes,
          };
        }
      }
    );
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkGfm)
  .use(remarkDirective)
  //@ts-ignore
  .use(customDirectivesPlugin)
  //@ts-ignore
  .use(remarkRehype, {
    allowDangerousHtml: true,
    passThrough: ["html", "math", "inlineMath"],
  })

self.onmessage = async (
  event: MessageEvent<{
    markdown: string;
    renderMath: boolean;
    requestId: number;
  }>
) => {
  const { markdown, renderMath, requestId } = event.data;

  try {
    let currentProcessor = processor;

    const tree = currentProcessor.parse(markdown);
    const hastTree = await currentProcessor.run(tree);

    let clonedTree = JSON.parse(JSON.stringify(hastTree));

    visit(clonedTree, ["math", "inlineMath"], (node, index, parent) => {
      const isInline = node.type == "inlineMath";

      node.type = "element";
      if (!renderMath) node.tagName = isInline ? "code" : "pre";
      else node.tagName = isInline ? "span" : "div";

      //@ts-ignore
      node.properties = {
        className: isInline ? ["math-inline"] : ["math", "math-display"],
      };
      //@ts-ignore
      node.children = node.data.hChildren;
    });

    const file = new VFile("")

    clonedTree = rehypeRaw()(clonedTree, file)
    if (renderMath) rehypeKatex({ trust: true })(clonedTree, file);
    rehypeHighlight()(clonedTree, file);

    self.postMessage({ hast: clonedTree, requestId });
  } catch (error: any) {
    self.postMessage({ error: error.message, requestId });
  }
};
