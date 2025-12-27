import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

function SandboxPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    console.log("hello");
    return () => {
      console.log("goodbye");
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-black text-white">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="text-lg px-8 py-4 bg-white text-black hover:bg-gray-200">
            Open Hello World Dialog
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md bg-black text-white border-white">
          <DialogHeader>
            <DialogTitle className="text-6xl font-bold text-center mb-6 text-white">HELLO WORLD</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-lg text-white">Shadcn Global</p>
            <DialogClose asChild>
              <Button variant="outline" size="lg" className="bg-white text-black border-white hover:bg-gray-200">
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/sandbox")({
  component: SandboxPage,
});
