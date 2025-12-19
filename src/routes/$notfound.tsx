import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$notfound")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
