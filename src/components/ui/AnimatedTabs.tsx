import { cn } from "@/lib/utils";

// interface MiniTabProps

export function MiniTab({
  children,
  active,
  notify,
  onClick,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  className?: string;
  notify?: boolean;
}) {
  return (
    <>
      <button
        tabIndex={0}
        onClick={onClick}
        data-active-tab={active}
        className={cn(
          "relative",
          "flex-shrink mr-1 w-full min-w-0 truncate rounded-t border-muted active:scale-95 active:translate-y-0.5 text-muted-foreground bg-muted/50 hover:text-primary hover:scale-105 transition-transform border-t border-l border-r text-xs p-2 font-mono",
          {
            "bg-muted border-b border-b-ring": active,
            "bg-transparent": !active,
            "after-dot": notify,
          },
          className
        )}
      >
        {children}
      </button>
      {/* <div className="w-2 h-2 bg-ring"></div> */}
      {/* <div className="w-4 flex-shrink"></div> */}
    </>
  );
}
