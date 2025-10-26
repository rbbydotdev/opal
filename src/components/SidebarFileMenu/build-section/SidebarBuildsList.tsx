import { SelectableList, SelectableListItem } from "@/components/ui/SelectableList";
import { BuildDAO } from "@/Db/BuildDAO";
import { coerceError } from "@/lib/errors";
import { useErrorToss } from "@/lib/errorToss";
import { Archive, Calendar } from "lucide-react";
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
  { diskId, selectedBuildIds = [], onSelectionChange, onDelete, className },
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

  const items: SelectableListItem[] = builds.map((build) => ({
    id: build.guid,
    label: build.label,
    subtitle: `Disk: ${build.diskId.slice(-8)}`, // Show last 8 chars of disk ID
    icon: <Archive size={14} className="text-muted-foreground" />,
    metadata: (
      <div className="flex items-center gap-1">
        <Calendar size={10} />
        <span>{timeAgo(build.timestamp)}</span>
      </div>
    ),
  }));

  return (
    <SelectableList
      title="Recent Builds"
      titleIcon={<Archive size={12} />}
      items={items}
      selectedIds={selectedBuildIds}
      onSelectionChange={onSelectionChange}
      onDelete={handleDelete}
      multiSelect={true}
      emptyMessage="No builds found"
      showDeleteButton={true}
      maxHeight="250px"
      expanderId="builds"
      className={className}
    />
  );
});
