import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="w-full h-screen max-h-screen flex flex-col">
      <div className="flex-1 overflow-hidden p-4">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        {/* Settings page content will go here */}
      </div>
    </div>
  );
}
