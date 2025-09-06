import { useLeftCollapsed, useSidebarWidth } from "@/app/EditorSidebarLayout";
import { unregisterServiceWorkers } from "@/app/unregisterServiceWorkers";
import { OpalSvg } from "@/components/OpalSvg";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkspaceIcon } from "@/components/WorkspaceIcon";
import { WorkspaceMenu } from "@/components/WorkspaceMenu";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { DiskDAO } from "@/Db/DiskDAO";
import { RemoteAuthDAO } from "@/Db/RemoteAuth";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { WorkspaceSearchDialog } from "@/features/workspace-search/SearchDialog";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { useThemeSettings } from "@/layouts/ThemeProvider";
import { clearAllCaches } from "@/lib/clearAllCaches";
import { useRequestSignals } from "@/lib/RequestSignals";
import { cn } from "@/lib/utils";
import { FAVORITE_THEMES } from "@/theme/theme-lib";
import { ThemePreview } from "@/theme/ThemePreview";
import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import {
  BombIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  CirclePlus,
  Delete,
  Moon,
  Palette,
  RefreshCcw,
  SearchIcon,
  Settings,
  Sidebar,
  Sun,
  X,
  Zap,
} from "lucide-react";
import React, { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

type ButtonVariant = "lg" | "sm";

function useShrink() {
  return useLocalStorage2("BigButtonBar/shrink", true);
}
function useAutoHide() {
  return useLocalStorage2("BigButtonBar/autohide", true);
}

function BigButton({
  icon,
  title,
  active,
  truncate,
  variant = "lg",
  ...restProps
}: {
  icon: React.ReactNode;
  title?: React.ReactNode | null;
  truncate?: boolean;
  active?: boolean;
  variant?: ButtonVariant;
} & React.ComponentProps<typeof Link>) {
  const location = useLocation();
  const isActive = active ?? location.pathname === restProps.to;

  const isSmall = variant === "sm";

  return (
    <Tooltip open={isSmall ? undefined : false}>
      <TooltipTrigger asChild>
        <Link
          {...restProps}
          className={twMerge(
            "w-full hover:scale-105 scale-95 transition-transform cursor-pointer flex items-center text-muted-foreground stroke-muted-foreground _bg-muted",
            isSmall ? "w-6 h-6 justify-center rounded-sm" : "py-2 gap-2 flex-col",
            restProps.className
          )}
        >
          <div
            className={cn("flex items-center justify-center", {
              "flex-col w-full": !isSmall,
            })}
          >
            {isActive && !isSmall && <div className="w-0.5 h-full bg-primary _ml-1 absolute left-0"></div>}
            <div
              className={cn("flex items-center justify-center", {
                "w-6 h-6": isSmall,
                "w-8 h-8": !isSmall,
              })}
            >
              {icon}
            </div>
            {!isSmall &&
              (typeof title === "string" ? (
                <div
                  className={cn("uppercase pt-2 text-center w-full text-3xs truncate", {
                    truncate: Boolean(truncate),
                  })}
                >
                  {title}
                </div>
              ) : (
                title
              ))}
          </div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" align="center" className="uppercase">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

export function WorkspaceButtonBar({}: {}) {
  const { storedValue: shrink, setStoredValue: setShrink } = useShrink();
  const { storedValue: autoHide } = useAutoHide();

  const setShrinkRef = useRef(setShrink);
  const { width: sidebarWidth, collapsed } = useSidebarWidth();
  setShrinkRef.current = setShrink;
  useEffect(() => {
    if (!autoHide) return;
    //create dock hidden behavior for left side of screen
    const thresholdExpand = 50;
    const thresholdShrink = sidebarWidth + 50;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const onMouseMove = (e: MouseEvent) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (e.clientX < thresholdExpand && shrink) {
          //expand
          setShrinkRef.current?.(false);
        }
        if (e.clientX > thresholdShrink && !shrink) {
          //shrink
          setShrinkRef.current?.(true);
        }
      }, 250);
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [autoHide, collapsed, setShrink, shrink, sidebarWidth]);

  return <WorkspaceButtonBarInternal shrink={shrink} autoHide={autoHide} />;
}

function WorkspaceButtonBarContextMenu({ shrink }: { shrink: boolean }) {
  const { storedValue: spin, setStoredValue: setSpin } = useLocalStorage2("WorkspaceButtonBar/spin", true);
  const { mode, value, themeName, setPreference, setTheme } = useThemeSettings();
  const { setStoredValue: setAutoHide, storedValue: autoHide } = useAutoHide();
  const { setStoredValue: setCollapsed, storedValue: collapsed } = useLeftCollapsed();
  const router = useRouter();

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Link
          to={"/"}
          className={cn("absolute z-50 -top-8 h-14 left-0 cursor-pointer _bg-red-700 _opacity-25", {
            "w-6": shrink,
            "w-14": !shrink,
          })}
        ></Link>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {/* Light */}
        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2"
          onClick={() => setPreference("light")}
        >
          {value === "light" ? <Check size={12} /> : <div className="w-4" />}
          <Sun size={12} />
          <span className="pr-4">Light</span>
        </ContextMenuItem>

        {/* Dark */}
        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2"
          onClick={() => setPreference("dark")}
        >
          {value === "dark" ? <Check size={12} /> : <div className="w-4" />}
          <Moon size={12} />
          <span className="pr-4">Dark</span>
        </ContextMenuItem>

        {/* System */}
        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2"
          onClick={() => setPreference("system")}
        >
          {value === "system" ? <Check size={12} /> : <div className="w-4" />}
          <Settings size={12} />
          <span className="pr-4">System</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Spinner */}
        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2"
          onClick={() => setSpin((prev) => !prev)}
        >
          {spin ? <Check size={12} /> : <div className="w-4" />}
          <RefreshCcw size={12} />
          <span className="pr-4">Spinner</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Auto-hide Dock */}
        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2"
          onClick={() => setAutoHide((v) => !v)}
        >
          {autoHide ? <Check size={12} /> : <div className="w-4" />}
          <Sidebar size={12} />
          <span className="pr-4">Auto-hide Dock</span>
        </ContextMenuItem>

        {/* Show Sidebar */}
        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2"
          onClick={() => setCollapsed((v) => !v)}
        >
          {!collapsed ? <Check size={12} /> : <div className="w-4" />}
          <Sidebar size={12} />
          <span className="pr-4">Show Sidebar</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Themes Submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger className="pl-8 gap-2">
            <Palette size={12} />
            Themes
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="max-h-48 overflow-y-auto">
            {FAVORITE_THEMES.map((theme) => (
              <ContextMenuItem
                className="grid grid-cols-[1rem_1fr] items-center gap-2"
                key={theme}
                onClick={() => setTheme(theme)}
              >
                {themeName === theme ? <Check size={12} /> : <div className="w-4"></div>}
                <ThemePreview themeName={theme} mode={mode} />
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        {/* Delete All Workspaces */}
        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2 text-destructive"
          onClick={async () =>
            Promise.all([...(await WorkspaceDAO.all().then((wss) => wss.map((ws) => ws.toModel().destroy())))]).then(
              () => {
                void router.navigate({ to: "/newWorkspace" });
              }
            )
          }
        >
          <X size={12} className="text-destructive" />
          <span className="col-span-2 pr-4 text-3xs uppercase">Delete all workspaces</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function WorkspaceButtonBarInternal({ shrink, autoHide }: { shrink: boolean; autoHide: boolean }) {
  const { pending } = useRequestSignals();
  const { currentWorkspace, workspaces } = useWorkspaceContext();
  const { storedValue: expand, setStoredValue: setExpand } = useLocalStorage2("BigButtonBar/expand", false);
  const { storedValue: spin } = useLocalStorage2("WorkspaceButtonBar/spin", true);
  const coalescedWorkspace = !currentWorkspace?.isNull ? currentWorkspace : workspaces[0];
  const otherWorkspacesCount = workspaces.filter((ws) => ws.guid !== coalescedWorkspace?.guid).length;
  const navigate = useNavigate();
  const variant: ButtonVariant = shrink ? "sm" : "lg";

  return (
    <div className="flex relative min-h-0">
      <div
        className={cn(
          "[&>*]:outline-none transition-all [&>*]:select-none relative min-h-0 flex flex-col gap-4 justify-center items-center ",
          shrink ? "w-8" : "w-20"
        )}
      >
        <div
          className={cn("flex justify-center flex-col items-center w-full min-h-0", {
            "mt-[1.35rem]": shrink,
            "mb-4 mt-8": !shrink,
          })}
        >
          <div className="relative w-full justify-center flex items-center ">
            <WorkspaceButtonBarContextMenu shrink={shrink} />
            <div className={cn("rotate-12 absolute inset-0 m-auto", { "h-5 w-5 mt-0": shrink, "h-7 w-7": !shrink })}>
              <div className={cn("outline-none", { "animate-spin": spin && pending })}>
                <OpalSvg className={"rounded overflow-clip"} />
              </div>
            </div>
          </div>
        </div>
        <div
          className={cn("min-h-0 px-1 gap-4 flex justify-center flex-col items-center w-full", {
            "mt-8": shrink,
          })}
        >
          <div className="w-full _px-2 flex flex-col gap-4">
            {process.env.NODE_ENV === "development" ? (
              <>
                <BigButton
                  variant={variant}
                  icon={<BombIcon strokeWidth="1" stroke="current" className="w-full h-full" />}
                  title={"Destroy All"}
                  to="#"
                  onClick={() =>
                    Promise.all([
                      clearAllCaches(),
                      DiskDAO.all().then((disks) => Promise.all(disks.map((disk) => disk.delete()))),
                      RemoteAuthDAO.all().then((auths) => Promise.all(auths.map((auth) => auth.delete()))),
                      currentWorkspace.tearDown(),
                      WorkspaceDAO.all().then((workspaces) =>
                        Promise.all(
                          workspaces.map((ws) =>
                            ws
                              .toModel()
                              .tearDown()
                              .then((ws) => ws.destroy())
                          )
                        )
                      ),
                      unregisterServiceWorkers(),
                    ]).then(() => navigate({ to: "/newWorkspace" }))
                  }
                />
                <BigButton
                  variant={variant}
                  icon={<Delete strokeWidth="1" stroke="current" className="w-full h-full" />}
                  title={"Delete All"}
                  to="#"
                  onClick={() => Workspace.DeleteAll().then(() => navigate({ to: "/newWorkspace" }))}
                />
                <BigButton
                  variant={variant}
                  icon={<Delete strokeWidth="1" stroke="current" className="w-full h-full" />}
                  title={"Unregister Services"}
                  to="#"
                  onClick={() => {
                    const promises: Promise<boolean>[] = [];
                    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
                      for (const registration of registrations) {
                        promises.push(registration.unregister());
                      }
                      await Promise.all(promises);
                      alert("All service workers unregistered!");
                    });
                  }}
                />
              </>
            ) : null}

            <WorkspaceSearchDialog>
              <BigButton
                variant={variant}
                icon={<SearchIcon strokeWidth="1" stroke="current" className="w-full h-full" />}
                title="search"
                to="#"
              />
            </WorkspaceSearchDialog>

            <BigButton
              variant={variant}
              className="hidden"
              icon={<Zap stroke="current" strokeWidth="1" className="w-full h-full" />}
              title="connections"
              to="/connections"
            />
            <BigButton
              variant={variant}
              className="hidden"
              icon={<Settings stroke="current" strokeWidth="1" className="w-full h-full" />}
              title="settings"
              to="/settings"
            />
            <BigButton
              variant={variant}
              icon={<CirclePlus stroke="current" strokeWidth="1" className="w-full h-full" />}
              title="new workspace"
              href={"/newWorkspace"}
            />

            {coalescedWorkspace && (
              <WorkspaceMenu workspaceGuid={coalescedWorkspace.guid} workspaceName={coalescedWorkspace.name}>
                <BigButton
                  variant={variant}
                  icon={<WorkspaceIcon scale={shrink ? 5 : 7} input={coalescedWorkspace.guid} />}
                  title={coalescedWorkspace.name}
                  to={coalescedWorkspace.href}
                  truncate={true}
                  className="text-muted-foreground big-button-active _whitespace-nowrap truncate"
                />
              </WorkspaceMenu>
            )}
          </div>

          {otherWorkspacesCount > 0 && (
            <Collapsible
              className="w-full flex flex-col justify-start pb-0 scrollbar-thin items-center min-h-0 "
              open={expand}
              onOpenChange={setExpand}
            >
              <CollapsibleTrigger className="h-8 flex-shrink-0 group w-full stroke-muted-foreground text-muted-foreground _bg-muted flex items-center relative ">
                <ChevronDown size={16} className="group-data-[state=closed]:hidden w-full" />
                <div
                  className={cn(
                    { "w-[1.25rem] h-[1.25rem] text-xs": !shrink, "w-3 h-3 text-2xs": shrink },
                    "z-10 group-data-[state=open]:hidden text-primary-foreground absolute top-0 right-1 rounded-full bg-destructive p-0 flex justify-center items-center ",
                    {
                      "-right-1": shrink,
                    }
                  )}
                >
                  {otherWorkspacesCount}
                </div>
                <div className="top-2 absolute group-data-[state=open]:hidden flex w-full justify-center ">
                  <div>
                    <OpalSvg
                      className={cn("rounded overflow-clip rotate-12", {
                        "w-9": !shrink,
                        "w-5": shrink,
                      })}
                    />
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="w-full h-full _bg-green-500 overflow-y-scroll no-scrollbar flex justify-start gap-2 flex-col items-center pb-8">
                {workspaces.map((workspace) => (
                  <WorkspaceMenu workspaceGuid={workspace.guid} key={workspace.guid} workspaceName={workspace.name}>
                    <BigButton
                      variant={variant}
                      icon={<WorkspaceIcon scale={shrink ? 5 : 7} input={workspace.guid} />}
                      to={workspace.href}
                      truncate={true}
                      className="_whitespace-nowrap text-muted-foreground"
                      title={workspace.name}
                    />
                  </WorkspaceMenu>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {!autoHide && <DragCollapseBar />}
    </div>
  );
}

function DragCollapseBar() {
  const THRESHOLD = 5;
  const startXRef = React.useRef(0);
  const { setStoredValue, storedValue: shrink } = useShrink();
  const draggingRef = useRef({ isDragging: false, shrink: (_v: boolean) => {}, cleanup: () => {} });
  draggingRef.current.shrink = setStoredValue;

  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    startXRef.current = e.clientX;
    draggingRef.current.isDragging = true;

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mouseleave", onMouseUp);
    draggingRef.current.cleanup = () => {
      draggingRef.current.isDragging = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mouseleave", onMouseUp);
    };
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!draggingRef.current) {
      return;
    }
    const delta = e.clientX - startXRef.current;
    if ((!shrink && delta < -1 * THRESHOLD) || (shrink && delta > THRESHOLD)) {
      draggingRef.current.shrink(!shrink);
      draggingRef.current.cleanup();
    }
  };

  const onMouseUp = (e: MouseEvent) => {
    if (draggingRef.current) {
      const delta = e.clientX - startXRef.current;
      if (delta < -5) {
        draggingRef.current.shrink(true);
      }
    }
    draggingRef.current.cleanup();
  };

  return (
    <div
      onClick={() => setStoredValue(!shrink)}
      onMouseDown={onMouseDown}
      className={cn("group bg-primary absolute right-0 hover:w-2 w-0.5 select-none flex justify-center items-center", {
        "cursor-w-resize h-16": !shrink,
        "cursor-e-resize h-16": shrink,
      })}
    >
      <ChevronLeft
        size={12}
        className={cn("flex-shrink-0 group-hover:block hidden", {
          "rotate-180": shrink,
        })}
        strokeWidth={2}
      />
    </div>
  );
}
