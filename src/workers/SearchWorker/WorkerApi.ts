import { Workspace } from "@/Db/Workspace";

export const WorkerApi = {
  async *searchWorkspace(workspace: Workspace, searchStr: string, abortSignal?: AbortSignal) {
    yield* workspace.NewScannable().search(searchStr, { abortSignal });
  },
  async *searchWorkspaces(workspaces: AsyncGenerator<Workspace> | Workspace[], searchStr: string) {
    for await (const workspace of workspaces) {
      yield* workspace.NewScannable().search(searchStr);
    }
  },
};
