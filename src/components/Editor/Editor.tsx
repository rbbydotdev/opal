"use client";
import { useAllPlugins } from "@/components/Editor/AllPlugins";
import { Workspace } from "@/Db/Workspace";
// ForwardRefEditor.tsx
import { useRemoteMDXEditorRealm, type MDXEditorMethods, type MDXEditorProps } from "@mdxeditor/editor";
import { Loader } from "lucide-react";
import dynamic from "next/dynamic";
import { forwardRef } from "react";

// This is the only place InitializedMDXEditor is imported directly.
const InitializedMDXEditor = dynamic(() => import("./InitializedMDXEditor"), {
  // Make sure we turn SSR off
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center animate-spin">
      <Loader />
    </div>
  ),
});

// This is what is imported by other components. Pre-initialized with plugins, and ready
// to accept other props, including a ref.
export const Editor = forwardRef<MDXEditorMethods, MDXEditorProps & { currentWorkspace: Workspace }>(
  ({ currentWorkspace, ...props }, ref) => {
    // const realm = useRemoteMDXEditorRealm("Editor");
    const realm = useRemoteMDXEditorRealm("MdxEditorRealm");
    const plugins = useAllPlugins({ currentWorkspace, realm });
    return (
      <>
        <InitializedMDXEditor {...props} plugins={plugins} editorRef={ref} />
      </>
    );
  }
);

// TS complains without the following line
Editor.displayName = "Editor";
