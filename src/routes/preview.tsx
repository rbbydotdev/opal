import "@/styles/styles.css";
import { createFileRoute, Outlet } from "@tanstack/react-router";

function PreviewRootComponent() {
  return <Outlet />;
}

export const Route = createFileRoute("/preview")({
  component: PreviewRootComponent,
});
