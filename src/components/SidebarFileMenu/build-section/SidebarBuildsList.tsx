import { useBuildModalCmd } from "@/components/BuildModalContextProvider";
import { BuildLabel } from "@/components/SidebarFileMenu/build-files-section/BuildLabel";
import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import { SelectableList } from "@/components/ui/SelectableList";
import { BuildDAO } from "@/data/BuildDAO";
import { coerceError } from "@/lib/errors";
import { useErrorToss } from "@/lib/errorToss";
import { useLiveQuery } from "dexie-react-hooks";
import { Archive, Delete, Eye } from "lucide-react";

export function SidebarBuildsList({
  workspaceId,
  selectedBuildIds,
  onSelectionChange,
  onDelete,
  className,
}: {
  workspaceId: string;
  selectedBuildIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onDelete?: (buildId: string) => void;
  className?: string;
}) {
  const { openEdit } = useBuildModalCmd();
  const errorToss = useErrorToss();
  const builds = useLiveQuery(async () => BuildDAO.allForWorkspace(workspaceId), [workspaceId]) || [];
  const handleDelete = async (buildId: string) => {
    try {
      const build = builds.find((b) => b.guid === buildId);
      if (build) await build.delete();
    } catch (error) {
      errorToss(coerceError(error));
    }
  };

  const handleView = (buildId: string) => {
    openEdit({ buildId });
    // This could open a build details modal in the future
    // console.log("View build:", buildId);
  };

  return (
    <SelectableList.Root
      data={builds}
      getItemId={(build) => build.guid}
      onClick={handleView}
      onDelete={handleDelete}
      expanderId="builds"
      emptyLabel="no builds found"
      showGrip={false}
    >
      <SelectableList.Header>
        <Archive size={12} className="mr-2" />
        Recent Builds
      </SelectableList.Header>

      <SelectableList.Actions />

      <SelectableList.Content>
        <div className="flex flex-col gap-2 mt-4 ml-3 group">
          {builds.length === 0 && <EmptySidebarLabel label="no builds" />}
          {builds.map((build) => (
            <SelectableList.Item key={build.guid} id={build.guid}>
              <BuildLabel build={build} />
              <SelectableList.ItemMenu>
                <SelectableList.ItemAction onClick={() => handleView(build.guid)} icon={<Eye className="w-4 h-4" />}>
                  View
                </SelectableList.ItemAction>
                <SelectableList.ItemAction
                  onClick={() => handleDelete(build.guid)}
                  icon={<Delete className="w-4 h-4" />}
                  destructive
                >
                  Delete
                </SelectableList.ItemAction>
              </SelectableList.ItemMenu>
            </SelectableList.Item>
          ))}
        </div>
      </SelectableList.Content>
    </SelectableList.Root>
  );
}
