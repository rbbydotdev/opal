import { BuildInfo } from "@/components/publish-modal/BuildInfo";
import { PublishViewType } from "@/components/publish-modal/PublishModalStack";
import { RemoteAuthSourceIconComponent } from "@/components/remote-auth/RemoteAuthSourceIcon";
import { RemoteAuthTemplates, typeSource } from "@/components/remote-auth/RemoteAuthTemplate";
import { useRemoteAuths } from "@/components/remote-auth/useRemoteAuths";
import { BuildSelector } from "@/components/sidebar/build-files-section/BuildSelector";
import { DestinationLabel } from "@/components/sidebar/build-files-section/DestinationLabel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuildDAO } from "@/data/dao/BuildDAO";
import { DeployDAO } from "@/data/dao/DeployDAO";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
import { useBuilds } from "@/data/dao/useBuilds";
import { useDestinations } from "@/data/dao/useDestinations";
import { PartialRemoteAuthJType, RemoteAuthJType } from "@/data/RemoteAuthTypes";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useRunner } from "@/hooks/useRunner";
import { DeployRunner } from "@/services/deploy/DeployRunner";
import { Workspace } from "@/workspace/Workspace";
import {
  AlertTriangle,
  ArrowUpRightIcon,
  CheckCircle,
  Clock,
  Globe,
  Loader,
  Pencil,
  Plus,
  UploadCloud,
  UploadCloudIcon,
  Zap,
} from "lucide-react";

