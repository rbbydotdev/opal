import { DataDisplay } from "@/components/ui/DataDisplay";
import { BuildDAO } from "@/data/BuildDAO";
import { DestinationDAO } from "@/data/DestinationDAO";
import { timeAgo } from "short-time-ago";

export function BuildInfo({ 
  build, 
  destination,
  className = "" 
}: { 
  build: BuildDAO; 
  destination: DestinationDAO | null;
  className?: string;
}) {
  if (!destination) {
    return (
      <p className={className}>
        Please select a destination to publish to.
      </p>
    );
  }

  // Build display data from destination and build
  const displayData: Record<string, unknown> = {
    // Build info
    buildLabel: build.label,
    fileCount: `${build.fileCount} files`,
    buildCreated: timeAgo(build.timestamp),
    buildStatus: build.status,
    
    // Destination info
    destinationLabel: destination.label,
    hostingProvider: destination.RemoteAuth.source,
    authType: destination.RemoteAuth.type,
    remoteAuthName: destination.RemoteAuth.name,
  };

  // Add meta properties if they exist
  if (destination.meta && typeof destination.meta === 'object') {
    Object.entries(destination.meta).forEach(([key, value]) => {
      // Prefix with 'destination' to avoid conflicts
      displayData[`destination${key.charAt(0).toUpperCase() + key.slice(1)}`] = value;
    });
  }

  return (
    <details className={`w-full ${className}`}>
      <summary className="cursor-pointer text-sm font-medium mb-2">
        Ready to publish to {destination.label} via {destination.RemoteAuth.source} hosting
      </summary>
      <div className="w-full mt-2 p-3 bg-muted/30 rounded-md">
        <DataDisplay data={displayData} className="mb-4" />
      </div>
    </details>
  );
}