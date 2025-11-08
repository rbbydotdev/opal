import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationError } from "@/lib/errors";
// import { RotateCcw } from "lucide-react";

export function ErrorMiniPlaque({ reset }: { reset?: () => void }) {
  return (
    <div
      onClick={reset}
      className="relative overflow-hidden cursor-pointer w-full h-full bg-destructive opacity-100 border border-destructive text-destructive rounded flex items-center justify-center"
    >
      {/* Background pattern */}
      <div
        className="absolute rotate-12 scale-150 inset-0 overflow-hidden opacity-45 text-xs"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='42' height='20'><text x='0' y='20' font-size='12' fill='white' font-family='monospace'>error</text></svg>")`,
        }}
      ></div>

      {/* Optional overlay text (currently empty) */}
      <div className="bg-destructive whitespace-nowrap z-10 text-destructive-foreground font-mono text-xs"></div>
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
  const navigateTo = error instanceof ApplicationError ? error.getNavigateTo() : null;
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
              <Button variant="outline" className="mt-2" onClick={reset}>
                Close
              </Button>
              <Button variant="secondary" className="mt-2" onClick={() => (window.location.href = navigateTo || "/")}>
                {navigateTo && navigateTo !== "/" ? `Go To ${navigateTo}` : "Home"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
