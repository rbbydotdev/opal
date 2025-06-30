import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";

//shared singleton for Service Worker to manage/cache workspaces
export const SWWStore = new (class SwWorkspace {
  constructor() {
    console.log("SWWStore initialized");
  }
  private workspaces = new Map<string, Promise<Workspace>>();

  async tryWorkspace(workspaceId: string): Promise<Workspace> {
    if (!this.workspaces.has(workspaceId)) {
      const ws = WorkspaceDAO.FetchByName(workspaceId).then((wsd) => wsd.toModel().init());
      this.workspaces.set(workspaceId, ws);
      setTimeout(() => {
        this.workspaces.delete(workspaceId);
      }, 5_000);
      return ws;
    }
    return this.workspaces.get(workspaceId)!;
  }
})();
