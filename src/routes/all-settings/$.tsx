import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/all-settings/$")({
  component: SettingsPage,
});

function SettingsPage() {
  return <h1>Hello "/settings/$"!</h1>;
}
