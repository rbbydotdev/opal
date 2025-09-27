import { TemplateComponent } from "@/components/TemplateComponent";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/templates")({
  component: TemplateComponent,
});
