import { EditorCacheContainer } from "@/app/workspace/[workspaceId]/[...fileId]/EditorCacheContainer";

// const md = fs.readFileSync(process.cwd() + "/src/app/kitchen-sink.md", "utf-8");
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; fileId: Array<string> }>;
  searchParams?: Promise<{
    sf: string;
  }>;
}) {
  const [{ fileId, workspaceId }, { sf } = {}] = await Promise.all([params, searchParams]);
  const fileIdString = fileId.join("/");
  const skipFetch = sf === "1";

  return (
    <div className="overflow-auto min-w-full w-0">
      <EditorCacheContainer skipFetch={skipFetch} workspaceId={workspaceId} fileId={fileIdString} />
    </div>
  );
}
