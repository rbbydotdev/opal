import { Workspace } from "@/Db/Workspace";

export const WorkerApi = {
  async *searchWorkspace(workspace: Workspace, searchStr: string) {
    yield* workspace.NewScannable().search(searchStr);
  },
};
