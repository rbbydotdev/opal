import { PreviewComponent } from "@/app/PreviewComponent";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/preview/$")({
  component: PreviewPage,
});

function PreviewPage() {
  return <PreviewComponent />;
}
