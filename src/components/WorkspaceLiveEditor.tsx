"use client";

import { Editor } from "@/components/Editor/Editor";
import { useCurrentFilepath, useWorkspaceContext } from "@/context";
import { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

export function WorkspaceLiveEditor({ className, ...props }: { className?: string } & Partial<MDXEditorProps>) {
  const ref = useRef<MDXEditorMethods>(null);
  const router = useRouter();
  const { currentWorkspace } = useWorkspaceContext();
  const { contents, updateContents, error } = useCurrentFilepath();
  useEffect(() => {
    if (error !== null && currentWorkspace) {
      router.push(currentWorkspace.tryFirstFileUrl());
    }
  }, [currentWorkspace, error, router]);
  useEffect(() => {
    if (ref.current && contents !== null) {
      ref.current?.setMarkdown(contents);
    }
  }, [contents]);
  if (contents === null) return null;
  return (
    <Editor
      {...props}
      ref={ref}
      onChange={updateContents}
      markdown={contents}
      className={twMerge("flex flex-col", className)}
      contentEditableClassName="max-w-full overflow-auto content-editable prose"
    />
  );
}
