import { useConfirm } from "@/components/Confirm";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { CurrentWorkspaceIcon } from "@/components/WorkspaceIcon";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { useRouter } from "@tanstack/react-router";
import { Delete } from "lucide-react";
import { useMemo } from "react";

export function WorkspaceMenu({
  children,
  workspace,
}: {
  children: React.ReactNode;
  workspace: Workspace | WorkspaceDAO;
}) {
  const router = useRouter();
  const { open } = useConfirm();
  const ws = useMemo(() => {
    if (workspace instanceof Workspace) {
      return workspace;
    } else {
      return workspace.toModel();
    }
  }, [workspace]);
  const currentWorkspace = ws;
  if (currentWorkspace.isNull) return null;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            void open(
              async () => {
                await currentWorkspace.destroy();
                if (currentWorkspace.href === window.location.pathname) {
                  void router.navigate({ to: "/" });
                }
              },
              "Delete Workspace",
              <div className="text-lg flex flex-col gap-2">
                <div>⚠️ Are you sure you want to delete workspace ?</div>
                <div>
                  <CurrentWorkspaceBadge name={currentWorkspace.name} />
                </div>
                <b>This action cannot be undone.</b>
              </div>
            );
          }}
        >
          <div className="gap-2 flex items-center justify-center w-full">
            <Delete className="text-destructive" size={12} /> <div>Delete</div>
          </div>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

const CurrentWorkspaceBadge = ({ name }: { name: string }) => {
  return (
    <div className="rounded p-1 px-2 flex items-center gap-2 border-2 border-secondary-foreground shadow-md">
      <CurrentWorkspaceIcon variant="round" />
      {name}
    </div>
  );
};
