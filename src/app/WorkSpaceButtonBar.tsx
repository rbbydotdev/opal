"use client";

import { unregisterServiceWorkers } from "@/app/unregisterServiceWorkers";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SearchModal } from "@/components/ui/search-modal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkspaceIcon } from "@/components/WorkspaceIcon";
import { WorkspaceContext } from "@/context";
import { Workspace } from "@/Db/Workspace";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useRequestSignals } from "@/lib/RequestSignals";
import clsx from "clsx";
import { BombIcon, ChevronDown, CirclePlus, DatabaseZap, Delete, SearchIcon, Settings, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { use, useMemo } from "react";
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
                <div className="uppercase text-ellipsis px-2 pt-2 text-center overflow-hidden w-full">{title}</div>
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

export function WorkSpaceButtonBar() {
  // const { currentWorkspace, workspaces } = useWorkspaceContext();
  const { currentWorkspace, workspaces } = use(WorkspaceContext);

  const [expand, setExpand] = useLocalStorage("BigButtonBar/expand", false);

  const coalescedWorkspace = !currentWorkspace?.isNull ? currentWorkspace : workspaces[0];

  //               {/* <div className="flex-shrink-1 max-w-full overflow-hidden whitespace-nowrap text-ellipsis uppercase p-1 flex items-center justify-center text-center font-mono"> */}
  const filteredWorkspaces = useMemo(
    () => workspaces.filter((workspace) => workspace.guid !== coalescedWorkspace?.guid),
    [workspaces, coalescedWorkspace]
  );
  // const { isLoading } = useIsNavigatingWorkspace();
  const otherWorkspacesCount = workspaces.filter((ws) => ws.guid !== coalescedWorkspace?.guid).length;
  const { pending } = useRequestSignals();
  return (
    <>
      <div className="flex justify-center flex-col items-center w-full">
        <Link href={"/"} className={clsx({ "animate-spin": pending })}>
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

      <BigButton
        icon={<BombIcon stroke="current" size={32} strokeWidth={1.25} />}
        title={"Nuke All"}
        href="#"
        onClick={() =>
          Promise.all([
            // deleteIDBs(),
            currentWorkspace.tearDown(),
            Workspace.all().then((wss) => Promise.all(wss.map((ws) => ws.toModel().then((ws) => ws.delete())))),
            unregisterServiceWorkers(),
            //@ts-expect-error
          ]).then(() => (window.location = "/new"))
        }
      />
      <BigButton
        icon={<Delete stroke="current" size={32} strokeWidth={1.25} />}
        title={"Delete All"}
        href="#"
        onClick={() => Workspace.DeleteAll()}
      />

      <SearchModal>
        <BigButton
          icon={<SearchIcon stroke="current" size={32} strokeWidth={1.25} />}
          title="search"
          href="#"
          className="text-3xs"
        />
      </SearchModal>
      <BigButton
        className="hidden"
        icon={<Zap stroke="current" size={32} strokeWidth={1.25} />}
        title="connections"
        href="/connections"
      />
      <BigButton
        className="hidden"
        icon={<Settings stroke="current" size={32} strokeWidth={1.25} />}
        title="settings"
        href="/settings"
      />
      <BigButton
        icon={<CirclePlus stroke="current" size={32} strokeWidth={1.25} />}
        title="new workspace"
        href="/new"
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
          className="w-full flex flex-col justify-start overflow-scroll pb-12 scrollbar-thin items-center"
          open={expand}
          onOpenChange={setExpand}
        >
          <CollapsibleTrigger
            className="h-8 flex-shrink-0 group w-full hover:bg-slate-800 stroke-slate-500 text-slate-500 hover:stroke-slate-200
  hover:text-slate-200 bg-secondary-foreground flex items-center relative"
          >
            <ChevronDown size={16} className="group-data-[state=closed]:hidden w-full" />
            <div className=" group-data-[state=open]:hidden text-white absolute top-0 right-2 rounded-full bg-slate-700 w-[1.25rem] p-0 flex justify-center items-center h-[1.25rem] text-xs">
              {otherWorkspacesCount}
            </div>
            <DatabaseZap size={16} className="group-data-[state=open]:hidden w-full m-auto absolute r-0" />

            {/* <div className="w-full flex justify-center items-center text-xs relative">
            </div> */}
          </CollapsibleTrigger>

          <CollapsibleContent className="w-full bg-slate-800 ">
            {filteredWorkspaces.map((workspace) => (
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
    </>
  );
}
