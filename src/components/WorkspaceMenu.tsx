import { useConfirm } from "@/components/Confirm";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { WorkspaceIcon } from "@/components/WorkspaceIcon";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { useRouter } from "@tanstack/react-router";
import { Delete } from "lucide-react";

export function WorkspaceMenu({
  children,
  workspaceGuid,
  workspaceName,
}: {
  children: React.ReactNode;
  workspaceName: string;
  workspaceGuid: string;
}) {
  const router = useRouter();
  const { open } = useConfirm();
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            void open(
              async () => {
                const currentWorkspace = await WorkspaceDAO.FetchByGuid(workspaceGuid).then((ws) => ws.toModel());
                await currentWorkspace.destroy();
                if (currentWorkspace.href === window.location.pathname) {
                  void router.navigate({ to: "/" });
                }
              },
              "Delete Workspace",
              <span className="text-lg flex flex-col gap-2">
                <span>⚠️ Are you sure you want to delete this workspace ?</span>
                <span>
                  <CurrentWorkspaceBadge name={workspaceName} workspaceId={workspaceGuid} />
                </span>
                <b>This action cannot be undone.</b>
              </span>
            );
          }}
        >
          <div className="gap-2 flex items-center justify-center w-full h-full">
            <Delete className="text-destructive w-5 h-5" size={12} strokeWidth={1} />
            Delete
          </div>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

const CurrentWorkspaceBadge = ({ name, workspaceId }: { name: string; workspaceId: string }) => {
  return (
    <div className="rounded p-1 px-2 flex items-center gap-2 border-2 border-secondary-foreground shadow-md text-foreground">
      <WorkspaceIcon variant="round" input={workspaceId} />
      {name}
    </div>
  );
};
