import "@/styles/styles.css";
import { createRootRoute, Outlet } from "@tanstack/react-router";

function RootComponent() {
  return (
    <>
      <div className="font-sans antialiased w-full h-full">
        <Outlet />
      </div>
      {/* <TanStackRouterDevtools /> */}
    </>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
