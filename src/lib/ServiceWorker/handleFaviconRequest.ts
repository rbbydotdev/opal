import { IdenticonStr } from "@/components/IndenticonStr";
import { SWWStore } from "./SWWStore";

export async function handleFaviconRequest(workspaceName: string): Promise<Response> {
  const workspace = await SWWStore.tryWorkspace(workspaceName);
  return new Response(
    IdenticonStr({
      input: workspace.guid,
      size: 4, // Grid size
    }),
    {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
