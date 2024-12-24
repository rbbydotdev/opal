"use client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronUp, CirclePlus, Files, LucideIcon, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
function BigButton({
  Icon,
  title,
  active,
  ...restProps
}: {
  Icon: LucideIcon;
  title?: string;
  active?: boolean;
} & React.ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const isActive = active ?? pathname === restProps.href;
  return (
    <Link
      {...restProps}
      className={twMerge(
        "h-16 p-0 cursor-pointer w-full hover:bg-slate-800 gap-2 stroke-slate-500 text-slate-500 hover:stroke-slate-200 hover:text-slate-200 bg-slate-900 flex items-center",
        restProps.className
      )}
    >
      <div className="grid w-full items-center">
        {isActive && <div className="w-0.5 h-full bg-white col-start-1 row-start-1 ml-1"></div>}
        <div className="flex flex-col items-center justify-center col-start-1 row-start-1">
          <Icon stroke="current" size={32} strokeWidth={1.25} />
          {title && (
            <div className="text-2xs uppercase p-1 flex items-center justify-center text-center font-mono">{title}</div>
          )}
        </div>
      </div>
    </Link>
  );
}

function DropDownButton({
  Icon,
  title,
  href,
  className,
}: {
  Icon: LucideIcon;
  title?: string;
  href: string;
  className?: string;
}) {
  return (
    <Link
      className={twMerge(
        "group h-16 p-0 cursor-pointer w-full gap-2 stroke-slate-500 text-slate-500 hover:stroke-slate-200  flex items-center",

        className
      )}
      href={href}
    >
      <div className="grid w-full items-center">
        {/* <div className="w-1 h-1 bg-white col-start-1 row-start-1 ml-1  hidden group-hover:block"></div> */}
        <div className="flex flex-col items-center justify-center col-start-1 row-start-1">
          <Icon stroke="current" size={24} strokeWidth={1.25} />
          {title && (
            <div className="text-2xs uppercase p-1 flex items-center justify-center text-center font-mono">{title}</div>
          )}
        </div>
      </div>
    </Link>
  );
}

function BigButtonWorkspaceDropDown() {
  const [expand, setExpand] = useState(false);

  const pathname = usePathname();
  return (
    <>
      <BigButton
        Icon={Files}
        title=""
        href="/"
        onClick={(e) => {
          if (pathname === "/") {
            e.preventDefault();
            setExpand(!expand);
          }
        }}
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
          <DropDownButton Icon={Files} title="" href="/workspace/foo" className="stroke-blue-600" />
          <DropDownButton Icon={Files} title="" href="/workspace/bar" className="stroke-green-600" />
          <DropDownButton Icon={Files} title="" href="/workspace/bazz" className="stroke-red-600" />
          <DropDownButton Icon={CirclePlus} title="" href="/" className="stroke-white" />
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

export function BigButtonBar() {
  return (
    <div className="bg-slate-900 dark:bg-slate-100 w-16 py-4 flex flex-col flex-shrink-0">
      <BigButtonWorkspaceDropDown />
      <BigButton Icon={Settings} title="" href="/settings" />
    </div>
  );
}
