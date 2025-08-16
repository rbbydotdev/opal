import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/sandbox")({
  component: SandboxPage,
});
function SandboxPage() {
  return (
    <div className="w-full h-screen max-h-screen flex flex-col">
      <Button onClick={async () => {}}>CLICK</Button>
    </div>
  );
}
