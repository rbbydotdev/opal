"use client";

import { Editor } from "@/components/Editor/Editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useCurrentFilepath, useFileContents, useWorkspaceContext } from "@/context/WorkspaceHooks";
import { ApplicationError, isError, NotFoundError } from "@/lib/errors";
import { withSuspense } from "@/lib/hoc/withSuspense";
import { AbsPath, encodePath } from "@/lib/paths2";
import { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";
import { Delete, Trash2, Undo } from "lucide-react";
import Link from "next/link";
import React, { Suspense, use, useEffect, useMemo, useRef } from "react";
import { twMerge } from "tailwind-merge";

interface WorkspaceEditorProps extends Partial<MDXEditorProps> {
  className?: string;
}
const TrashBanner = ({ filePath }: { filePath: AbsPath }) => {
  const { currentWorkspace } = useWorkspaceContext();
  const untrashFile = React.useCallback(async () => {
    return currentWorkspace.untrashSingle(filePath);
  }, [currentWorkspace, filePath]);
  const removeFile = React.useCallback(async () => {
    return currentWorkspace.removeSingle(filePath);
  }, [currentWorkspace, filePath]);
  return (
    <div className="border-2 absolute left-0 right-0 w-64 h-12 text-sidebar-foreground/70 bg-sidebar shadow-lg m-auto top-16 z-10 rounded-full flex justify-center items-center _font-mono _font-bold">
      <Button
        tabIndex={0}
        variant={"outline"}
        title="Put Back"
        onClick={untrashFile}
        aria-label="Put Back From Trash"
        className="-translate-x-16 rounded-full block w-12 h-12 bg-sidebar text-sidebar-foreground/70 shadow-lg"
      >
        <Undo />
      </Button>
      <div className="w-full flex justify-center items-center gap-2">
        <Trash2 size={16} /> Trash
      </div>
      <Button
        title="Permanently Delete"
        variant={"outline"}
        onClick={removeFile}
        aria-label="Permanently Delete"
        className="shadow-lg border-2 rounded-full block w-12 h-12 bg-sidebar text-sidebar-foreground/70 translate-x-16 "
      >
        <Delete className="scale-125" />
      </Button>
    </div>
  );
};

export function WorkspaceView(props: WorkspaceEditorProps) {
  const { isImage, filePath, inTrash } = useCurrentFilepath();

  return (
    <>
      {inTrash && <TrashBanner filePath={filePath} />}
      {isImage ? <ImageViewer alt={filePath} origSrc={filePath} /> : <WorkspaceEditor {...props} />}
    </>
  );
}
export function ImageViewer({ alt = "image", origSrc = "" }: { alt?: string; origSrc?: string }) {
  return (
    <div className="p-4 m-auto flex justify-center items-center h-full w-full flex-col">
      <img className="max-h-[500px] aspect-auto bg-white" alt={alt} src={encodePath(origSrc)} />
    </div>
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

export function WorkspaceEditor({ className, ...props }: WorkspaceEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const { contents, debouncedUpdate, error } = useFileContents();
  useEffect(() => {
    if (editorRef.current && contents !== null) {
      editorRef.current?.setMarkdown(contents);
    }
  }, [contents]);

  const { currentWorkspace } = useWorkspaceContext();

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
  if (contents === null || !currentWorkspace) return null;
  return (
    <>
      <Editor
        {...props}
        ref={editorRef}
        currentWorkspace={currentWorkspace}
        onChange={debouncedUpdate}
        markdown={String(contents)}
        className={twMerge("h-full bg-background flex flex-col", className)}
        contentEditableClassName="max-w-full overflow-auto content-editable prose"
      />
    </>
  );
}
