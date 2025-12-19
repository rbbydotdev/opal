import "@/styles/styles.css";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";

function RootComponent() {
  return (
    <>
      <NuqsAdapter>
        <div className="font-sans antialiased w-full h-full">
          <Outlet />
        </div>
      </NuqsAdapter>
    </>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
