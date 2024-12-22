import { Files, PlusCircle, Settings, type LucideIcon } from "lucide-react";

function BigButton({ Icon }: { Icon: LucideIcon }) {
  return (
    <div className="h-20 cursor-pointer w-full hover:bg-slate-800 gap-2 stroke-slate-500 text-slate-500 hover:stroke-slate-200 hover:text-slate-200 bg-slate-900 flex flex-col items-center justify-center">
      <Icon stroke="current" size={32} strokeWidth={1.25} />
      <div className="text-2xs uppercase">Settings</div>
    </div>
  );
}
export function BigButtonBar() {
  return (
    <div className="bg-slate-900 dark:bg-slate-100 w-20">
      <BigButton Icon={Settings} />
      <BigButton Icon={Files} />
      <BigButton Icon={PlusCircle} />
    </div>
  );
}
