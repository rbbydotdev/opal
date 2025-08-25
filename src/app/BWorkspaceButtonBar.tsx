import { unregisterServiceWorkers } from "@/app/unregisterServiceWorkers";
import { OpalSvg } from "@/components/OpalSvg";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkspaceIcon } from "@/components/WorkspaceIcon";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { DiskDAO } from "@/Db/DiskDAO";
import { RemoteAuthDAO } from "@/Db/RemoteAuth";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { WorkspaceSearchDialog } from "@/features/workspace-search/SearchDialog";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { clearAllCaches } from "@/lib/clearAllCaches";
import { useRequestSignals } from "@/lib/RequestSignals";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { BombIcon, ChevronDown, ChevronLeft, CirclePlus, Delete, SearchIcon, Settings, Zap } from "lucide-react";
import React, { useRef } from "react";
import { twMerge } from "tailwind-merge";

type ButtonVariant = "lg" | "sm";

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
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          {...restProps}
          className={twMerge(
            "w-full hover:scale-105 scale-95 transition-transform cursor-pointer flex items-center text-muted-foreground stroke-muted-foreground _bg-accent",
            isSmall ? "w-4 h-4 justify-center rounded-sm" : "py-2 gap-2 flex-col",
            restProps.className
          )}
        >
          <div
            className={cn("flex items-center justify-center", {
              "flex-col w-full": !isSmall,
            })}
          >
            {isActive && !isSmall && <div className="w-0.5 h-full bg-primary ml-1 absolute left-0"></div>}
            <div
              className={cn("flex items-center justify-center", {
                "w-4 h-4": isSmall,
                "w-8 h-8": !isSmall,
              })}
            >
              {icon}
            </div>
            {!isSmall &&
              (typeof title === "string" ? (
                <div className={cn("uppercase px-2 pt-2 text-center w-full text-3xs", { truncate: Boolean(truncate) })}>
                  {title}
                </div>
              ) : (
                title
              ))}
          </div>
        </Link>
      </TooltipTrigger>
      {isSmall && title ? (
        <TooltipContent side="right" align="center" className="uppercase">
          {title}
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}

export function WorkspaceButtonBar() {
  const { storedValue: shrink } = useLocalStorage2("BigButtonBar/shrink", true);
  return <WorkspaceButtonBarInternal shrink={shrink} />;
}

function WorkspaceButtonBarInternal({ shrink }: { shrink: boolean }) {
  const { pending } = useRequestSignals();
  const { currentWorkspace, workspaces } = useWorkspaceContext();
  const { storedValue: expand, setStoredValue: setExpand } = useLocalStorage2("BigButtonBar/expand", false);
  const coalescedWorkspace = !currentWorkspace?.isNull ? currentWorkspace : workspaces[0];
  const otherWorkspacesCount = workspaces.filter((ws) => ws.guid !== coalescedWorkspace?.guid).length;
  const navigate = useNavigate();

  const variant: ButtonVariant = shrink ? "sm" : "lg";

  return (
    <div className="flex relative">
      <div
        className={cn(
          "[&>*]:outline-none [&>*]:select-none relative max-h-full flex flex-col gap-4 justify-center items-center",
          shrink ? "w-6" : "w-16"
        )}
      >
        <div
          className={cn("flex justify-center flex-col items-center w-full", {
            "mt-[1.35rem]": shrink,
            "mb-4  mt-4": !shrink,
          })}
        >
          <Link to={"/"}>
            <div className="rotate-12">
              <div className={cn("outline-none", { "animate-spin": pending })}>
                <OpalSvg className={cn("rounded overflow-clip", { "h-5 w-5": shrink, "h-7 w-7": !shrink })} />
              </div>
            </div>
          </Link>
        </div>
        <div
          className={cn("max-h-full gap-4 flex justify-center flex-col items-center w-full", {
            "mt-8": shrink,
          })}
        >
          {process.env.NODE_ENV === "development" ? (
            <>
              <BigButton
                variant={variant}
                icon={<BombIcon stroke="current" className="w-full h-full" />}
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
                            .then((ws) => ws.delete())
                        )
                      )
                    ),
                    unregisterServiceWorkers(),
                  ]).then(() => navigate({ to: "/newWorkspace" }))
                }
              />
              <BigButton
                variant={variant}
                icon={<Delete stroke="current" className="w-full h-full" />}
                title={"Delete All"}
                to="#"
                onClick={() => Workspace.DeleteAll().then(() => navigate({ to: "/newWorkspace" }))}
              />
              <BigButton
                variant={variant}
                icon={<Delete stroke="current" className="w-full h-full" />}
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
              icon={<SearchIcon stroke="current" className="w-full h-full" />}
              title="search"
              to="#"
            />
          </WorkspaceSearchDialog>

          <BigButton
            variant={variant}
            className="hidden"
            icon={<Zap stroke="current" className="w-full h-full" />}
            title="connections"
            to="/connections"
          />
          <BigButton
            variant={variant}
            className="hidden"
            icon={<Settings stroke="current" className="w-full h-full" />}
            title="settings"
            to="/settings"
          />
          <BigButton
            variant={variant}
            icon={<CirclePlus stroke="current" className="w-full h-full" />}
            title="new workspace"
            href={"/newWorkspace"}
          />

          {coalescedWorkspace && (
            <BigButton
              variant={variant}
              icon={<WorkspaceIcon scale={shrink ? 3 : 7} input={coalescedWorkspace.guid} />}
              title={coalescedWorkspace.name}
              to={coalescedWorkspace.href}
              truncate={true}
              className="text-muted-foreground big-button-active whitespace-nowrap truncate"
            />
          )}

          {otherWorkspacesCount > 0 && (
            <Collapsible
              className="w-full flex flex-col justify-start pb-0 scrollbar-thin items-center min-h-0 "
              open={expand}
              onOpenChange={setExpand}
            >
              <CollapsibleTrigger className="mt-2 h-8 flex-shrink-0 group w-full stroke-muted-foreground text-muted-foreground _bg-accent flex items-center relative ">
                <ChevronDown size={16} className="group-data-[state=closed]:hidden w-full" />
                <div
                  className={cn(
                    { "w-[1.25rem] h-[1.25rem] text-xs": !shrink, "w-3 h-3 text-2xs": shrink },
                    "z-10 group-data-[state=open]:hidden text-muted-foreground absolute top-0 right-2 rounded-full bg-primary p-0 flex justify-center items-center "
                  )}
                >
                  {otherWorkspacesCount}
                </div>
                <div className="absolute group-data-[state=open]:hidden flex w-full justify-center ">
                  <div>
                    <OpalSvg
                      className={cn("rounded overflow-clip rotate-12", {
                        "w-9": !shrink,
                        "w-3": shrink,
                      })}
                    />
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="w-full min-h-0 max-h-full overflow-y-scroll no-scrollbar flex justify-center gap-2 flex-col items-center">
                {workspaces.map((workspace) => (
                  <BigButton
                    variant={variant}
                    icon={<WorkspaceIcon scale={shrink ? 3 : 7} input={workspace.guid} />}
                    to={workspace.href}
                    truncate={true}
                    className="whitespace-nowrap text-muted-foreground"
                    title={workspace.name}
                    key={workspace.guid}
                  />
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

function DragCollapseBar() {
  const THRESHOLD = 5;
  const startXRef = React.useRef(0);
  const { setStoredValue, storedValue: shrink } = useLocalStorage2("BigButtonBar/shrink", true);
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
