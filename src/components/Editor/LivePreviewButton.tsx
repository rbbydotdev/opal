import { useWorkspacePathPreviewURL } from "@/components/ScrollSync";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ExternalLinkIcon } from "lucide-react";

export function LivePreviewButton({ disabled }: { disabled?: boolean }) {
  const previewURL = useWorkspacePathPreviewURL();
  return disabled ? (
    <Button size="sm" className="opacity-70" disabled={disabled}>
      Live Preview <ExternalLinkIcon className="!text-primary-foreground" />
    </Button>
  ) : (
    <Button size="sm" className="pointer-events-auto" asChild>
      <Link to={previewURL!} target="_blank">
        Live Preview <ExternalLinkIcon className="!text-primary-foreground" />
      </Link>
    </Button>
  );
}
