import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="w-full h-screen max-h-screen flex flex-col">
      <div className="flex-1 overflow-hidden">
        <iframe src="https://about.opaledx.com" className="w-full h-full border-0" title="About Opal" />
      </div>
    </div>
  );
}
