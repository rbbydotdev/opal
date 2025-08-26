import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationError } from "@/lib/errors";
import { RotateCcw } from "lucide-react";

export function ErrorMiniPlaque({ reset }: { reset?: () => void }) {
  return (
    <div
      onClick={reset}
      className="relative overflow-hidden cursor-pointer w-full h-full bg-destructive opacity-50 border border-destructive text-destructive rounded gap-4 flex items-center justify-center"
    >
      <button
        className="top-2 z-10 right-2 text-destructive-foreground bg-destructive h-16 w-16 border-destructive-foreground block m-4 border rounded p-4 active:scale-90 transition-all"
        onClick={() => {
          reset?.();
        }}
      >
        <RotateCcw />
      </button>
      <div className="absolute rotate-12 scale-150 inset-0 overflow-hidden opacity-45 text-xs">
        <div className="text-white absolute">{"error ".repeat(500)}</div>
      </div>
      <div className="bg-destructive  whitespace-nowrap z-10 text-destructive-foreground mono font-xs"></div>
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
