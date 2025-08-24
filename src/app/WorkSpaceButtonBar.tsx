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
import { BombIcon, ChevronDown, CirclePlus, Delete, SearchIcon, Settings, Zap } from "lucide-react";
import React from "react";
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
            "cursor-pointer flex items-center workspace-button-subtle-hover text-muted-foreground stroke-muted-foreground bg-accent",
            isSmall ? "w-4 h-4 justify-center rounded-sm" : "w-20 py-2 gap-2 flex-col",
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

  // variant is controlled by shrink
  const variant: ButtonVariant = shrink ? "sm" : "lg";

  return (
    <div
      className={cn(
        "[&>*]:outline-none max-h-full flex flex-col gap-4 justify-center items-center",
        shrink ? "w-6" : "w-24"
      )}
    >
      <div className="flex justify-center flex-col items-center w-full ">
        <Link to={"/"}>
          <div className="rotate-12">
            <div className={cn("outline-none", { "animate-spin": pending })}>
              <div
                className={cn("rounded-sm mt-4", {
                  "h-7 w-7 mb-4": !shrink,
                  "h-4 w-4": shrink,
                })}
                style={{
                  backgroundImage: "url(/opal.svg)",
                  backgroundRepeat: "repeat",
                  backgroundSize: "auto",
                }}
              ></div>
            </div>
          </div>
        </Link>
      </div>
      <div
        className={cn("max-h-full gap-4 flex justify-center flex-col items-center w-full", {
          "_mt-3": shrink,
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
            icon={<WorkspaceIcon input={coalescedWorkspace.guid} />}
            title={coalescedWorkspace.name}
            to={coalescedWorkspace.href}
            truncate={true}
            className="text-foreground big-button-active whitespace-nowrap truncate"
          />
        )}

        {otherWorkspacesCount > 0 && (
          <Collapsible
            className="w-full flex flex-col justify-start pb-0 scrollbar-thin items-center min-h-0 "
            open={expand}
            onOpenChange={setExpand}
          >
            <CollapsibleTrigger className="mt-2 h-8 flex-shrink-0 group w-full stroke-muted-foreground text-muted-foreground bg-accent flex items-center relative workspace-button-subtle-hover">
              <ChevronDown size={16} className="group-data-[state=closed]:hidden w-full" />
              <div className=" group-data-[state=open]:hidden text-primary-foreground absolute top-0 right-2 rounded-full bg-primary w-[1.25rem] p-0 flex justify-center items-center h-[1.25rem] text-xs">
                {otherWorkspacesCount}
              </div>
              <div className="absolute group-data-[state=open]:hidden flex w-full justify-center ">
                <OpalSvg className={cn("rounded overflow-clip rotate-12")} />
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="w-full min-h-0 max-h-full overflow-y-scroll no-scrollbar">
              {workspaces.map((workspace) => (
                <BigButton
                  variant={variant}
                  icon={<WorkspaceIcon input={workspace.guid} />}
                  to={workspace.href}
                  truncate={true}
                  className="whitespace-nowrap"
                  title={workspace.name}
                  key={workspace.guid}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
