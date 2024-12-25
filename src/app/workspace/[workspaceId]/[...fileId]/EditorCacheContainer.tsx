import { Editor } from "@/components/Editor/Editor";

export function EditorCacheContainer({
  skipFetch,
  workspaceId,
  fileId,
}: {
  skipFetch: boolean;
  workspaceId: string;
  fileId: string;
}) {
  return (
    <div className="overflow-auto min-w-full w-0">
      <Editor
        markdown={`# ${workspaceId}/${fileId}/${skipFetch}`}
        className="flex flex-col"
        contentEditableClassName="max-w-full overflow-auto content-editable prose"
      />
    </div>
  );
}
