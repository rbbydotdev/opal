import { useBuildCreation } from "@/components/build-modal/BuildModalContext";
import {
  SelectableListActions,
  SelectableListItem,
  SelectableListItemAction,
  SelectableListItemMenu,
  SelectableListItems,
  SelectableListSimple,
} from "@/components/selectable-list/SelectableList";
import { BuildLabel } from "@/components/sidebar/build-files-section/BuildLabel";
import { EmptySidebarLabel } from "@/components/sidebar/EmptySidebarLabel";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { BuildDAO } from "@/data/dao/BuildDAO";
import { useBuilds } from "@/data/dao/useBuilds";
import { coerceError } from "@/lib/errors/errors";
import { useErrorToss } from "@/lib/errors/errorToss";
import { Delete, Download, Eye } from "lucide-react";

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
                <DropdownMenuItem asChild>
                  <a href={build.getDownloadBuildZipURL()}>
                    <Download className="w-2 h-2 mr-2" size={4} />
                    Download
                  </a>
                </DropdownMenuItem>
                <SelectableListItemAction onSelect={() => handleView(build.guid)} icon={<Eye className="w-4 h-4" />}>
                  View
                </SelectableListItemAction>
                <SelectableListItemAction
                  onSelect={() => handleDelete(build.guid)}
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
