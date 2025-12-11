import { WorkspaceIcon } from "@/components/workspace/WorkspaceIcon";
import { cn } from "@/lib/utils";

export const WorkspaceBadge = ({
  name,
  workspaceId,
  className,
}: {
  name: string;
  workspaceId: string;
  className?: string;
}) => {
  return (
    <span
      className={cn(
        "rounded p-1 px-2 inline-flex items-center gap-2 border-2 border-secondary-foreground shadow-md text-foreground",
        className
      )}
    >
      <WorkspaceIcon variant="round" input={workspaceId} />
      {name}
    </span>
  );
};
