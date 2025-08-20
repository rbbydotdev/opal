import { useScrollSync } from "@/components/ScrollSync";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function LivePreviewButton({ disabled }: { disabled?: boolean }) {
  const { previewURL } = useScrollSync();
  return disabled ? (
    <Button size="sm" className="opacity-70" disabled={disabled}>
      Live Preview <Zap className="!text-primary-foreground" />
    </Button>
  ) : (
    <Button size="sm" className="pointer-events-auto" asChild>
      <Link to={previewURL} target="_blank">
        Live Preview <Zap className="!text-primary-foreground" />
      </Link>
    </Button>
  );
}
