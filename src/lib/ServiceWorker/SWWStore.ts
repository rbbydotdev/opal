import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";

//shared singleton for Service Worker to manage/cache workspaces
export const SWWStore = new (class SwWorkspace {
  constructor() {
    console.log("SWWStore initialized");
  }
  private workspace: Promise<Workspace> | null = null;

  async tryWorkspace(workspaceId: string): Promise<Workspace> {
    if (this.workspace instanceof Promise) {
      console.log("awaiting workspace promise...");
      const ws = await this.workspace;
      if (ws.name !== workspaceId) {
        await ws.tearDown();
        this.workspace = null;
      } else {
        console.log(`Returning existing workspace: ${ws.name}`);
        return ws;
      }
    }
    return (this.workspace = WorkspaceDAO.FetchByName(workspaceId).then((wsd) => wsd.toModel()));
  }
})();
