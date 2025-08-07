/* eslint-disable no-restricted-globals */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import { visit } from "unist-util-visit";
import rehypeHighlight from "rehype-highlight";

function customDirectivesPlugin() {
  return (tree: any) => {
    visit(
      tree,
      ["textDirective", "leafDirective", "containerDirective"],
      (node: any) => {
        const data = node.data || (node.data = {});
        const tagName = node.name;
        data.hName = "div";
        data.hProperties = {
          className: `markdown-directive markdown-directive-${tagName}`,
          "data-directive-name": tagName,
          ...node.attributes,
        };
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
  });

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

    const clonedTree = JSON.parse(JSON.stringify(hastTree));

    visit(clonedTree, ["math", "inlineMath"], (node, index, parent) => {
      const isInline = node.type == "inlineMath";

      node.type = "element";
      if (!renderMath) node.tagName = isInline ? "code" : "pre";

      //@ts-ignore
      node.properties = {
        className: isInline ? ["math-inline"] : ["math", "math-display"],
      };
      //@ts-ignore
      node.children = node.data.hChildren;
    });

    self.postMessage({ hast: clonedTree, requestId });
  } catch (error: any) {
    self.postMessage({ error: error.message, requestId });
  }
};
