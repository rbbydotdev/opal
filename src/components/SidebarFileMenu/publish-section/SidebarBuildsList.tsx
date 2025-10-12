import { SelectableList, SelectableListItem } from "@/components/ui/SelectableList";
import { BuildDAO } from "@/Db/BuildDAO";
import { useErrorToss } from "@/lib/errorToss";
import { Archive, Calendar } from "lucide-react";
import { useEffect, useState } from "react";

export interface SidebarBuildsListProps {
  diskId?: string;
  selectedBuildIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onDelete?: (buildId: string) => void;
  className?: string;
}

export function SidebarBuildsList({
  diskId,
  selectedBuildIds = [],
  onSelectionChange,
  onDelete,
  className,
}: SidebarBuildsListProps) {
  const [builds, setBuilds] = useState<BuildDAO[]>([]);
  const [loading, setLoading] = useState(true);
  const errorToss = useErrorToss();

  const loadBuilds = async () => {
    try {
      setLoading(true);
      const buildList = diskId 
        ? await BuildDAO.allForDisk(diskId)
        : await BuildDAO.all();
      setBuilds(buildList);
    } catch (error) {
      errorToss(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuilds();
  }, [diskId]);

  const handleDelete = async (buildId: string) => {
    try {
      const build = builds.find(b => b.guid === buildId);
      if (build) {
        await build.delete();
        setBuilds(prev => prev.filter(b => b.guid !== buildId));
        onDelete?.(buildId);
      }
    } catch (error) {
      errorToss(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${Math.max(1, minutes)}m ago`;
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
        <span>{formatTimestamp(build.timestamp)}</span>
      </div>
    ),
  }));

  if (loading) {
    return (
      <SelectableList
        title="Recent Builds"
        titleIcon={<Archive size={12} />}
        items={[]}
        emptyMessage="Loading builds..."
        expanderId="builds"
        className={className}
      />
    );
  }

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
}