import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return <ConnectionsCard />;
}

export function ConnectionsCard() {
  return (
    <div className="w-full">
      <div className="relative flex justify-center items-center h-full w-full">
        <Card className=" max-w-2xl max-h-[32rem] flex flex-col border-2 border-accent2 shadow-lg">
          <CardHeader className="flex-grow">
            <CardTitle>Error</CardTitle>
            <CardDescription>Something went wrong...</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow card-content min-h-0 flex flex-col">
            {/* <CardContent className="flex flex-col flex-grow"> */}
            <CardDescription className="font-mono flex-grow flex flex-col min-h-0 ">FOO!</CardDescription>
            <Button variant="outline" className="mt-4 self-center">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
