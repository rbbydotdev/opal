import { type Workspace } from "@/Db/Workspace";

import "@/workers/transferHandlers";
export const SearchWorkerApi = {
  async *searchWorkspace(workspace: Workspace, searchTerm: string) {
    yield* workspace.NewScannable().search(searchTerm);
  },
  async *searchWorkspaces(workspaces: AsyncGenerator<Workspace> | Workspace[], searchTerm: string) {
    for await (const workspace of workspaces) {
      yield* workspace.NewScannable().search(searchTerm);
    }
  },
};

export type SearchWorkerApiType = typeof SearchWorkerApi;
