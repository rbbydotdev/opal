import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";

//shared singleton for Service Worker to manage/cache workspaces
export const SWWStore = new (class SwWorkspace {
  constructor() {
    console.log("SWWStore initialized");
  }
  private workspaces = new Map<string, Promise<Workspace>>();

  async tryWorkspace(workspaceName: string): Promise<Workspace> {
    if (!this.workspaces.has(workspaceName)) {
      const ws = WorkspaceDAO.FetchByName(workspaceName).then((wsd) => wsd.toModel());
      this.workspaces.set(workspaceName, ws);
      setTimeout(() => {
        this.workspaces.delete(workspaceName);
      }, 10_000);
      return ws;
    }
    return this.workspaces.get(workspaceName)!;
  }
})();
