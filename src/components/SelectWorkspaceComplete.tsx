"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WorkspaceIcon } from "@/components/WorkspaceIcon";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { ALL_WS_KEY } from "@/features/workspace-search/AllWSKey";
import { Opal } from "@/lib/Opal";
import { cn } from "@/lib/utils";

const ALL = {
  icon: <Opal />,
  label: "All Workspaces",
};
const WSIcon = (id: string) => (
  <WorkspaceIcon variant="square" size={3} scale={4} input={id} className="border border-primary-foreground" />
);
export function SelectWorkspaceComplete({
  workspaces,
  defaultValue,
  initialValue,
  onChange,
}: {
  workspaces: WorkspaceDAO[];
  defaultValue: string;
  initialValue: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(initialValue ?? defaultValue);

  type WorkspaceOption = {
    value: string;
    label: string;
    icon: React.JSX.Element;
  };

  const workspacesOptions: WorkspaceOption[] = React.useMemo(
    () => [
      { value: ALL_WS_KEY, label: ALL.label, icon: ALL.icon },
      ...workspaces.map((ws) => ({
        value: ws.name,
        icon: WSIcon(ws.guid),
        label: ws.name,
      })),
    ],
    [workspaces]
  );
  const handleSelect = (currentValue: string) => {
    const newVal = currentValue === value ? defaultValue : currentValue;
    onChange(newVal);
    setValue(newVal);
    setOpen(false);
  };
  const currWs = workspacesOptions.find((workspace) => workspace.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-[12.5rem] justify-between truncate">
          {value ? (
            <>
              {currWs?.icon} {currWs?.label}
            </>
          ) : (
            "Select Workspace..."
          )}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[12.5rem] p-0">
        <Command value={value}>
          <CommandInput placeholder="Search workspace..." className="h-9" />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup>
              {workspacesOptions.map((workspace) => (
                <CommandItem
                  tabIndex={0}
                  key={workspace.value}
                  value={workspace.value}
                  onSelect={handleSelect}
                  className="flex items-center gap-2 w-full overflow-hidden"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {workspace.icon}
                    <span className="truncate">{workspace.label}</span>
                  </div>
                  <Check className={cn("ml-auto", value === workspace.value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
