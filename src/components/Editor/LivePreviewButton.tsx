import { sessionIdParam, useScrollSync } from "@/components/ScrollSync";
import { Button } from "@/components/ui/button";
import { useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { absPath, joinPath } from "@/lib/paths2";
import { Zap } from "lucide-react";
import Link from "next/link";

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
        href={joinPath(absPath("preview"), workspaceId!, filePath! + `?${sessionIdParam({ sessionId: sessionId! })}`)}
        target="_blank"
      >
        Live Preview <Zap className="!text-primary-foreground" />
      </Link>
    </Button>
  );
}
