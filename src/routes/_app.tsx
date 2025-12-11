import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MainAppLayout } from "@/layouts/MainAppLayout";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <MainAppLayout>
      <Outlet />
    </MainAppLayout>
  );
}