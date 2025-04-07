"use client";

import { Editor } from "@/components/Editor/Editor";
import { useWorkerContext } from "@/components/SWImages";
import { useCurrentFilepath } from "@/context";
import { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";
import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

interface WorkspaceLiveEditorProps extends Partial<MDXEditorProps> {
  className?: string;
}

export function WorkspaceLiveEditor(props: WorkspaceLiveEditorProps) {
  const { mimeType, contents, filePath } = useCurrentFilepath();

  if (!mimeType) return null;

  if (mimeType?.startsWith("image/")) {
    return <ImageViewer imageContent={contents} alt={filePath?.str} />;
  }
  return <WorkspaceLiveEditorInternal {...props} />;
}
export function ImageViewer({
  imageContent,
  alt = "image",
}: {
  imageContent: string | Uint8Array<ArrayBufferLike> | null;
  alt?: string;
}) {
  const imgSrc = useRef<string | null>(null);
  useEffect(() => {
    if (typeof imageContent === "string") {
      imgSrc.current = imageContent;
    } else if (imageContent instanceof Uint8Array) {
      imgSrc.current = URL.createObjectURL(new Blob([imageContent]));
      console.log(imgSrc.current);
      return () => URL.revokeObjectURL(imgSrc.current!);
    }
  }, [imageContent]);

  if (typeof imgSrc.current !== "string") return null;
  return (
    <div className="p-4 border-2 m-auto flex justify-center items-center h-full w-full">
      <img className="max-h-[85%]" alt={alt} src={imgSrc.current} />
    </div>
  );
}

export function WorkspaceLiveEditorInternal({ className, ...props }: WorkspaceLiveEditorProps) {
  const ref = useRef<MDXEditorMethods>(null);
  const { contents, updateContents } = useCurrentFilepath();
  useEffect(() => {
    if (ref.current && contents !== null) {
      ref.current?.setMarkdown(String(contents));
    }
  }, [contents]);
  const api = useWorkerContext();
  if (contents === null) return null;
  return (
    <>
      <Editor
        {...props}
        ref={ref}
        onChange={updateContents}
        markdown={String(contents)}
        className={twMerge("flex flex-col", className)}
        contentEditableClassName="max-w-full overflow-auto content-editable prose"
      />
    </>
  );
}
