import { Workspace } from "@/Db/Workspace";

export const WorkerApi = {
  async *searchWorkspace(workspace: Workspace, searchStr: string) {
    yield* workspace.NewScannable().search(searchStr);
  },
  async *searchWorkspaces(workspaces: AsyncGenerator<Workspace> | Workspace[], searchStr: string) {
    for await (const workspace of workspaces) {
      yield* workspace.NewScannable().search(searchStr);
    }
  },
};
