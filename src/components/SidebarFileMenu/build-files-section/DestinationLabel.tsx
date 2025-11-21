import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { DestinationDAO } from "@/data/DestinationDAO";
import { cn } from "@/lib/utils";

export function DestinationLabel({ destination, className }: { destination: DestinationDAO; className?: string }) {
  return (
    <div className={cn(className, "flex flex-col items-start gap-0")}>
      <span className="font-medium flex items-center gap-2 capitalize">
        <RemoteAuthSourceIconComponent
          type={destination.RemoteAuth.type}
          source={destination.RemoteAuth.source}
          size={16}
        />
        {destination.label} - <span>{destination.RemoteAuth.type}</span> / <span> {destination.RemoteAuth.source}</span>
      </span>
      <span className="text-xs text-muted-foreground capitalize">
        Publish to {destination.RemoteAuth.source} hosting
      </span>
    </div>
  );
}
