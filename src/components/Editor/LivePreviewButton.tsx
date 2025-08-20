import { sessionIdParam, useScrollSync } from "@/components/ScrollSync";
import { Button } from "@/components/ui/button";
import { useWorkspaceRoute } from "@/context/WorkspaceContext";
import { absPath, joinPath } from "@/lib/paths2";
import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function LivePreviewButton({ disabled }: { disabled?: boolean }) {
  const { id: workspaceId, path: filePath } = useWorkspaceRoute();
  const { sessionId } = useScrollSync();
  return disabled ? (
    <Button size="sm" className="opacity-70" disabled={disabled}>
      Live Preview <Zap className="!text-primary-foreground" />
    </Button>
  ) : (
    <Button size="sm" className="pointer-events-auto" asChild>
      <Link
        to={
          joinPath(
            absPath("preview"),
            workspaceId!,
            filePath! + `?${sessionIdParam({ sessionId: sessionId! })}`
          ) as string
        }
        target="_blank"
      >
        Live Preview <Zap className="!text-primary-foreground" />
      </Link>
    </Button>
  );
}
