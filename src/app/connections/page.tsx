import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";
import { SiGithub, SiGoogledrive } from "react-icons/si";
export default function Page() {
  return <ConnectionsCard />;
}

function VendorButton({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <Button variant="outline" className="self-center w-full gap-2">
      <span>{icon}</span>
      <span>{children}</span>
    </Button>
    // <Button variant="outline" className="self-center w-full grid grid-cols-[auto,1fr] items-center gap-2">
    //   <span className="flex justify-start">{icon}</span>
    //   <span className="flex justify-center">{children}</span>
    // </Button>
  );
}

export function ConnectionsCard() {
  return (
    <div className="w-full">
      <div className="relative flex justify-center items-center h-full w-full">
        <Card className="w-96 max-h-[32rem] flex flex-col border-2 border-ring shadow-lg">
          <CardHeader className="flex-grow">
            <CardTitle>Connections</CardTitle>
            <CardDescription>connect a remote account</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow card-content min-h-0 flex flex-col">
            {/* <CardContent className="flex flex-col flex-grow"> */}
            <CardDescription className="font-mono flex-grow flex flex-col min-h-0 gap-4 ">
              <VendorButton icon={<SiGoogledrive />}>Google Drive</VendorButton>
              <VendorButton icon={<SiGithub />}>Github</VendorButton>
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
