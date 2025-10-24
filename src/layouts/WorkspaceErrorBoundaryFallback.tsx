import { ErrorPlaque } from "@/components/ErrorPlaque";

export function WorkspaceErrorBoundaryFallback({ error }: { error?: Error | null }) {
  return <ErrorPlaque error={error} reset={() => (window.location.href = "/")} />;
}
