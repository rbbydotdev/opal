import "@/app/styles.css";
import { createFileRoute, Outlet } from "@tanstack/react-router";

function SettingsRootComponent() {
  return <Outlet />;
}

export const Route = createFileRoute("/all-settings")({
  component: SettingsRootComponent,
});
