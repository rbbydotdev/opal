import { createFileRoute, Outlet } from "@tanstack/react-router";
import "../app/styles.css";

function PreviewRootComponent() {
  return <Outlet />;
}

export const Route = createFileRoute("/preview")({
  component: PreviewRootComponent,
});
