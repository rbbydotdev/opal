import { Root as MdastRootNode } from "mdast"; // Import Root from mdast
import remarkParse from "remark-parse";
import { Processor, unified } from "unified";

// Define MDastTree as the MDAST Root node or null (if not parsed yet)
// This aligns with your initialization: `private mdastTree: MDastTree = null;`
type MDastTree = MdastRootNode | null;

export class MarkdownDoc {
  private _content: string;
  private mdastTree: MDastTree = null;
  private lazyEval: boolean;
  private readonly processor: Processor<MdastRootNode>; // Store the unified processor

  constructor(content: string, { lazyEval = false }: { lazyEval?: boolean } = {}) {
    this._content = content;
    this.lazyEval = lazyEval;
    this.processor = unified().use(remarkParse);

    if (!this.lazyEval) {
      // If not lazy, parse immediately
      this.mdastTree = this.internalParse();
    }
    // If lazy, mdastTree remains null until `tree` is accessed
  }

  // Helper method to perform the parsing
  private internalParse(): MdastRootNode {
    // unified().parse() returns a Node. For remark-parse, this Node is specifically a Root.
    return this.processor.parse(this._content) as MdastRootNode;
  }

  get content(): string {
    return this._content;
  }

  set content(newContent: string) {
    this._content = newContent;
    if (this.lazyEval) {
      // If lazy evaluation is enabled, invalidate the current tree.
      // It will be re-parsed on the next access to the `tree` getter.
      this.mdastTree = null;
    } else {
      // If not lazy, parse the new content immediately.
      this.mdastTree = this.internalParse();
    }
  }

  get tree(): MDastTree {
    if (this.lazyEval) {
      // If lazy evaluation is enabled and the tree hasn't been parsed yet
      // (i.e., mdastTree is null), parse it now.
      if (this.mdastTree === null) {
        this.mdastTree = this.internalParse();
      }
    }
    // Return the (potentially newly parsed or existing) tree.
    // - If not lazy, this.mdastTree was set in the constructor or content setter.
    // - If lazy:
    //   - If tree was never accessed, mdastTree is null.
    //   - If tree was accessed, mdastTree is the parsed MdastRootNode.
    return this.mdastTree;
  }
}
