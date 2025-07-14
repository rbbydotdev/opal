"use client";

import { TopToolbar } from "@/app/(main)/TopToolbar";
import { ConditionalDropzone } from "@/components/ConditionalDropzone";
import { useAllPlugins } from "@/components/Editor/AllPlugins";
import { EditHistoryMenu } from "@/components/Editor/EditHistoryMenu";
import { Editor } from "@/components/Editor/Editor";
import { MainEditorRealmId } from "@/components/Editor/MainEditorRealmId";
import { ImageViewer } from "@/components/ImageViewer";
import { TrashBanner } from "@/components/TrashBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useCurrentFilepath, useFileContents, useWorkspaceContext } from "@/context/WorkspaceHooks";
import { Workspace } from "@/Db/Workspace";
import { DropCommanderProvider } from "@/features/filetree-drag-and-drop/DropCommander";
import {
  isExternalFileDrop,
  useHandleDropFilesEventForNode,
} from "@/features/filetree-drag-and-drop/useFileTreeDragDrop";
import { ApplicationError, isError, NotFoundError } from "@/lib/errors";
import { RootNode } from "@/lib/FileTree/TreeNode";
import { withSuspense } from "@/lib/hoc/withSuspense";
import { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, use, useMemo, useRef } from "react";
import { twMerge } from "tailwind-merge";

interface WorkspaceEditorProps extends Partial<MDXEditorProps> {
  currentWorkspace: Workspace;
  className?: string;
}

export function WorkspaceView(props: WorkspaceEditorProps) {
  const { isImage, filePath, inTrash } = useCurrentFilepath();

  const router = useRouter();
  const handleDropFilesEvent = useHandleDropFilesEventForNode({ currentWorkspace: props.currentWorkspace });
  return (
    <>
      {isImage ? (
        <ConditionalDropzone
          shouldActivate={isExternalFileDrop}
          onDrop={(e) =>
            handleDropFilesEvent(e, RootNode).then(([filePath]) => {
              if (filePath) router.push(props.currentWorkspace.resolveFileUrl(filePath));
            })
          }
        >
          <ImageViewer alt={filePath} origSrc={filePath} />
        </ConditionalDropzone>
      ) : (
        <WorkspaceEditor {...props} />
      )}
      {inTrash && <TrashBanner filePath={filePath} />}
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
            <Link href={tryFirstFile}>Sorry!</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
});

export function WorkspaceEditor({ className, currentWorkspace, ...props }: WorkspaceEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const { initialContents, debouncedUpdate, error } = useFileContents((newContent) => {
    //this is for out of editor updates like via tab or image path updates
    editorRef.current?.setMarkdown(newContent ?? "");
  });

  const plugins = useAllPlugins({ currentWorkspace, realmId: MainEditorRealmId });

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
    <div className="flex flex-col h-full relative">
      <TopToolbar>
        <EditHistoryMenu historyId="foobar" finalizeRestore={(md) => debouncedUpdate(md)} />
      </TopToolbar>
      <DropCommanderProvider>
        <Editor
          {...props}
          editorRef={editorRef}
          plugins={plugins}
          onChange={debouncedUpdate}
          markdown={String(initialContents || "")}
          className={twMerge("bg-background flex-grow  flex-col", className)}
          contentEditableClassName="max-w-full content-editable prose bg-background"
        />
      </DropCommanderProvider>
    </div>
  );
}
