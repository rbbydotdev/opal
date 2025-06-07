"use client";

import { Editor } from "@/components/Editor/Editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useCurrentFilepath, useFileContents, useWorkspaceContext } from "@/context/WorkspaceHooks";
import { ApplicationError, isError, NotFoundError } from "@/lib/errors";
import { withSuspense } from "@/lib/hoc/withSuspense";
import { encodePath } from "@/lib/paths2";
import { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";
import Link from "next/link";
import { Suspense, use, useEffect, useMemo, useRef } from "react";
import { twMerge } from "tailwind-merge";

interface WorkspaceEditorProps extends Partial<MDXEditorProps> {
  className?: string;
}

export function WorkspaceView(props: WorkspaceEditorProps) {
  const { isImage, filePath } = useCurrentFilepath();

  if (filePath === null) return null;

  if (isImage) {
    return <ImageViewer alt={filePath} origSrc={filePath} />;
  }
  return <WorkspaceEditor {...props} />;
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
  const ref = useRef<MDXEditorMethods>(null);
  const { contents, updateContents, error } = useFileContents();
  useEffect(() => {
    if (ref.current && contents !== null) {
      ref.current?.setMarkdown(String(contents));
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
    <Editor
      {...props}
      ref={ref}
      currentWorkspace={currentWorkspace}
      onChange={updateContents}
      markdown={String(contents)}
      className={twMerge("h-full bg-background flex flex-col", className)}
      contentEditableClassName="max-w-full overflow-auto content-editable prose"
    />
  );
}
