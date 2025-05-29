"use client";

import { Editor } from "@/components/Editor/Editor";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useCurrentFilepath, useFileContents, useWorkspaceContext } from "@/context";
import { BasePath } from "@/lib/paths";
import { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";
import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

interface WorkspaceLiveEditorProps extends Partial<MDXEditorProps> {
  className?: string;
}

export function WorkspaceLiveEditor(props: WorkspaceLiveEditorProps) {
  const { isImage, filePath } = useCurrentFilepath();

  if (filePath === null) return null;

  if (isImage) {
    return <ImageViewer alt={filePath.str} origSrc={filePath.str} />;
  }
  return <WorkspaceLiveEditorInternal {...props} />;
}
//TODO MOVE THIS OUT
export function ImageViewer({ alt = "image", origSrc = "" }: { alt?: string; origSrc?: string }) {
  return (
    <div className="p-4 m-auto flex justify-center items-center h-full w-full flex-col">
      <img className="max-h-[500px] aspect-auto bg-white" alt={alt} src={BasePath.encode(origSrc)} />
    </div>
  );
}

const FileError = ({ error }: { error: Error }) => {
  return (
    <div className="w-full h-full flex items-center justify-center font-mono">
      <Card className="border-2 border-destructive border-dashed m-8 max-w-lg min-h-48  -rotate-3">
        <CardHeader>
          <h2 className="text-red-500 font-bold text-lg">⚠️ Error</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center break-words break-all whitespace-pre-wrap">
            <p className="text-red-500">Error: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export function WorkspaceLiveEditorInternal({ className, ...props }: WorkspaceLiveEditorProps) {
  const ref = useRef<MDXEditorMethods>(null);
  const { contents, updateContents, error } = useFileContents();
  useEffect(() => {
    if (ref.current && contents !== null) {
      ref.current?.setMarkdown(String(contents));
    }
  }, [contents]);
  const { currentWorkspace } = useWorkspaceContext();
  if (error) return <FileError error={error} />;

  if (contents === null || !currentWorkspace) return <div className="w-full h-full bg-background"></div>;
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
