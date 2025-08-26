import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationError } from "@/lib/errors";
import { Ban, RotateCcw } from "lucide-react";

export function ErrorMiniPlaque({ reset }: { reset: () => void }) {
  return (
    <div className="w-full h-full bg-destructive-foreground border border-destructive text-destructive rounded gap-4 flex items-center justify-center">
      <Ban size={24} />
      <Button variant="outline" onClick={reset}>
        <RotateCcw />
      </Button>
    </div>
  );
}

export function ErrorPlaque({
  error = new ApplicationError("Unknown"),
  reset,
}: {
  error?: Error | null;
  reset?: () => void;
}) {
  return (
    <div className="flex h-screen w-[calc(100vw-5rem)]">
      <div className="w-full">
        <div className="relative flex justify-center items-center h-full w-full">
          <Card className=" max-w-2xl max-h-[32rem] flex flex-col border-2 border-destructive shadow-lg">
            <CardHeader className="flex-grow">
              <CardTitle>Uncaught Error</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow card-content min-h-0 flex flex-col">
              {/* <CardContent className="flex flex-col flex-grow"> */}
              <CardDescription className="font-mono flex-grow flex flex-col min-h-0 ">
                <div className="flex flex-grow flex-col min-h-0">
                  <div className="flex flex-col gap-4 font-bold pb-4 ">
                    <p>{error?.message}</p>
                    <p>{error?.name}</p>
                    <p>{error?.toString()}</p>
                  </div>
                  <div className="overflow-auto flex-grow">
                    <p>{error?.stack}</p>
                  </div>
                </div>
              </CardDescription>
              <Button variant="outline" className="mt-4 self-center" onClick={reset}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
