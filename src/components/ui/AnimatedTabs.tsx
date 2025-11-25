import { useAnimatedTabs } from "@/hooks/useAnimatedTabs";
import { cn } from "@/lib/utils";

interface AnimatedTabsProps<T extends string> {
  activeTab: T;
  children: React.ReactNode;
  className?: string;
}

export function AnimatedTabs<T extends string>({ activeTab, children, className }: AnimatedTabsProps<T>) {
  const { tabsRef } = useAnimatedTabs(activeTab);

  return (
    <div ref={tabsRef} className={className}>
      <div className="flex">{children}</div>
      <div
        className="bg-ring"
        style={{
          height: "1px",
          width: "var(--underline-width, 0px)",
          left: "var(--underline-left, 0px)",
          marginTop: "-1px",
          transition: "all 0.2s ease",
          position: "relative",
        }}
      />
    </div>
  );
}

interface MiniTabProps {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  className?: string;
}

export function MiniTab({ children, active, onClick, className }: MiniTabProps) {
  return (
    <>
      <button
        tabIndex={0}
        onClick={onClick}
        data-active-tab={active}
        className={cn(
          "flex-shrink w-full min-w-0 truncate rounded-t border-muted active:scale-95 active:translate-y-0.5 text-muted-foreground bg-muted/50 hover:text-primary hover:scale-105 transition-transform border-t border-l border-r text-xs p-2 font-mono",
          {
            "bg-muted": active,
            "bg-transparent": !active,
          },
          className
        )}
      >
        {children}
      </button>
    </>
  );
}
