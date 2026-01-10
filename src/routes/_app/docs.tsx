import { DocsPageBody } from "@/docs/page";
import { EditorSidebarLayout } from "@/layouts/EditorSidebarLayout";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/docs")({
  component: DocsPage,
});

const sections = [
  { id: "key-features", title: "Key Features" },
  { id: "getting-started", title: "Getting Started" },
  { id: "core-features", title: "Core Features" },
  { id: "working-with-images", title: "Working With Images" },
  { id: "file-and-sidebar-management", title: "File and Sidebar Management" },
  { id: "search-&-navigation", title: "Search & Navigation" },
  { id: "customization-&-themes", title: "Customization & Themes" },
  { id: "workspaces-&-storage", title: "Workspaces & Storage" },
  { id: "git-integration", title: "Git Integration" },
  { id: "preview-modes", title: "Preview Modes" },
  { id: "builds-and-deployment", title: "Builds and Deployment" },
  { id: "keyboard-and-navigation", title: "Keyboard and Navigation" },
  { id: "self-hosting-and-distribution", title: "Self-Hosting and Distribution" },
  { id: "advanced-features", title: "Advanced Features" },
  { id: "service-workers", title: "Service Workers" },
];

function DocsSidebar() {
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first intersecting section
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => {
            // Sort by position in viewport (topmost first)
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });

        if (visibleSections.length > 0) {
          setActiveSection(visibleSections[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px", // Trigger when section is in upper portion of viewport
        threshold: [0, 0.1, 0.5, 1],
      }
    );

    // Observe all sections
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="h-full bg-sidebar p-4">
      <div className="flex items-center gap-2 mb-6 px-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg">Contents</h2>
      </div>
      <nav className="space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 group",
              activeSection === section.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Circle
              className={cn(
                "w-2 h-2 transition-all",
                activeSection === section.id ? "fill-primary text-primary" : "text-muted-foreground/30"
              )}
            />
            {section.title}
          </button>
        ))}
      </nav>
    </div>
  );
}

function DocsPage() {
  return (
    <div className="min-w-0 h-full flex w-full">
      <EditorSidebarLayout
        sidebar={<DocsSidebar />}
        main={
          <div className="h-full overflow-auto p-8">
            <DocsPageBody />
          </div>
        }
        rightPaneEnabled={false}
      />
    </div>
  );
}
