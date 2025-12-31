import { WorkspaceFilePage } from "@/editors/EditorLayout";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  viewMode: z.enum(["rich-text", "source", "diff"]).optional(),
  HL: z.tuple([z.number(), z.number()]).optional(),
});

export const Route = createFileRoute("/_app/workspace/$workspaceName/$")({
  component: WorkspaceFilePage /* <WorkspaceFilePage  */,
  validateSearch: searchSchema,
});
