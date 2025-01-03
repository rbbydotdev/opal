"use client";
import Identicon from "@/components/Identicon";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkspaceContext } from "@/context";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ChevronDown, ChevronUp, CirclePlus, Delete, Settings, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useMemo } from "react";
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
            "text-3xs py-2 cursor-pointer w-full hover:bg-slate-800 gap-2 stroke-slate-500 text-slate-500 hover:stroke-white hover:text-white bg-slate-900 flex items-center",
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
//               {/* <div className="flex-shrink-1 max-w-full overflow-hidden whitespace-nowrap text-ellipsis uppercase p-1 flex items-center justify-center text-center font-mono"> */}
const deleteAllDbs = () =>
  window.indexedDB
    .databases()
    .then((r) => {
      for (let i = 0; i < r.length; i++) window.indexedDB.deleteDatabase(r[i].name!);
    })
    .then(() => {
      console.log("All data cleared.");
    });

export function BigButtonBar() {
  const { currentWorkspace, workspaces } = useContext(WorkspaceContext);

  const [expand, setExpand] = useLocalStorage("BigButtonBar/expand", false);

  const filteredWorkspaces = useMemo(
    () => workspaces.filter((workspace) => workspace.guid !== currentWorkspace?.guid),
    [workspaces, currentWorkspace]
  );
  return (
    <div className="py-8 bg-slate-900 dark:bg-slate-100 w-20 flex flex-col flex-shrink-0">
      <BigButton
        icon={<Delete stroke="current" size={32} strokeWidth={1.25} />}
        title={"delete_all"}
        href="#"
        onClick={deleteAllDbs}
      />
      <BigButton icon={<Zap stroke="current" size={32} strokeWidth={1.25} />} title="connections" href="/connections" />
      <BigButton icon={<Settings stroke="current" size={32} strokeWidth={1.25} />} title="settings" href="/settings" />

      {currentWorkspace && (
        <BigButton
          icon={<Identicon input={currentWorkspace.guid} size={4} scale={7} />}
          title={currentWorkspace.name}
          href={currentWorkspace.href}
          className="text-white"
        />
      )}
      <Collapsible
        className="w-full flex flex-col justify-start overflow-scroll pb-12 scrollbar-thin items-center"
        open={expand}
        onOpenChange={setExpand}
      >
        {workspaces.length > 1 && (
          <CollapsibleTrigger
            className="h-8 flex-shrink-0 group w-full hover:bg-slate-800 stroke-slate-500 text-slate-500 hover:stroke-slate-200
  hover:text-slate-200 bg-slate-900 flex items-center"
          >
            <ChevronUp size={16} className="group-data-[state=closed]:hidden w-full" />
            <ChevronDown size={16} className="group-data-[state=open]:hidden w-full" />
          </CollapsibleTrigger>
        )}

        <CollapsibleContent className="w-full bg-slate-800 ">
          {filteredWorkspaces.map((workspace) => (
            <BigButton
              icon={<Identicon input={workspace.guid} size={4} scale={7} />}
              className=""
              href={workspace.href}
              title={workspace.name}
              key={workspace.guid}
            />
          ))}
        </CollapsibleContent>

        <BigButton
          icon={<CirclePlus stroke="current" size={32} strokeWidth={1.25} />}
          title="new workspace"
          href="/workspace/new"
          className="text-3xs"
        />
      </Collapsible>
    </div>
  );
}
