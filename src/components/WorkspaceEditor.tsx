"use client";

import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { useAllPlugins } from "@/components/Editor/AllPlugins";
import { Editor } from "@/components/Editor/Editor";
import { MainEditorRealmId, MdxEditorSelector } from "@/components/Editor/EditorConst";
import { SnapApiPoolProvider } from "@/components/Editor/history/SnapApiPoolProvider";
import { ImageViewer } from "@/components/ImageViewer";
import { ScrollSyncProvider, useScrollChannel } from "@/components/ScrollSync";
import { SourceEditor } from "@/components/SourceEditor";
import { TrashBanner } from "@/components/TrashBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useReadOnlyMode } from "@/components/useReadOnlyMode";
import { useCurrentFilepath, useFileContents, useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { HistorySnapDBProvider } from "@/Db/HistoryDAO";
import { Workspace } from "@/Db/Workspace";
import { DropCommanderProvider } from "@/features/filetree-drag-and-drop/DropCommander";
import { handleDropFilesEventForNode, isExternalFileDrop } from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { useWatchElement } from "@/hooks/useWatchElement";
import { ApplicationError, isError, NotFoundError } from "@/lib/errors";
import { RootNode } from "@/lib/FileTree/TreeNode";
import { withSuspense } from "@/lib/hoc/withSuspense";
import { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";
import { Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { ComponentProps, Suspense, use, useMemo, useRef } from "react";
import { twMerge } from "tailwind-merge";
import { useWorkspaceDocumentId } from "./Editor/history/useWorkspaceDocumentId";

interface WorkspaceEditorProps extends Partial<MDXEditorProps> {
  currentWorkspace: Workspace;
  className?: string;
}

export function WorkspaceView(props: WorkspaceEditorProps) {
  /*
  TODO: I need a source editor which has not association with markdown,
  just a pure text editor using code mirror or monaco editor.
  */

  const { isImage, isSource, isBin, filePath, inTrash } = useCurrentFilepath();

  const navigate = useNavigate();
  // const handleDropFilesEvent = handleDropFilesEventForNode({ currentWorkspace: props.currentWorkspace });
  if (isImage) {
    return (
      <>
        <ConditionalDropzone
          shouldActivate={isExternalFileDrop}
          onDrop={(e) =>
            handleDropFilesEventForNode({
              currentWorkspace: props.currentWorkspace,
              event: e,
              targetNode: RootNode,
            }).then(([filePath]) => {
              if (filePath) navigate({ to: props.currentWorkspace.resolveFileUrl(filePath) });
            })
          }
        >
          {inTrash && <TrashBanner filePath={filePath} />}
          <ImageViewer alt={filePath} origSrc={filePath} />
        </ConditionalDropzone>
      </>
    );
  }
  if (isSource || isBin) {
    return <SourceEditor />;
  }
  return (
    <>
      {inTrash && <TrashBanner filePath={filePath} />}
      <WorkspaceMarkdownEditor {...props} />
    </>
  );
}

const FileError = withSuspense(({ error }: { error: Error & Partial<ApplicationError> }) => {
  const { currentWorkspace } = useWorkspaceContext();
  const tryFirstFile = use(useMemo(() => currentWorkspace.tryFirstFileUrl(), [currentWorkspace]));

  return (
    <div className="w-full h-full flex items-center justify-center font-mono">
      <Card className="border-2 border-destructive border-dashed m-8 max-w-lg min-h-48  -rotate-3">
        <CardHeader>
          <h2 className="text-red-500 font-bold text-lg">⚠️ {error.code} Error</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center break-words break-all whitespace-pre-wrap">
            <p className="text-red-500">Error: {error.message}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild variant="destructive">
            <Link to={tryFirstFile}>Sorry!</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
});

export function WorkspaceMarkdownEditor({ className, currentWorkspace, ...props }: WorkspaceEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const { initialContents, debouncedUpdate, error } = useFileContents({
    currentWorkspace,
    listenerCb: (newContent) => {
      //this is for out of editor updates like via tab or image path updates
      editorRef.current?.setMarkdown(newContent ?? "");
    },
  });
  const [readOnlyMode, _setReadOnly] = useReadOnlyMode();

  const { id, path } = useWorkspaceRoute();
  const { mimeType } = useCurrentFilepath();

  const { scrollEmitter, sessionId } = useScrollChannel({ sessionId: `${id}${path}` });

  const mdxEditorElement = useWatchElement(MdxEditorSelector);

  const documentId = useWorkspaceDocumentId(initialContents) ?? "unknown";

  if (error) {
    if (isError(error, NotFoundError)) {
      return (
        <Suspense fallback={null}>
          <FileError error={error} />
        </Suspense>
      );
    } else {
      throw error; // rethrow other errors to be caught by the nearest error boundary
    }
  }

  if (initialContents === null || !currentWorkspace) return null;
  return (
    <SnapApiPoolProvider max={1}>
      <HistorySnapDBProvider documentId={documentId} workspaceId={currentWorkspace.name}>
        <ScrollSyncProvider
          scrollEl={mdxEditorElement as HTMLElement}
          scrollEmitter={scrollEmitter}
          sessionId={sessionId}
        >
          <div className="flex flex-col h-full relative">
            <DropCommanderProvider>
              <EditorWithPlugins
                {...props}
                readOnly={readOnlyMode}
                mimeType={mimeType}
                currentWorkspace={currentWorkspace}
                editorRef={editorRef}
                onChange={debouncedUpdate}
                markdown={String(initialContents || "")}
                className={twMerge("bg-background flex-grow  flex-col", className)}
                contentEditableClassName="max-w-full content-editable prose bg-background"
              />
            </DropCommanderProvider>
          </div>
        </ScrollSyncProvider>
      </HistorySnapDBProvider>
    </SnapApiPoolProvider>
  );
}
function EditorWithPlugins(props: ComponentProps<typeof Editor> & { currentWorkspace: Workspace; mimeType: string }) {
  const plugins = useAllPlugins({
    currentWorkspace: props.currentWorkspace,
    realmId: MainEditorRealmId,
    mimeType: props.mimeType,
    viewMode: props.mimeType === "text/markdown" ? "rich-text" : "source",
  });
  return (
    <Editor
      {...props}
      plugins={plugins}
      editorRef={props.editorRef}
      onChange={props.onChange}
      markdown={props.markdown}
    />
  );
}
