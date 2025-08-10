import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import "../app/styles.css";

function RootComponent() {
  return (
    <>
      <div className="font-sans antialiased w-full h-full">
        <Outlet />
      </div>
      <TanStackRouterDevtools />
    </>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
