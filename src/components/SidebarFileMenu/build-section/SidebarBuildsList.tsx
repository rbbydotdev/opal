import { SelectableList } from "@/components/ui/SelectableList";
import { BuildDAO } from "@/data/BuildDAO";
import { coerceError } from "@/lib/errors";
import { useErrorToss } from "@/lib/errorToss";
import { Archive, Delete, Eye } from "lucide-react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { timeAgo } from "short-time-ago";

export interface SidebarBuildsListProps {
  diskId?: string;
  selectedBuildIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onDelete?: (buildId: string) => void;
  className?: string;
}

export interface SidebarBuildsListRef {
  refresh: () => Promise<void>;
}

export const SidebarBuildsList = forwardRef<SidebarBuildsListRef, SidebarBuildsListProps>(function SidebarBuildsList(
  { diskId, onDelete },
  ref
) {
  const [builds, setBuilds] = useState<BuildDAO[]>([]);
  const errorToss = useErrorToss();

  const loadBuilds = useCallback(async () => {
    try {
      const buildList = diskId ? await BuildDAO.allForDisk(diskId) : await BuildDAO.all();
      setBuilds(buildList);
    } catch (error) {
      errorToss(coerceError(error));
    }
  }, [diskId, errorToss]);

  useEffect(() => {
    void loadBuilds();
  }, [diskId, loadBuilds]);

  useImperativeHandle(
    ref,
    () => ({
      refresh: loadBuilds,
    }),
    [loadBuilds]
  );

  const handleDelete = async (buildId: string) => {
    try {
      const build = builds.find((b) => b.guid === buildId);
      if (build) {
        await build.delete();
        setBuilds((prev) => prev.filter((b) => b.guid !== buildId));
        onDelete?.(buildId);
      }
    } catch (error) {
      errorToss(coerceError(error));
    }
  };

  const handleView = (buildId: string) => {
    // This could open a build details modal in the future
    console.log("View build:", buildId);
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
        <SelectableList.Map 
          doTheMap={(build) => (
            <SelectableList.Item key={build.guid} id={build.guid}>
              <SelectableList.ItemIcon>
                <Archive size={12} className="flex-shrink-0 text-muted-foreground" />
              </SelectableList.ItemIcon>
              <div className="flex flex-col min-w-0 ml-1">
                <div className="font-mono text-xs truncate">{build.label}</div>
                <div className="text-2xs text-muted-foreground truncate">
                  Disk: {build.diskId.slice(-8)} • {timeAgo(build.timestamp)}
                </div>
              </div>
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
          )}
        />
      </SelectableList.Content>
    </SelectableList.Root>
  );
});
