import { IdenticonStr } from "@/components/IndenticonStr";
import { NotFoundError } from "@/lib/errors/errors";
import { SWWStore } from "./SWWStore";

export async function handleFaviconRequest(workspaceName: string): Promise<string> {
  const workspace = await SWWStore.tryWorkspace(workspaceName);

  if (!workspace) {
    throw new NotFoundError(`Workspace not found: ${workspaceName}`);
  }

  return IdenticonStr({
    input: workspace.guid,
    size: 4, // Grid size
  });
}
