import { useDestinationManager } from "@/components/DestinationManagerContext";
import { DeployLabel } from "@/components/SidebarFileMenu/build-files-section/DeployLabel";
import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import {
  SelectableListActions,
  SelectableListItem,
  SelectableListItemAction,
  SelectableListItemMenu,
  SelectableListItems,
  SelectableListSimple,
} from "@/components/ui/SelectableList";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { useDeploys } from "@/hooks/useDeploys";
import { coerceError } from "@/lib/errors";
import { useErrorToss } from "@/lib/errorToss";
import { Delete, Eye } from "lucide-react";

export function SidebarDeploymentList() {
  const { openDestinationFlow } = useDestinationManager();
  const errorToss = useErrorToss();
  const { deploys } = useDeploys();
  const handleDelete = async (destId: string) => {
    try {
      await DestinationDAO.delete(destId);
    } catch (error) {
      errorToss(coerceError(error));
    }
  };

  const handleView = (destinationId: string) => {
    openDestinationFlow(destinationId);
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
        <div className="flex flex-col gap-2 mt-4 ml-3 group">
          {deploys.length === 0 && <EmptySidebarLabel label="no deploys" />}
          {deploys.map((deploy) => (
            <SelectableListItem key={deploy.guid} id={deploy.guid}>
              <DeployLabel deploy={deploy} />
              <SelectableListItemMenu>
                <SelectableListItemAction onClick={() => handleView(deploy.guid)} icon={<Eye className="w-4 h-4" />}>
                  View
                </SelectableListItemAction>
                <SelectableListItemAction
                  onClick={() => handleDelete(deploy.guid)}
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
