"use client";

import { Editor } from "@/components/Editor/Editor";
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
    <div className="p-4 border-2 m-auto flex justify-center items-center h-full w-full flex-col">
      <img className="max-h-[500px] aspect-auto" alt={alt} src={BasePath.encode(origSrc) + "?thumb=1"} />
    </div>
  );
}

export function WorkspaceLiveEditorInternal({ className, ...props }: WorkspaceLiveEditorProps) {
  const ref = useRef<MDXEditorMethods>(null);
  const { contents, updateContents } = useFileContents();
  useEffect(() => {
    if (ref.current && contents !== null) {
      ref.current?.setMarkdown(String(contents));
    }
  }, [contents]);
  const { currentWorkspace } = useWorkspaceContext();

  if (contents === null || !currentWorkspace) return null;
  return (
    <>
      <Editor
        {...props}
        ref={ref}
        currentWorkspace={currentWorkspace}
        onChange={updateContents}
        markdown={String(contents)}
        className={twMerge("flex flex-col", className)}
        contentEditableClassName="max-w-full overflow-auto content-editable prose"
      />
    </>
  );
}
