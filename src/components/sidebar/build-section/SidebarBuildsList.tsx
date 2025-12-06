import { useBuildCreation } from "@/components/build-modal/BuildModalContext";
import { BuildLabel } from "@/components/sidebar/build-files-section/BuildLabel";
import { EmptySidebarLabel } from "@/components/sidebar/EmptySidebarLabel";
import {
  SelectableListActions,
  SelectableListItem,
  SelectableListItemAction,
  SelectableListItemMenu,
  SelectableListItems,
  SelectableListSimple,
} from "@/components/sidebar/selectable-list/SelectableList";
import { BuildDAO } from "@/data/dao/BuildDAO";
import { useBuilds } from "@/data/dao/useBuilds";
import { coerceError } from "@/lib/errors/errors";
import { useErrorToss } from "@/lib/errors/errorToss";
import { Delete, Eye } from "lucide-react";

export function SidebarBuildsList({ workspaceId, children }: { workspaceId: string; children: React.ReactNode }) {
  const { openEdit } = useBuildCreation();
  const errorToss = useErrorToss();
  const { builds } = useBuilds({ workspaceId });
  const handleDelete = async (buildId: string) => {
    try {
      await BuildDAO.delete(buildId);
    } catch (error) {
      errorToss(coerceError(error));
    }
  };

  const handleView = (buildId: string) => {
    openEdit({ buildId });
  };

  return (
    <SelectableListSimple
      data={builds}
      getItemId={(build) => build.guid}
      onClick={handleView}
      onDelete={handleDelete}
      emptyLabel="no builds found"
      showGrip={false}
    >
      <SelectableListActions />

      <SelectableListItems>
        <div className="flex flex-col gap-2 mt-4 #ml-3 group">
          {builds.length === 0 && <EmptySidebarLabel label="no builds" />}
          {builds.map((build) => (
            <SelectableListItem key={build.guid} id={build.guid}>
              <BuildLabel build={build} />
              <SelectableListItemMenu>
                {children}
                <SelectableListItemAction onClick={() => handleView(build.guid)} icon={<Eye className="w-4 h-4" />}>
                  View
                </SelectableListItemAction>
                <SelectableListItemAction
                  onClick={() => handleDelete(build.guid)}
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
