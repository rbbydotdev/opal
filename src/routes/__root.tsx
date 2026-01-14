import "@/styles/styles.css";
import { createRootRoute, Outlet, retainSearchParams } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";

function RootComponent() {
  return (
    <>
      <Analytics />
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
