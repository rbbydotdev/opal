import { ErrorPlaque } from "@/components/errors/ErrorPlaque";

export function WorkspaceErrorBoundaryFallback({ error, reset }: { error?: Error | null; reset?: () => void }) {
  return <ErrorPlaque error={error} reset={reset} />;
}
