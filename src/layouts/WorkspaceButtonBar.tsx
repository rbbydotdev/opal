import { useConfirm } from "@/components/ConfirmContext";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { OpalSvg } from "@/components/OpalSvg";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkspaceIcon } from "@/components/workspace/WorkspaceIcon";
import { WorkspaceMenu } from "@/components/workspace/WorkspaceMenu";
import { BuildDAO } from "@/data/dao/BuildDAO";
import { WorkspaceDAO } from "@/data/dao/WorkspaceDAO";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { useToggleEditHistory } from "@/editor/history/useToggleEditHistory";
import { useToggleHistoryImageGeneration } from "@/editor/history/useToggleHistoryImageGeneration";
import { ALL_THEMES } from "@/features/theme/theme-lib";
import { ThemePreview } from "@/features/theme/ThemePreview";
import { WorkspaceSearchDialog } from "@/features/workspace-search/SearchDialog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useZoom } from "@/hooks/useZoom";
import { useLeftCollapsed } from "@/layouts/EditorSidebarLayout";
import { clearAllCaches } from "@/lib/clearAllCaches";
import { IS_MAC } from "@/lib/isMac";
import { useRequestSignals } from "@/lib/RequestSignals";
import { unregisterServiceWorkers } from "@/lib/service-worker/unregisterServiceWorkers";
import { cn } from "@/lib/utils";
import { useWorkspacButtonBarSpin } from "@/useWorkspacButtonBarSpin";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { Workspace } from "@/workspace/Workspace";
import { useWorkspaceContext } from "@/workspace/WorkspaceContext";
import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import {
  BombIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  CirclePlus,
  Clock,
  Delete,
  GlassesIcon,
  KeyboardIcon,
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
import React from "react";
import { twMerge } from "tailwind-merge";
import { useThemeContext } from "./ThemeContext";

type ButtonVariant = "lg" | "sm";

function useShrink() {
  return useLocalStorage("BigButtonBar/shrink", false);
}

function BigButton({
  icon,
  title,
  active,
  truncate,
  variant = "lg",
  badge = null,
  ...restProps
}: {
  badge?: React.ReactNode;
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
            "w-full border-l-2 hover:border-ring border-transparent duration-500 transition-colors transform cursor-pointer flex items-center text-muted-foreground stroke-muted-foreground _bg-muted",
            isSmall ? "w-6 h-6 justify-center rounded-sm" : "py-2 gap-2 flex-col",
            restProps.className
          )}
        >
          <div
            className={cn("flex items-center justify-center", {
              "flex-col w-full": !isSmall,
            })}
          >
            {isActive && !isSmall && <div className="w-0.5 h-full bg-primary absolute left-0"></div>}
            <div
              className={cn("flex items-center justify-center", {
                "w-6 h-6": isSmall,
                "w-8 h-8": !isSmall,
              })}
            >
              {badge}
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

function WorkspaceButtonBarContextMenu({ shrink }: { shrink: boolean }) {
  const { storedValue: spin, setStoredValue: setSpin } = useWorkspacButtonBarSpin();
  const { mode, value, themeName, setPreference, setTheme } = useThemeContext();
  const { setStoredValue: setCollapsed, storedValue: collapsed } = useLeftCollapsed();
  const { setZoom, isCurrentZoom, availableZooms } = useZoom();

  const { isHistoryImageGenerationEnabled, toggleHistoryImageGeneration } = useToggleHistoryImageGeneration();
  const { isEditHistoryEnabled, toggleEditHistory } = useToggleEditHistory();
  const router = useRouter();
  const { open } = useConfirm();
  const keepMenuOpen = (fn: () => void) => (e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) e.preventDefault();
    fn();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Link
          to={"/"}
          className={cn("absolute z-50 h-14  cursor-pointer ", {
            "w-6 left-[0.125rem] -top-5": shrink,
            "w-16 left-2 -top-7": !shrink,
          })}
        ></Link>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {/* Light */}
        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2"
          onClick={keepMenuOpen(() => setPreference("light"))}
        >
          {value === "light" ? <Check size={12} /> : <div className="w-4" />}
          <Sun size={12} />
          <span className="pr-4">Light</span>
        </ContextMenuItem>

        {/* Dark */}
        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2"
          onClick={keepMenuOpen(() => setPreference("dark"))}
        >
          {value === "dark" ? <Check size={12} /> : <div className="w-4" />}
          <Moon size={12} />
          <span className="pr-4">Dark</span>
        </ContextMenuItem>

        {/* System */}
        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2"
          onClick={keepMenuOpen(() => setPreference("system"))}
        >
          {value === "system" ? <Check size={12} /> : <div className="w-4" />}
          <Settings size={12} />
          <span className="pr-4">System</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Spinner */}
        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2"
          onClick={keepMenuOpen(() => setSpin((prev) => !prev))}
        >
          {spin ? <Check size={12} /> : <div className="w-4" />}
          <RefreshCcw size={12} />
          <span className="pr-4">Spinner</span>
        </ContextMenuItem>

        {/* Show Sidebar */}
        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2"
          onClick={keepMenuOpen(() => setCollapsed((v) => !v))}
        >
          {!collapsed ? <Check size={12} /> : <div className="w-4" />}
          <Sidebar size={12} />
          <span className="pr-4">Show Sidebar</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger className="pl-8 gap-2">
            <GlassesIcon size={12} />
            Zoom
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="max-h-48 overflow-y-auto">
            {availableZooms.map((zoom) => (
              <ContextMenuItem
                className="grid grid-cols-[1rem_1fr] items-center gap-2"
                key={zoom}
                onClick={keepMenuOpen(() => setZoom(zoom))}
              >
                {isCurrentZoom(zoom) ? <Check size={12} /> : <div className="w-4"></div>}
                <span className="pr-4">{Math.round(zoom * 100)}%</span>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Themes Submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger className="pl-8 gap-2">
            <Palette size={12} />
            Themes
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="max-h-48 overflow-y-auto">
            {ALL_THEMES.map((theme) => (
              <ContextMenuItem
                className="grid grid-cols-[1rem_1fr] items-center gap-2"
                key={theme}
                onClick={keepMenuOpen(() => setTheme(theme))}
              >
                {themeName === theme ? <Check size={12} /> : <div className="w-4"></div>}
                <ThemePreview themeName={theme} mode={mode} />
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2"
          onClick={keepMenuOpen(toggleEditHistory)}
        >
          {isEditHistoryEnabled ? <Check size={12} /> : <div className="w-4" />}
          <Clock size={12} />
          <span className="pr-4">Use Editor History</span>
        </ContextMenuItem>

        {isEditHistoryEnabled && (
          <ContextMenuItem
            className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2"
            onClick={keepMenuOpen(toggleHistoryImageGeneration)}
          >
            {isHistoryImageGenerationEnabled ? <Check size={12} /> : <div className="w-4" />}
            <span className="font-mono text-lg">{"└"}</span>
            <span className="pr-4">Use History Images</span>
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {/* Delete All Workspaces */}
        <ContextMenuItem
          className="grid grid-cols-[1rem_1rem_1fr] items-center gap-2 text-destructive"
          onClick={keepMenuOpen(() =>
            open(
              async () =>
                Promise.all([
                  ...(await WorkspaceDAO.all().then((wss) => wss.map((ws) => Workspace.FromDAO(ws).destroy()))),
                ]).then(() => {
                  void router.navigate({ to: "/newWorkspace" });
                }),
              "Delete all workspaces",
              "This will delete all workspaces and cannot be undone. Are you sure you want to continue?"
            )
          )}
        >
          <X size={12} className="text-destructive" />
          <span className="col-span-2 pr-4 text-3xs uppercase">Delete all workspaces</span>
        </ContextMenuItem>

        <ContextMenuSeparator />
        <ContextMenuLabel className="py-2 text-2xs w-full text-muted-foreground font-thin justify-center flex gap-2">
          {IS_MAC ? "⌘ cmd" : "ctrl"} + click / multi-select
        </ContextMenuLabel>
      </ContextMenuContent>
    </ContextMenu>
  );
}
export function WorkspaceButtonBar() {
  const { storedValue: shrink } = useShrink();
  const { pending } = useRequestSignals();
  const { currentWorkspace, workspaces } = useWorkspaceContext();
  const { storedValue: expand, setStoredValue: setExpand } = useLocalStorage("BigButtonBar/expand", false);
  const { storedValue: spin } = useWorkspacButtonBarSpin();
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
          <div className="w-full flex flex-col gap-4">
            {process.env.NODE_ENV === "development" ? (
              <>
                <BigButton
                  variant={variant}
                  icon={<BombIcon strokeWidth="1" stroke="current" className="w-full h-full" />}
                  title={"Destroy All"}
                  to="#"
                  onClick={() =>
                    Promise.all([
                      (() => {
                        console.log("Unregistering service workers...");
                      })(),
                      clearAllCaches(),
                      BuildDAO.all().then((builds) => Promise.all(builds.map((build) => build.delete()))),
                      DiskDAO.all().then((disks) => Promise.all(disks.map((disk) => disk.delete()))),
                      RemoteAuthDAO.all().then((auths) => Promise.all(auths.map((auth) => auth.delete()))),
                      currentWorkspace.tearDown(),
                      WorkspaceDAO.all().then((workspaces) =>
                        Promise.all(
                          workspaces.map((ws) =>
                            Workspace.FromDAO(ws)
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
                  onClick={async () => {
                    const promises: Promise<boolean>[] = [];
                    await navigator.serviceWorker.getRegistrations().then(async (registrations) => {
                      for (const registration of registrations) {
                        promises.push(registration.unregister());
                      }
                      await Promise.all(promises);
                    });
                    alert("All service workers unregistered!");
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

            <KeyboardShortcutsModal>
              <BigButton
                variant={variant}
                icon={<KeyboardIcon strokeWidth="1" stroke="current" className="w-full h-full" />}
                title="shortcuts"
                to="#"
              />
            </KeyboardShortcutsModal>

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
                  icon={
                    <WorkspaceIcon className="w-full h-full" scale={shrink ? 5 : 7} input={coalescedWorkspace.guid} />
                  }
                  title={coalescedWorkspace.name}
                  to={coalescedWorkspace.href}
                  truncate={true}
                  className="text-muted-foreground big-button-active truncate"
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
              <CollapsibleTrigger className="h-8 flex-shrink-0 group w-full stroke-muted-foreground text-muted-foreground flex items-center relative ">
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
                  <OpalSvg
                    className={cn("rounded overflow-clip rotate-12", {
                      "w-8": !shrink,
                      "w-5": shrink,
                    })}
                  />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="w-full h-full overflow-y-scroll no-scrollbar flex justify-start gap-2 flex-col items-center pb-8">
                {workspaces.map((workspace) => (
                  <WorkspaceMenu workspaceGuid={workspace.guid} key={workspace.guid} workspaceName={workspace.name}>
                    <BigButton
                      variant={variant}
                      badge={workspace.isOk() ? null : <ErrorBadge />}
                      icon={<WorkspaceIcon className="w-full h-full" scale={shrink ? 5 : 7} input={workspace.guid} />}
                      to={workspace.href}
                      truncate={true}
                      className="text-muted-foreground"
                      title={workspace.name}
                    />
                  </WorkspaceMenu>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      <DragCollapseBar />
    </div>
  );
}

const ErrorBadge = () => {
  return (
    <div className="absolute top-0 right-3 w-5 h-5 p-1 flex items-center justify-center bg-destructive text-destructive-foreground rounded-full border-2">
      <span className="text-2xs font-mono text-bold bold">!</span>
    </div>
  );
};

function DragCollapseBar() {
  const { setStoredValue, storedValue: shrink } = useShrink();
  return (
    <div
      onClick={() => setStoredValue(!shrink)}
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
