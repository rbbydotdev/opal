import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { initializeGlobalLogger } from "@/lib/initializeGlobalLogger";
import { RemoteLoggerLogger } from "@/lib/service-worker/utils";
import { Workspace } from "@/workspace/Workspace";
initializeGlobalLogger(RemoteLoggerLogger());

//shared singleton for Service Worker to manage/cache workspaces
export const SWWStore = new (class SwWorkspace {
  constructor() {
    logger.log("SWWStore initialized");
  }
  private workspaces = new Map<string, Promise<Workspace>>();

  async tryWorkspace(workspaceName: string): Promise<Workspace> {
    if (!this.workspaces.has(workspaceName)) {
      const ws = WorkspaceDAO.FetchByNameOrId(workspaceName).then((wsd) => Workspace.FromDAO(wsd).initNoListen());
      this.workspaces.set(workspaceName, ws);
      setTimeout(() => {
        this.workspaces.delete(workspaceName);
      }, 10_000);
      return ws;
    }
    return this.workspaces.get(workspaceName)!;
  }
})();
