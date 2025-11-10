import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuildDAO } from "@/data/BuildDAO";
import { cn } from "@/lib/utils";
import { timeAgo } from "short-time-ago";

export function BuildSelector({
  builds,
  setBuildId,
  build,
  children,
  className,
}: {
  builds: BuildDAO[];
  setBuildId: (buildId: string) => void;
  build: BuildDAO | null;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="w-full flex items-center justify-between space-x-2">
      <div className="w-full">
        <Select
          key={builds.length}
          value={build?.guid}
          // defaultValue={build?.guid}
          onValueChange={(guid) => setBuildId(guid)}
          disabled={builds.length === 0}
        >
          <SelectTrigger
            title="Select Build"
            className={cn(
              className,
              "grid grid-cols-[1fr,auto] whitespace-normal truncate w-full bg-background text-xs h-12"
            )}
          >
            <SelectValue className="w-full" placeholder="Select Build" />
          </SelectTrigger>
          <SelectContent className="border max-h-64 #overflow-y-auto">
            {builds.map((build) => (
              <SelectItem key={build.guid} value={build.guid} className="w-full h-full flex-shrink-0  *:text-xs">
                <div className="h-full w-full flex justify-start flex-col items-start gap-1 truncate">
                  <div className="w-full flex justify-start items-center">{build.label}</div>
                  <div className="text-2xs text-muted-foreground truncate w-full flex justify-start items-center">
                    {build.disk.guid} • {timeAgo(build.timestamp)}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>{children}</div>
    </div>
  );
}

// export function BuildSelector({
//   builds,
//   setBuildId: setBuild,
//   build,
//   children,
//   className,
// }: {
//   builds: BuildDAO[];
//   setBuildId: (buildId: string) => void;
//   build: BuildDAO | null;
//   children?: React.ReactNode;
//   className?: string;
// }) {
//   return (
//     <div className="w-full flex items-center justify-between space-x-2">
//       <div className="w-full">
//         <Select
//           key={builds.length}
//           defaultValue={build?.guid}
//           onValueChange={(guid) => setBuild(guid)}
//           disabled={builds.length === 0}
//         >
//           <SelectTrigger
//             className={cn(
//               className,
//               "grid grid-cols-[1fr,auto] whitespace-normal truncate w-full bg-background text-xs h-14 [&>span]:line-clamp-none [&>span]:w-full"
//             )}
//           >
//             <SelectValue placeholder="Select Build" className="h-full w-full" />
//           </SelectTrigger>
//           <SelectContent defaultValue={build?.guid}>
//             {builds.map((b) => (
//               <SelectItem key={b.guid} value={b.guid} className="w-full h-full flex-shrink-0  *:text-xs">
//                 <div className="h-full w-full flex justify-start flex-col items-start gap-1 truncate">
//                   <div className="w-full flex justify-start items-center">{b.label}</div>
//                   <div className="text-2xs text-muted-foreground truncate w-full flex justify-start items-center">
//                     {b.Disk.guid} • {timeAgo(b.timestamp)}
//                   </div>
//                 </div>
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       </div>
//       <div>{children}</div>
//     </div>
//   );
// }
