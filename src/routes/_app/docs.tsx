import docs from "@/docs/DOCS.md";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/docs")({
  component: DocsPage,
});

function DocsPage() {
  return (
    <div className="w-full h-screen max-h-screen flex flex-col bg-background">
      <div className="flex-1 overflow-hidden">
        {/* <iframe src="https://docs.opaledx.com" className="w-full h-full border-0" title="Opal Docs" /> */}
        <div
          className="!w-full !max-w-full h-full overflow-auto p-8 prose dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: docs }}
        />
      </div>
    </div>
  );
}
