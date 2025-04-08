"use client";

import { Editor } from "@/components/Editor/Editor";
import { useWorkerContext } from "@/components/SWImages";
import { useCurrentFilepath, useWorkspaceContext } from "@/context";
import { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

interface WorkspaceLiveEditorProps extends Partial<MDXEditorProps> {
  className?: string;
}

export function WorkspaceLiveEditor(props: WorkspaceLiveEditorProps) {
  const { mimeType, contents, filePath } = useCurrentFilepath();

  if (!mimeType || !contents || !filePath) {
    return null;
  }
  if (mimeType?.startsWith("image/")) {
    return <ImageViewer imageContent={contents} alt={filePath.str} origSrc={filePath.str} />;
  }
  return <WorkspaceLiveEditorInternal {...props} />;
}
//TODO MOVE THIS OUT
export function ImageViewer({
  imageContent,
  alt = "image",
  origSrc = "",
}: {
  imageContent: string | Uint8Array<ArrayBufferLike> | null;
  alt?: string;
  origSrc?: string;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  useEffect(() => {
    if (typeof imageContent === "string") {
      setImgSrc(imageContent);
    } else if (imageContent instanceof Uint8Array) {
      setImgSrc(URL.createObjectURL(new Blob([imageContent])));
      return () => {
        if (imgSrc) {
          URL.revokeObjectURL(imgSrc);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof imgSrc !== "string") {
    return null;
  }
  return (
    <div className="p-4 border-2 m-auto flex justify-center items-center h-full w-full flex-col">
      <img className="max-h-[85%]" alt={alt} src={origSrc} />
      {/* <img className="max-h-[85%]" alt={alt} src={imgSrc} /> */}
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
  const { currentWorkspace } = useWorkspaceContext();
  // console.log(api.performTask);
  // api.performTask("test").then((result) => {
  //   console.log(result);
  // });
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
