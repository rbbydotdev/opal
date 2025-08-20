import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export function LivePreviewButton({ disabled }: { disabled?: boolean }) {
  const handlePreviewPane = () => {};
  return disabled ? (
    <Button size="sm" className="opacity-70" disabled={disabled}>
      Live Preview <Zap className="!text-primary-foreground" />
    </Button>
  ) : (
    <Button size="sm" className="pointer-events-auto" onClick={handlePreviewPane}>
      Live Preview <Zap className="!text-primary-foreground" />
    </Button>
  );
}
