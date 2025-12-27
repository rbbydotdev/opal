import { useBuildPublisher } from "@/components/publish-modal/PubicationModalCmdContext";
import {
  SelectableListActions,
  SelectableListItem,
  SelectableListItemAction,
  SelectableListItemMenu,
  SelectableListItems,
  SelectableListSimple,
} from "@/components/selectable-list/SelectableList";
import { DeployLabel } from "@/components/sidebar/build-files-section/DeployLabel";
import { useBuildManager } from "@/components/sidebar/build-files-section/useBuildManager";
import { useBuildListMiniTabs } from "@/components/sidebar/build-section/MiniTabs";
import { EmptySidebarLabel } from "@/components/sidebar/EmptySidebarLabel";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { useDeploys } from "@/data/dao/useDeploys";
import { coerceError } from "@/lib/errors/errors";
import { useErrorToss } from "@/lib/errors/errorToss";
import { Workspace } from "@/workspace/Workspace";
import { Delete, Eye, Files, Globe } from "lucide-react";

export function SidebarDeploymentList({ workspace }: { workspace: Workspace }) {
  const errorToss = useErrorToss();
  const { deploys } = useDeploys({ workspaceId: workspace.guid });
  const { openDeployment } = useBuildPublisher();

  const { setBuildId } = useBuildManager({ currentWorkspace: workspace });
  const { activeTab, setActiveTab } = useBuildListMiniTabs();
  const handleDelete = async (destId: string) => {
    try {
      await DeployDAO.delete(destId);
    } catch (error) {
      errorToss(coerceError(error));
    }
  };

  const handleView = (deploymentId: string) => {
    openDeployment(deploymentId);
  };

  const handleViewDeployment = (deploy: DeployDAO) => {
    if (deploy.effectiveUrl) {
      window.open(deploy.effectiveUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <SelectableListSimple
      data={deploys}
      getItemId={(build) => build.guid}
      onClick={handleView}
      onDelete={handleDelete}
      emptyLabel="no deploys found"
      showGrip={false}
    >
      <SelectableListActions />

      <SelectableListItems>
        <div className="flex flex-col gap-2 mt-4 group max-h-56 overflow-y-auto no-scrollbar">
          {deploys.length === 0 && <EmptySidebarLabel label="no deploys" />}
          {deploys.map((deploy) => (
            <SelectableListItem key={deploy.guid} id={deploy.guid}>
              <DeployLabel deploy={deploy} />
              <SelectableListItemMenu>
                <SelectableListItemAction onSelect={() => handleView(deploy.guid)} icon={<Eye className="w-4 h-4" />}>
                  Show
                </SelectableListItemAction>
                {deploy.status === "success" && deploy.effectiveUrl && (
                  <SelectableListItemAction
                    onSelect={() => {
                      setBuildId(deploy.buildId);

                      setActiveTab("files");
                    }}
                    icon={<Files className="w-4 h-4" />}
                  >
                    Build Files
                  </SelectableListItemAction>
                )}

                {deploy.status === "success" && deploy.effectiveUrl && (
                  <SelectableListItemAction
                    onSelect={() => handleViewDeployment(deploy)}
                    icon={<Globe className="w-4 h-4" />}
                  >
                    View Deploy
                  </SelectableListItemAction>
                )}
                {deploy.url && (
                  <SelectableListItemAction
                    onSelect={() => handleViewDeployment(deploy)}
                    icon={<Globe className="w-4 h-4" />}
                  >
                    View
                  </SelectableListItemAction>
                )}

                <SelectableListItemAction
                  onSelect={() => handleDelete(deploy.guid)}
                  icon={<Delete className="w-4 h-4" />}
                  destructive
                >
                  Delete
                </SelectableListItemAction>
              </SelectableListItemMenu>
            </SelectableListItem>
          ))}
        </div>
      </SelectableListItems>
    </SelectableListSimple>
  );
}
