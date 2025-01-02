import { Editor } from "@/components/Editor/Editor";

export default async function Page() {
  return (
    <div className="overflow-auto min-w-full w-0">
      <div className="overflow-auto min-w-full w-0">
        <Editor
          markdown={`# ${"workspaceId"}/${"fileId"}`}
          className="flex flex-col"
          contentEditableClassName="max-w-full overflow-auto content-editable prose"
        />
      </div>
    </div>
  );
}
