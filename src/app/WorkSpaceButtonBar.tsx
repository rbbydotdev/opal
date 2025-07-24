"use client";

import { unregisterServiceWorkers } from "@/app/unregisterServiceWorkers";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkspaceIcon } from "@/components/WorkspaceIcon";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { WorkspaceSearchDialog } from "@/features/workspace-search/SearchDialog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useRequestSignals } from "@/lib/RequestSignals";
import { cn } from "@/lib/utils";
import { BombIcon, ChevronDown, CirclePlus, Delete, SearchIcon, Settings, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { twMerge } from "tailwind-merge";

function BigButton({
  icon,
  title,
  active,
  ...restProps
}: {
  icon: React.ReactNode;
  title?: string;
  active?: boolean;
} & React.ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const isActive = active ?? pathname === restProps.href;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          {...restProps}
          className={twMerge(
            "text-3xs py-2 cursor-pointer w-full hover:bg-slate-800 gap-2 stroke-slate-500 text-slate-500 hover:stroke-white hover:text-white bg-secondary-foreground flex items-center",
            restProps.className
          )}
        >
          <div className="w-full items-center">
            {isActive && <div className="w-0.5 h-full bg-white ml-1"></div>}
            <div className="flex flex-col items-center justify-center">
              {icon}
              {title && (
                <div className="uppercase text-ellipsis px-2 pt-2 text-center overflow-clip w-full">{title}</div>
              )}
            </div>
          </div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" align="center" className="uppercase">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

export function WorkspaceButtonBar() {
  const { pending } = useRequestSignals();
  return <WorkspaceButtonBarInternal pending={pending} />;
}
function WorkspaceButtonBarInternal({ pending }: { pending: boolean }) {
  const { currentWorkspace, workspaces } = useWorkspaceContext();
  const [expand, setExpand] = useLocalStorage("BigButtonBar/expand", false);
  const coalescedWorkspace = !currentWorkspace?.isNull ? currentWorkspace : workspaces[0];
  const otherWorkspacesCount = workspaces.filter((ws) => ws.guid !== coalescedWorkspace?.guid).length;
  const router = useRouter();
  return (
    <div className="[&>*]:outline-none  max-h-full flex flex-col">
      <div className="flex justify-center flex-col items-center w-full ">
        <Link href={"/"} className={cn("outline-none", { "animate-spin": pending })}>
          <div className="rotate-12">
            <div
              className="h-7 w-7 rounded-sm mt-4 mb-4"
              style={{
                backgroundImage: "url(/opal.svg)",
                backgroundRepeat: "repeat",
                backgroundSize: "auto",
              }}
            ></div>
          </div>
        </Link>
      </div>

      {process.env.NODE_ENV === "development" ? (
        <>
          <BigButton
            icon={<BombIcon stroke="current" size={24} strokeWidth={1.25} />}
            title={"Destroy All"}
            href="#"
            onClick={() =>
              Promise.all([
                // deleteIDBs(),
                currentWorkspace.tearDown(),
                WorkspaceDAO.all().then((workspaces) =>
                  workspaces.map((ws) =>
                    ws
                      .toModel()
                      .tearDown()
                      .then((ws) => ws.delete())
                  )
                ),
                unregisterServiceWorkers(),
                //@ts-expect-error
              ]).then(() => (window.location = "/newWorkspace"))
            }
          />
          <BigButton
            icon={<Delete stroke="current" size={24} strokeWidth={1.25} />}
            title={"Delete All"}
            href="#"
            onClick={() => Workspace.DeleteAll().then(() => router.push("/newWorkspace"))}
          />
          <BigButton
            icon={<Delete stroke="current" size={24} strokeWidth={1.25} />}
            title={"Unregister Services"}
            href="#"
            onClick={() => {
              // Unregister all service workers for this origin
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
          icon={<SearchIcon stroke="current" size={24} strokeWidth={1.25} />}
          title="search"
          href="#"
          className="text-3xs"
        />
      </WorkspaceSearchDialog>
      <BigButton
        className="hidden"
        icon={<Zap stroke="current" size={24} strokeWidth={1.25} />}
        title="connections"
        href="/connections"
      />
      <BigButton
        className="hidden"
        icon={<Settings stroke="current" size={24} strokeWidth={1.25} />}
        title="settings"
        href="/settings"
      />
      <BigButton
        icon={<CirclePlus stroke="current" size={24} strokeWidth={1.25} />}
        title="new workspace"
        href={"/newWorkspace"}
        className="text-3xs"
      />

      {coalescedWorkspace && (
        <BigButton
          icon={<WorkspaceIcon input={coalescedWorkspace.guid} />}
          title={coalescedWorkspace.name}
          href={coalescedWorkspace.href}
          className="text-white big-button-active"
        />
      )}

      {otherWorkspacesCount > 0 && (
        <Collapsible
          className="w-full flex flex-col justify-start pb-0 scrollbar-thin items-center min-h-0 "
          open={expand}
          onOpenChange={setExpand}
        >
          <CollapsibleTrigger
            className="mt-2 h-8 flex-shrink-0 group w-full hover:bg-slate-800 stroke-slate-500 text-slate-500 hover:stroke-slate-200
  hover:text-slate-200 bg-secondary-foreground flex items-center relative "
          >
            <ChevronDown size={16} className="group-data-[state=closed]:hidden w-full" />
            <div className=" group-data-[state=open]:hidden text-white absolute top-0 right-2 rounded-full bg-slate-700 w-[1.25rem] p-0 flex justify-center items-center h-[1.25rem] text-xs">
              {otherWorkspacesCount}
            </div>
            <div className="absolute group-data-[state=open]:hidden flex w-full justify-center ">
              {/* <DatabaseZap size={16} className="w-full m-auto absolute r-0" /> */}
              <img src="/opal-blank.svg" className="w-6 h-6 rounded overflow-clip rotate-12" alt="Opal Icon" />
            </div>

            {/* <div className="w-full flex justify-center items-center text-xs relative">
            </div> */}
          </CollapsibleTrigger>

          <CollapsibleContent className="w-full min-h-0  max-h-full overflow-y-scroll no-scrollbar">
            {workspaces.map((workspace) => (
              <BigButton
                icon={<WorkspaceIcon input={workspace.guid} />}
                href={workspace.href}
                title={workspace.name}
                key={workspace.guid}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
