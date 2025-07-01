import { addExportVisitor$, addImportVisitor$, LexicalVisitor, realmPlugin } from "@mdxeditor/editor";

export const LexicalNodeVisitor: LexicalVisitor = {
  // testLexicalNode: (lexicalNode): lexicalNode is typeof lexicalNode => true,
  testLexicalNode: (lexicalNode): lexicalNode is typeof lexicalNode => true,
  visitLexicalNode: ({ lexicalNode, actions, mdastParent }) => {
    // console.log(">>>>", lexicalNode);
    console.log(">>", lexicalNode.getKey(), mdastParent);
    actions.nextVisitor();
  },
  priority: Infinity,
};

export const searchMarkdownPlugin = realmPlugin({
  init(realm) {
    realm.pubIn({
      [addExportVisitor$]: [LexicalNodeVisitor],
      [addImportVisitor$]: [],
    });
  },
});
