import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { customCodeMirrorTheme } from "@/editor/codeMirrorCustomTheme";
import { EditHistoryMenu } from "@/editor/history/EditHistoryMenu";
import { LivePreviewButtons } from "@/editor/LivePreviewButton";
import { MdxSearchToolbar } from "@/editor/MdxSeachToolbar";
import { MdxToolbar } from "@/editor/MdxToolbar";
import { searchPlugin } from "@/editor/searchPlugin";
import { SourceEditorButton } from "@/editor/SourceEditorButton";
import { useImagesPlugin } from "@/editor/useImagesPlugin";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSidebarPanes } from "@/layouts/EditorSidebarLayout";
import { cn } from "@/lib/utils";
import { Workspace } from "@/workspace/Workspace";
import {
  AdmonitionDirectiveDescriptor,
  CodeMirrorEditor,
  codeBlockPlugin,
  codeMirrorPlugin,
  directivesPlugin,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  remoteRealmPlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";
import { memo, useEffect, useMemo } from "react";

function SpellCheckSwitch() {
  const { storedValue: spellCheck, setStoredValue: setSpellCheck } = useLocalStorage("Editor/spellcheck", true);

  return (
    <Label htmlFor="mdxSpellCheck" className="p-2 border bg-accent rounded flex items-center gap-1 select-none">
      <span className="text-sm whitespace-nowrap truncate">Spellcheck</span>
      <Switch
        id="mdxSpellCheck"
        className="ml-1"
        checked={spellCheck}
        onCheckedChange={(checked) => setSpellCheck(checked)}
        aria-label="Enable spellcheck"
      />
    </Label>
  );
}

export function useAllPlugins({
  currentWorkspace,
  realmId,
  mimeType,
}: {
  currentWorkspace: Workspace;
  realmId: string;
  mimeType: string;
}) {
  const workspaceImagesPlugin = useImagesPlugin({ currentWorkspace });

  useEffect(() => {
    if (mimeType === "text/markdown") return;
    document.body.classList.add("hide-rich-text");
    return () => {
      document.body.classList.remove("hide-rich-text");
    };
  }, [mimeType]);

  return useMemo(
    () =>
      [
        toolbarPlugin({
          toolbarContents: () => <EditorToolbar />,
        }),
        remoteRealmPlugin({ editorId: realmId }),
        listsPlugin(),
        quotePlugin(),
        headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4] }),
        linkPlugin(),
        searchPlugin(),
        linkDialogPlugin(),
        workspaceImagesPlugin,
        tablePlugin(),
        thematicBreakPlugin(),
        codeBlockPlugin({
          defaultCodeBlockLanguage: "js",
          codeBlockEditorDescriptors: [{ priority: -10, match: (_) => true, Editor: CodeMirrorEditor }],
        }),
        codeMirrorPlugin({
          codeBlockLanguages: { js: "JavaScript", css: "CSS", txt: "Plain Text", tsx: "TypeScript", "": "Unspecified" },
          autoLoadLanguageSupport: true,
          codeMirrorExtensions: [customCodeMirrorTheme],
        }),
        directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
        markdownShortcutPlugin(),
      ].filter(Boolean),
    [realmId, workspaceImagesPlugin]
  );
}
const EditorToolbar = memo(function EditorToolbar() {
  const { left } = useSidebarPanes();
  return (
    <div
      className={cn("flex gap-1 w-full", {
        "ml-0": !left.isCollapsed,
        "ml-16": left.isCollapsed,
      })}
    >
      <SourceEditorButton />
      <EditHistoryMenu />
      <LivePreviewButtons />
      <MdxSearchToolbar />

      <div className="flex-grow flex justify-start ml-2">
        <MdxToolbar />
      </div>

      <div className="ml-auto">
        <SpellCheckSwitch />
      </div>
    </div>
  );
});
