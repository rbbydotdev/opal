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

const ALL = (
  <>
    <Opal /> All Workspaces
  </>
);
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
    label: string | React.JSX.Element;
  };

  const workspacesOptions: WorkspaceOption[] = React.useMemo(
    () => [
      { value: ALL_WS_KEY, label: ALL },
      ...workspaces.map((ws) => ({
        value: ws.name,
        label: (
          <>
            {WSIcon(ws.guid)}
            {ws.name}
          </>
        ),
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
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-[200px] justify-between">
          {value ? workspacesOptions.find((workspace) => workspace.value === value)?.label : "Select Workspace..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[200px] p-0">
        <Command value={value}>
          <CommandInput placeholder="Search framework..." className="h-9" />
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            <CommandGroup onChange={(v) => console.log("CommandGroup changed:", v)}>
              {workspacesOptions.map((workspace) => (
                <CommandItem key={workspace.value} value={workspace.value} onSelect={handleSelect}>
                  {workspace.label}
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
