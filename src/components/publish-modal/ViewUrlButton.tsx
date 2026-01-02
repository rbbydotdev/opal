import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUrlStatusPoll } from "@/hooks/useUrlStatusPoll";
import { AlertTriangle, Globe, Loader } from "lucide-react";

interface ViewUrlButtonProps {
  url?: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  className?: string;
}

export function ViewUrlButton({ url, children, variant = "outline", className }: ViewUrlButtonProps) {
  const { status, error } = useUrlStatusPoll(url);
  // https://rbbydotdev.github.io/purposeful-404
  // const { status, error } = useUrlStatusPoll("https://rbbydotdev.github.io/purposeful-404");

  const showError = status === "error" && error;
  const showLoading = status === "checking";
  const isDisabled = status === "disabled";

  const buttonContent = (
    <Button
      className={className}
      variant={showError ? "destructive" : variant}
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
            {showError && <AlertTriangle size={16} />}
            {showLoading && <Loader size={16} className="animate-spin" />}
            {!showLoading && !showError && <Globe size={16} />}
            {children}
          </div>
        </a>
      )}
    </Button>
  );

  if (showError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent>
            <p>{error}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
}
