import { OpalCard } from "@/components/OpalCard";
import { SpotlightSearch } from "@/components/SpotlightSearch";
import { useAllWorkspaceFiles } from "@/hooks/useAllWorkspaceFiles";
import { useHomeSpotlightCommands } from "@/hooks/useHomeSpotlightCommands";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  component: Index,
});

function Index() {
  const { cmdMap, commands } = useHomeSpotlightCommands();

  return (
    <div className="w-full h-screen max-h-screen flex flex-col">
      <div className="flex-1 overflow-hidden">
        <div className="w-full h-full flex items-center justify-center">
          <OpalCard />
        </div>
      </div>
      <SpotlightSearch
        files={[]}
        commands={commands}
        cmdMap={cmdMap}
        placeholder="Search files and commands..."
        useFilenameSearch={true}
      />
    </div>
  );
}
