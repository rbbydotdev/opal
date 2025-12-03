import { DataDisplay } from "@/components/publish-modal/DataDisplay";
import { Badge } from "@/components/ui/badge";
import { BuildDAO } from "@/data/dao/BuildDAO";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { timeAgo } from "short-time-ago";

export function BuildInfo({
  build,
  destination,
  className = "",
}: {
  build: BuildDAO;
  destination: DestinationDAO | null;
  className?: string;
}) {
  if (!destination) {
    return null; //<p className={className}>Please select a destination to publish to.</p>;
  }

  // Build display data from destination and build
  const displayData: Record<string, unknown> = {
    // Build info
    "Build Label": build.label,
    "File Count": `${build.fileCount} files`,
    "Build Created": timeAgo(new Date(build.timestamp)),
    "Build Status": build.status,

    // Destination info
    "Destination Label": destination.label,
    Name: destination.RemoteAuth.name,
    Provider: destination.RemoteAuth.source,
    "Auth Type": destination.RemoteAuth.type,
  };

  // Add meta properties if they exist
  if (destination.meta && typeof destination.meta === "object") {
    Object.entries(destination.meta).forEach(([key, value]) => {
      // Prefix with 'destination' to avoid conflicts
      displayData[`destination ${key.charAt(0).toUpperCase() + key.slice(1)}`] = value;
    });
  }

  return (
    <details className={`w-full ${className}`}>
      <summary className="cursor-pointer text-sm font-medium mb-2">
        {/* Ready to publish to {destination.label} via {destination.RemoteAuth.source} hosting */}
        <Badge variant="outline">Info</Badge>
      </summary>
      <div className="w-full mt-2 p-3 bg-muted/30 rounded-md">
        <DataDisplay data={displayData} className="mb-4" />
      </div>
    </details>
  );
}
