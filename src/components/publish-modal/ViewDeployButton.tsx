import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

interface ViewDeployButtonProps {
  url?: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  className?: string;
}

export function ViewDeployButton({ url, children, variant = "outline", className }: ViewDeployButtonProps) {
  const isDisabled = !url;

  return (
    <Button
      className={className}
      variant={variant}
      disabled={isDisabled}
      asChild={!isDisabled}
    >
      {isDisabled ? (
        <div className="flex items-center gap-2">
          <Globe size={16} />
          {children}
        </div>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <div className="flex items-center gap-2">
            <Globe size={16} />
            {children}
          </div>
        </a>
      )}
    </Button>
  );
}