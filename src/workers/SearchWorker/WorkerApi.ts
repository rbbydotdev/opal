import { Workspace } from "@/Db/Workspace";

export const WorkerApi = {
  async *searchWorkspace(workspace: Workspace, searchTerm: string) {
    yield* workspace.NewScannable().search(searchTerm);
  },
  async *searchWorkspaces(workspaces: AsyncGenerator<Workspace> | Workspace[], searchTerm: string) {
    for await (const workspace of workspaces) {
      yield* workspace.NewScannable().search(searchTerm);
    }
  },
};
