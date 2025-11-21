import { useBuildCreation } from "@/components/BuildModalContext";
import { BuildLabel } from "@/components/SidebarFileMenu/build-files-section/BuildLabel";
import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import { SimpleSelectableList } from "@/components/ui/SelectableList";
import { BuildDAO } from "@/data/BuildDAO";
import { useBuilds } from "@/hooks/useBuilds";
import { coerceError } from "@/lib/errors";
import { useErrorToss } from "@/lib/errorToss";
import { Delete, Eye } from "lucide-react";

export function SidebarBuildsList({ workspaceId }: { workspaceId: string }) {
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
    <SimpleSelectableList.Root
      data={builds}
      getItemId={(build) => build.guid}
      onClick={handleView}
      onDelete={handleDelete}
      emptyLabel="no builds found"
      showGrip={false}
    >
      <SimpleSelectableList.Actions />

      <SimpleSelectableList.Items>
        <div className="flex flex-col gap-2 mt-4 ml-3 group">
          {builds.length === 0 && <EmptySidebarLabel label="no builds" />}
          {builds.map((build) => (
            <SimpleSelectableList.Item key={build.guid} id={build.guid}>
              <BuildLabel build={build} />
              <SimpleSelectableList.ItemMenu>
                <SimpleSelectableList.ItemAction
                  onClick={() => handleView(build.guid)}
                  icon={<Eye className="w-4 h-4" />}
                >
                  View
                </SimpleSelectableList.ItemAction>
                <SimpleSelectableList.ItemAction
                  onClick={() => handleDelete(build.guid)}
                  icon={<Delete className="w-4 h-4" />}
                  destructive
                >
                  Delete
                </SimpleSelectableList.ItemAction>
              </SimpleSelectableList.ItemMenu>
            </SimpleSelectableList.Item>
          ))}
        </div>
      </SimpleSelectableList.Items>
    </SimpleSelectableList.Root>
  );
}
