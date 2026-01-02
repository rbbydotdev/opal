import "@/styles/styles.css";
import { createRootRoute, Outlet, retainSearchParams } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";

function RootComponent() {
  return (
    <>
      <NuqsAdapter>
        <div className="font-sans antialiased w-full h-screen">
          <Outlet />
        </div>
      </NuqsAdapter>
    </>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  search: {
    middlewares: [retainSearchParams(["viewMode"])],
  },
});
