import { BuildLabel } from "@/components/sidebar/build-files-section/BuildLabel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuildDAO } from "@/data/dao/BuildDAO";
import { cn } from "@/lib/utils";

export function BuildSelector({
  builds,
  setBuildId,
  build,
  children,
  className,
  disabled,
}: {
  builds: BuildDAO[];
  setBuildId: (buildId: string) => void;
  build: BuildDAO | null;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className="w-full flex items-center justify-between space-x-2">
      <div className="w-full">
        <Select
          key={builds.length}
          value={build?.guid}
          onValueChange={(guid) => setBuildId(guid)}
          disabled={builds.length === 0 || disabled}
        >
          <SelectTrigger
            title="Select Build"
            className={cn(
              className,
              "grid grid-cols-[1fr,auto] whitespace-normal truncate w-full bg-background text-xs ",
              {
                "h-12": builds.length > 0,
                "h-8": builds.length === 0,
              }
            )}
          >
            <SelectValue className="w-full" placeholder="Select Build" />
          </SelectTrigger>
          <SelectContent className="border max-h-64 #overflow-y-auto">
            {builds.map((build) => (
              <SelectItem key={build.guid} value={build.guid} className="w-full h-full flex-shrink-0  *:text-xs">
                <BuildLabel build={build} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>{children}</div>
    </div>
  );
}
