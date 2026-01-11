import { DocsPageBody } from "@/docs/page";
import { EditorSidebarLayout } from "@/layouts/EditorSidebarLayout";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Circle } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_app/docs")({
  component: DocsPage,
});

type Section = {
  id: string;
  title: string;
  subsections?: { id: string; title: string }[];
};

const sections: Section[] = [
  { id: "introduction", title: "Introduction" },
  { id: "quick-start", title: "Quick Start" },
  {
    id: "editor",
    title: "Editor & Content Creation",
    subsections: [
      { id: "writing-editing", title: "Writing & Editing" },
      { id: "images", title: "Working with Images" },
      { id: "preview-styling", title: "Preview & Styling" },
    ],
  },
  {
    id: "workspace",
    title: "Workspace Management",
    subsections: [
      { id: "file-organization", title: "File Organization" },
      { id: "search-navigation", title: "Search & Navigation" },
      { id: "storage-options", title: "Storage Options" },
    ],
  },
  { id: "git", title: "Version Control with Git" },
  { id: "building-publishing", title: "Building & Publishing" },
  {
    id: "advanced",
    title: "Self-Hosting & Advanced",
    subsections: [
      { id: "self-hosting", title: "Self-Hosting Opal" },
      { id: "technical", title: "Technical Deep Dives" },
      { id: "keyboard-reference", title: "Keyboard Reference" },
    ],
  },
];

function DocsSidebar() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

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
          const activeId = visibleSections[0]!.target.id;
          setActiveSection(activeId);

          // Auto-expand parent section if a subsection is active
          sections.forEach((section) => {
            if (section.subsections?.some((sub) => sub.id === activeId)) {
              setExpandedSections((prev) => new Set(prev).add(section.id));
            }
          });
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px", // Trigger when section is in upper portion of viewport
        threshold: [0, 0.1, 0.5, 1],
      }
    );

    // Observe all sections and subsections
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
      // Observe subsections
      section.subsections?.forEach((subsection) => {
        const subElement = document.getElementById(subsection.id);
        if (subElement) {
          observer.observe(subElement);
        }
      });
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const isSectionOrSubsectionActive = (section: Section) => {
    if (activeSection === section.id) return true;
    return section.subsections?.some((sub) => sub.id === activeSection) || false;
  };

  return (
    <div className="h-full bg-sidebar p-4 overflow-auto">
      <div className="flex items-center gap-2 mb-6 px-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg">Contents</h2>
      </div>
      <nav className="space-y-1">
        {sections.map((section) => {
          const hasSubsections = section.subsections && section.subsections.length > 0;
          const isExpanded = expandedSections.has(section.id);
          const isActive = isSectionOrSubsectionActive(section);

          return (
            <div key={section.id}>
              <button
                onClick={() => {
                  if (hasSubsections) {
                    toggleSection(section.id);
                  }
                  scrollToSection(section.id);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 group",
                  activeSection === section.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : isActive
                    ? "text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Circle
                  className={cn(
                    "w-2 h-2 transition-all flex-shrink-0",
                    activeSection === section.id ? "fill-primary text-primary" : "text-muted-foreground/30"
                  )}
                />
                <span className="flex-1">{section.title}</span>
                {hasSubsections && (
                  <Circle
                    className={cn(
                      "w-1.5 h-1.5 transition-transform flex-shrink-0",
                      isExpanded ? "rotate-90" : "",
                      isActive ? "text-primary" : "text-muted-foreground/50"
                    )}
                  />
                )}
              </button>

              {/* Subsections */}
              {hasSubsections && isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-sidebar-border pl-2">
                  {section.subsections!.map((subsection) => (
                    <button
                      key={subsection.id}
                      onClick={() => scrollToSection(subsection.id)}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2",
                        activeSection === subsection.id
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                      )}
                    >
                      <Circle
                        className={cn(
                          "w-1.5 h-1.5 transition-all flex-shrink-0",
                          activeSection === subsection.id ? "fill-primary text-primary" : "text-muted-foreground/30"
                        )}
                      />
                      {subsection.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
