import { createFileRoute } from "@tanstack/react-router";

// Import the connections page content once we identify it
export const Route = createFileRoute("/_app/connections")({
  component: ConnectionsPage,
});

function ConnectionsPage() {
  return (
    <div className="w-full h-screen max-h-screen flex flex-col">
      <TopToolbar />
      <div className="flex-1 overflow-hidden p-4">
        <h1 className="text-2xl font-bold mb-4">Connections</h1>
        {/* Connections page content will go here */}
      </div>
    </div>
  );
}
