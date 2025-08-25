import { createFileRoute, Outlet } from "@tanstack/react-router";
import "../app/styles.css";

function SettingsRootComponent() {
  return <Outlet />;
}

export const Route = createFileRoute("/all-settings")({
  component: SettingsRootComponent,
});
