import { RemoteAuthSourceIconComponent } from "@/components/remote-auth/RemoteAuthSourceIcon";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { cn } from "@/lib/utils";

export function DestinationLabel({ destination, className }: { destination: DestinationDAO; className?: string }) {
  return (
    <div className={cn(className, "flex flex-col items-start gap-1 w-full")}>
      <span className="font-medium capitalize whitespace-nowrap w-full gap-1 flex items-center justify-start">
        <RemoteAuthSourceIconComponent
          type={destination.RemoteAuth.type}
          source={destination.RemoteAuth.source}
          className="inline"
          size={16}
        />
        <span className="truncate min-w-0 items-center">
          {destination.label} - <span>{destination.RemoteAuth.type}</span> /{" "}
          <span> {destination.RemoteAuth.source}</span>
        </span>
      </span>
      <span className="text-xs text-muted-foreground capitalize">
        Publish to {destination.RemoteAuth.source} hosting
      </span>
    </div>
  );
}
