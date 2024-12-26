"use client";
import Identicon from "@/components/Identicon";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ChevronDown, ChevronUp, CirclePlus, Settings, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
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
    <Link
      {...restProps}
      className={twMerge(
        "text-3xs h-16 p-0 cursor-pointer w-full hover:bg-slate-800 gap-2 stroke-slate-500 text-slate-500 hover:stroke-white hover:text-white bg-slate-900 flex items-center",
        restProps.className
      )}
    >
      <div className="grid w-full items-center">
        {isActive && <div className="w-0.5 h-full bg-white col-start-1 row-start-1 ml-1"></div>}
        <div className="flex flex-col items-center justify-center col-start-1 row-start-1">
          {icon}
          {title && <div className="uppercase p-1 flex items-center justify-center text-center font-mono">{title}</div>}
        </div>
      </div>
    </Link>
  );
}

function DropDownButton({
  icon,
  title,
  href,
  className,
}: {
  icon: React.ReactNode;
  title?: string;
  href: string;
  className?: string;
}) {
  return (
    <Link
      className={twMerge(
        "text-3xs group h-16 p-0 cursor-pointer w-full gap-2 stroke-slate-500 text-slate-500 hover:stroke-white hover:text-white  flex items-center",

        className
      )}
      href={href}
    >
      <div className="grid w-full items-center">
        {/* <div className="w-1 h-1 bg-white col-start-1 row-start-1 ml-1  hidden group-hover:block"></div> */}
        <div className="flex flex-col items-center justify-center col-start-1 row-start-1">
          {/* <Icon stroke="current" size={24} strokeWidth={1.25} /> */}
          {/* {Icon} */}
          {icon}
          {title && <div className="uppercase p-1 flex items-center justify-center text-center font-mono">{title}</div>}
        </div>
      </div>
    </Link>
  );
}

export function BigButtonBar({ workspaces }: { workspaces: Workspaces }) {
  const [expand, setExpand] = useLocalStorage("BigButtonBar/expand", false);
  const [selectedWorkspace, setSelectedWorkspace] = useLocalStorage("BigButtonBar/selectedWorkspace", workspaces[0]);
  const pathname = usePathname();
  // const [currentWorkspace, restWorkspaces] = useWorkspaces(pathname);
  // this needs to be hoisted up to a provider
  const currentWorkspace =
    workspaces.filter((workspace) => pathname.startsWith(workspace.href))[0] ?? selectedWorkspace;
  const restWorkspaces = workspaces.filter((workspace) => workspace.href !== currentWorkspace.href);
  useEffect(() => {
    if (workspaces.some((wrk) => wrk.href.startsWith(pathname))) {
      setSelectedWorkspace(currentWorkspace);
    }
  }, [currentWorkspace, pathname, setSelectedWorkspace, workspaces]);

  return (
    <div className="bg-slate-900 dark:bg-slate-100 w-20 flex flex-col flex-shrink-0 pt-4">
      <BigButton icon={<Zap stroke="current" size={32} strokeWidth={1.25} />} title="connections" href="/connections" />
      <BigButton icon={<Settings stroke="current" size={32} strokeWidth={1.25} />} title="settings" href="/settings" />
      <BigButton
        icon={<Identicon input={currentWorkspace.href} size={4} scale={7} />}
        title={currentWorkspace.name}
        href={currentWorkspace.href}
        className="text-white"
      />
      <Collapsible className="w-full flex flex-col justify-center items-center" open={expand} onOpenChange={setExpand}>
        <CollapsibleTrigger
          className="h-8 group w-full hover:bg-slate-800 stroke-slate-500 text-slate-500 hover:stroke-slate-200
  hover:text-slate-200 bg-slate-900 flex items-center"
        >
          <ChevronUp size={16} className="group-data-[state=closed]:hidden w-full" />
          <ChevronDown size={16} className="group-data-[state=open]:hidden w-full" />
        </CollapsibleTrigger>
        <CollapsibleContent className="w-full bg-slate-800">
          {restWorkspaces.map((workspace) => (
            <DropDownButton
              icon={<Identicon input={workspace.href} size={4} scale={7} />}
              className=""
              href={workspace.href}
              title={workspace.name}
              key={workspace.href}
            />
          ))}
        </CollapsibleContent>
        <DropDownButton
          icon={<CirclePlus stroke="current" size={32} strokeWidth={1.25} />}
          title="new workspace"
          href="/workspace/new"
          className="text-3xs"
        />
      </Collapsible>
    </div>
  );
}
