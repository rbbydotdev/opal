import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useAsyncValue } from "@/hooks/useAsyncValue";
import { ApplicationError } from "@/lib/errors";
import { Link } from "@tanstack/react-router";

export const FileError = ({ error }: { error: Error & Partial<ApplicationError> }) => {
  const { currentWorkspace } = useWorkspaceContext();
  const tryFirstFile = useAsyncValue(() => currentWorkspace.tryFirstFileUrl(), [currentWorkspace]);
  return (
    <div className="file-not-found-error w-full h-full flex items-center justify-center font-mono">
      <Card className="border-2 border-destructive border-dashed m-8 max-w-lg min-h-48  -rotate-3">
        <CardHeader>
          <h2 className="text-destructive font-bold text-lg">⚠️ {error.code} Error</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center break-words break-all whitespace-pre-wrap">
            <p className="text-destructive">Error: {error.message}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild variant="destructive">
            <Link to={tryFirstFile || "/"}>Sorry!</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
