import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function SelectHighlight({
  className,
  itemClassName = "",
  items,
  placeholder,
  onCancel = () => {},
  onSelect,
}: {
  itemClassName?: string;
  className?: string;
  items: string[] | { value: string; label: string | React.ReactNode }[];
  placeholder?: string;
  onCancel?: () => void;
  onSelect: (branchName: string) => void;
}) {
  return (
    <Select
      defaultOpen={true}
      onValueChange={onSelect}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <SelectTrigger className={cn(className, "w-full bg-background text-xs h-8")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) =>
          typeof item === "string" ? (
            <SelectItem
              key={item}
              value={item}
              className={cn(itemClassName, "!text-xs w-full flex items-center justify-between")}
            >
              {item}
            </SelectItem>
          ) : (
            <SelectItem
              key={item.value}
              value={item.value}
              className={cn(itemClassName, "!text-xs w-full flex items-center justify-between")}
            >
              {item.label}
            </SelectItem>
          )
        )}
      </SelectContent>
    </Select>
  );
}
