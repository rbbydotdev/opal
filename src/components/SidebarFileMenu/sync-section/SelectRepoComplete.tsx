import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";

export function SelectRepoComplete({
  repos,
  defaultValue,
  initialValue,
  onChange,
}: {
  repos: string[];
  defaultValue: string;
  initialValue: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue ?? defaultValue);

  type RepoOption = {
    value: string;
    label: string;
  };

  const repoOptions: RepoOption[] = useMemo(() => [{ label: "foobar/bizzbazz", value: "foobar/bizzbazz" }], []);
  const handleSelect = (currentValue: string) => {
    const newVal = currentValue === value ? defaultValue : currentValue;
    onChange(newVal);
    setValue(newVal);
    setOpen(false);
  };
  const currRepo = repoOptions.find((workspace) => workspace.value === value);
  return (
    <Popover open={true}>
      <PopoverTrigger asChild>
        {/* <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between flex">
          {value ? <span className="min-w-0 truncate">{currRepo?.label}</span> : "Select Repo..."}
          <ChevronsUpDown className="opacity-50" />
        </Button> */}
      </PopoverTrigger>

      <PopoverContent className="w-full p-0">
        <Command value={value}>
          <CommandInput placeholder="Search workspace..." className="h-9" />
          <CommandList>
            <CommandEmpty>No Repo found.</CommandEmpty>
            <CommandGroup>
              {repoOptions.map((repo) => (
                <CommandItem
                  tabIndex={0}
                  key={repo.value}
                  value={repo.value}
                  onSelect={handleSelect}
                  className="flex items-center gap-2 w-full overflow-hidden"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="truncate min-w-0">{repo.label}</span>
                  </div>
                  <Check className={cn("ml-auto", value === repo.value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