export function PublicationModalPublishContent({
  build,
  deploy,
  setBuild,
  destination,
  currentWorkspace,
  onOpenChange,
  pushView,
  setDestination,
  setPreferredConnection,
}: {
  build: BuildDAO;
  deploy: DeployDAO | null;
  setBuild: (build: BuildDAO) => void;
  currentWorkspace: Workspace;
  destination: DestinationDAO | null;
  onOpenChange: (value: boolean) => void;
  pushView: (view: PublishViewType) => void;
  setDestination: (destination: DestinationDAO | null) => void;
  setPreferredConnection: (connection: RemoteAuthJType | PartialRemoteAuthJType) => void;
}) {
  const { storedValue: showTimestamps, setStoredValue: setShowTimestamps } = useLocalStorage(
    "PublicationModalPublishContent/showTimestamps",
    true,
    { initializeWithValue: true }
  );
  const { remoteAuths } = useRemoteAuths();
  const { builds } = useBuilds({ workspaceId: currentWorkspace.id });
  const { destinations } = useDestinations();
  //use selected build but if is NullBuild try and get first build if possible
  const tryBuild = build.isNull ? builds[0] || build : build;

  const { runner, isSuccess, isCompleted, isPending, isFailed, logs } = useRunner(DeployRunner, () => ({
    build: tryBuild,
    destination: destination!,
    workspaceId: currentWorkspace.id,
    deploy,
    label: `Deploy ${new Date().toLocaleString()}`,
  }));

  const handleOkay = () => onOpenChange(false);
  const handleDeploy = async () => {
    if (!destination) return;
    await runner.execute();
  };
  const handleBuildSelect = (buildId: string) => {
    const build = builds.find((build) => build.guid === buildId)!;
    setBuild(build);
  };
  const handleSetDestination = (destId: string) => {
    const selectedRemoteAuth = remoteAuths.find((remoteAuth) => remoteAuth.guid === destId);
    const selectedDestination = destinations.find((d) => d.guid === destId);
    //determine which kind was selected
    if (selectedDestination) {
      //known destination with connection
      setDestination(selectedDestination);
      setPreferredConnection(selectedDestination.remoteAuth);
    } else if (selectedRemoteAuth) {
      //known connection
      setPreferredConnection(selectedRemoteAuth);
      setDestination(null);
      pushView("destination");
    } else if (!selectedRemoteAuth) {
      //fresh connection
      setDestination(null);
      setPreferredConnection(RemoteAuthTemplates.find((t) => typeSource(t) === destId)!);
      pushView("connection");
    }
  };

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0 h-full">
      <BuildSelector disabled={isCompleted} builds={builds} build={tryBuild} setBuildId={handleBuildSelect} />
      <div className="space-y-2 flex flex-col h-full min-h-0">
        <span className="text-sm font-medium">Destination</span>
        <div className="flex gap-2">
          <div className="w-full">
            <Select disabled={isCompleted} value={destination?.guid} onValueChange={handleSetDestination}>
              <SelectTrigger className="min-h-12 p-2">
                <SelectValue placeholder="Select Destination" />
              </SelectTrigger>
              <SelectContent className="max-h-96">
                <div className="mono italic text-card-foreground text-xs p-2 flex justify-start items-center gap-2">
                  <UploadCloud size={16} className="text-ring" />
                  My Destinations
                </div>
                {!destinations.length && (
                  <div className="font-mono font-bold italic flex border-dashed p-1 border border-ring justify-center text-2xs mb-2 mx-4">
                    none
                  </div>
                )}
                {destinations.map((dest) => (
                  <SelectItem key={dest.guid} value={dest.guid}>
                    <DestinationLabel destination={dest} />
                  </SelectItem>
                ))}
                <SelectSeparator />
                <div className="mono italic text-card-foreground text-xs p-2 flex justify-start items-center gap-2">
                  <Zap size={16} className="text-ring" />
                  Existing Connections
                </div>
                {remoteAuths.map((auth) => (
                  <SelectItem key={auth.guid} value={auth.guid}>
                    <div className="flex flex-col items-start gap-0">
                      <span className="font-medium flex items-center gap-2 capitalize">
                        <RemoteAuthSourceIconComponent type={auth.type} source={auth.source} size={16} />
                        {auth.name} - <span>{auth.type}</span> / <span> {auth.source}</span>
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">Publish to {auth.source} hosting</span>
                    </div>
                  </SelectItem>
                ))}
                <SelectSeparator />
                <div className="mono italic text-card-foreground text-xs p-2 flex justify-start items-center gap-2">
                  <button
                    className="hover:text-ring flex w-full justify-start gap-2"
                    onClick={() => pushView("connection")}
                  >
                    <Plus size={16} className="text-ring" />
                    Add a connection to publish
                  </button>
                </div>
                {RemoteAuthTemplates.map((connection) => (
                  <SelectItem key={typeSource(connection)} value={typeSource(connection)}>
                    <div className="flex items-center gap-2">
                      {connection.icon}
                      <div>
                        <p className="text-sm font-medium">{connection.name}</p>
                        <p className="text-xs text-muted-foreground">{connection.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={"outline"}
            className="min-h-12"
            title="Add Destination"
            disabled={deploy?.isCompleted}
            onClick={() => {
              setDestination(null);
              pushView(remoteAuths.length === 0 ? "connection" : "destination");
            }}
          >
            <Plus />
          </Button>
          {destination && (
            <Button
              className="min-h-12"
              title="Edit Destination"
              type="button"
              disabled={deploy?.isCompleted}
              variant="outline"
              onClick={() => pushView("destination")}
            >
              <Pencil />
            </Button>
          )}
        </div>
        <div className="w-full min-h-6 h-full flex flex-col overflow-y-auto">
          <BuildInfo build={tryBuild} destination={destination} />
        </div>
      </div>

      {/* Build Controls */}
      {destination && (
        <div className="flex gap-2">
          <Button
            disabled={isCompleted}
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            className="flex items-center gap-2"
            variant="secondary"
            disabled={isCompleted || isPending}
          >
            {isPending ? (
              <>
                <Loader size={16} className="animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <UploadCloudIcon /> Publish
              </>
            )}
          </Button>
        </div>
      )}

      {/* Deploy Success Indicator */}
      {isSuccess && (
        <div className="border-2 border-success bg-card p-4 rounded-lg">
          <div className="flex items-center gap-2 font-mono text-success justify-between">
            <div className="flex items-center gap-4">
              <CheckCircle size={20} className="text-success" />
              <span className="font-semibold uppercase">publish completed successfully</span>
            </div>
            <div className="flex gap-4">
              <Button onClick={handleOkay} className="flex items-center gap-2">
                Okay
              </Button>
              {destination?.destinationUrl && (
                <Button className="flex items-center gap-2" asChild variant="outline">
                  <a href={destination.destinationUrl} target="_blank" rel="noopener noreferrer">
                    <Globe size={16} />
                    View
                  </a>
                </Button>
              )}
              {runner?.target.deploymentUrl && runner.target.deploymentUrl !== destination?.destinationUrl && (
                <Button className="flex items-center gap-2" asChild>
                  <a href={runner.target.deploymentUrl} target="_blank" rel="noopener noreferrer">
                    <Globe size={16} />
                    View Deploy
                  </a>
                </Button>
              )}
              {!destination?.destinationUrl && runner?.target.effectiveUrl && (
                <Button className="flex items-center gap-2" asChild>
                  <a href={runner.target.effectiveUrl || "#"} target="_blank" rel="noopener noreferrer">
                    <ArrowUpRightIcon size={16} />
                    View
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deploy Error Indicator */}
      {isFailed && (
        <div className="border-2 border-destructive bg-card p-4 rounded-lg">
          <div className="flex items-center gap-2 font-mono text-destructive justify-between">
            <div className="flex items-center gap-4">
              <AlertTriangle size={20} className="text-destructive" />
              <span className="font-semibold uppercase">publish failed</span>
            </div>
            <Button onClick={handleOkay} variant="destructive" className="flex items-center gap-2">
              Okay
            </Button>
          </div>
        </div>
      )}
      {/* Log Output */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-start mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTimestamps(!showTimestamps)}
            className="flex items-center gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Clock size={12} />
            {showTimestamps ? "Hide" : "Show"} timestamps
          </Button>
        </div>
        <ScrollArea className="flex-1 border rounded-md p-3 bg-muted/30 h-96">
          <div className="font-mono text-sm space-y-1">
            {logs.length === 0 ? (
              <div className="text-muted-foreground italic">Output will appear here...</div>
            ) : (
              logs.map((log: any, index: number) => (
                <div
                  key={index}
                  className={`flex gap-2 ${log.type === "error" ? "text-destructive" : "text-foreground"}`}
                >
                  {showTimestamps && (
                    <span className="text-muted-foreground shrink-0 text-2xs">{`[${new Date(log.timestamp).toLocaleString()}]`}</span>
                  )}
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
