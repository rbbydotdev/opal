import { Button } from "@/components/ui/button";
import { DocsPageBody } from "@/docs/page";
import { useIsMobileAgent } from "@/features/compat-checker/CompatChecker";
import { SpotlightSearch } from "@/features/spotlight/SpotlightSearch";
import { useHomeSpotlightCommands } from "@/features/spotlight/useHomeSpotlightCommands";
import { EditorSidebarLayout, useSidebarPanes } from "@/layouts/EditorSidebarLayout";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Circle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
      { id: "template-imports", title: "Template Imports" },
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
  const { left } = useSidebarPanes();
  const programmaticTargetRef = useRef<string | null>(null);
  const activeSectionRef = useRef<string>("");
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Keep ref in sync with state
  activeSectionRef.current = activeSection;

  // Helper to calculate which section is currently topmost in viewport
  const calculateTopmostSection = (): string | null => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return null;

    const allSectionIds: string[] = [];
    sections.forEach((section) => {
      allSectionIds.push(section.id);
      if (section.subsections) {
        section.subsections.forEach((sub) => allSectionIds.push(sub.id));
      }
    });

    // Get the container's bounding rect to calculate positions relative to viewport
    const containerRect = scrollContainer.getBoundingClientRect();
    const viewportTop = containerRect.top + 100; // 100px from the top of the container

    let closestSection: string | null = null;
    let closestDistance = Infinity;

    allSectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const elementRect = element.getBoundingClientRect();
      const elementTop = elementRect.top;

      // Only consider sections at or above the viewport reference point
      if (elementTop <= viewportTop) {
        const distance = viewportTop - elementTop;
        if (distance < closestDistance) {
          closestDistance = distance;
          closestSection = id;
        }
      }
    });

    return closestSection;
  };

  useEffect(() => {
    // Find the main content scroll container - it's inside EditorSidebarLayout
    const findScrollContainer = () => {
      // The main content area with overflow-auto
      const containers = document.querySelectorAll(".h-full.overflow-auto");
      // Find the one that contains the docs content (not the sidebar)
      for (let i = 0; i < containers.length; i++) {
        const container = containers[i] as HTMLElement;
        if (container.querySelector("#introduction")) {
          return container;
        }
      }
      return null;
    };

    const scrollContainer = findScrollContainer();
    if (!scrollContainer) {
      console.warn("Docs scroll container not found");
      return;
    }

    // Store in ref for use by other functions
    scrollContainerRef.current = scrollContainer;

    const handleScroll = () => {
      // If we're doing a programmatic scroll, ignore all scroll events
      // The scrollend event will re-enable tracking when animation completes
      if (programmaticTargetRef.current) {
        return;
      }

      // Normal user scrolling - update based on calculation
      const calculatedSection = calculateTopmostSection();
      if (calculatedSection && calculatedSection !== activeSectionRef.current) {
        setActiveSection(calculatedSection);
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    // Set initial active section
    const initialSection = calculateTopmostSection();
    if (initialSection) {
      setActiveSection(initialSection);
    }

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const isMobile = useIsMobileAgent();

  const scrollToSection = (id: string) => {
    left.setIsCollapsed(true);
    // Optimistically set the active section immediately
    setActiveSection(id);

    // Mark this as the programmatic scroll target
    programmaticTargetRef.current = id;

    const element = document.getElementById(id);
    const scrollContainer = scrollContainerRef.current;

    if (element && scrollContainer) {
      // Listen for when the smooth scroll completes
      const handleScrollEnd = () => {
        // Re-enable scroll tracking
        programmaticTargetRef.current = null;
        scrollContainer.removeEventListener("scrollend", handleScrollEnd);
      };

      scrollContainer.addEventListener("scrollend", handleScrollEnd, { once: true });
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const isSectionOrSubsectionActive = (section: Section) => {
    if (activeSection === section.id) return true;
    return section.subsections?.some((sub) => sub.id === activeSection) || false;
  };

  return (
    <div className="docs-sidebar h-full bg-sidebar p-4 overflow-y-auto overflow-x-clip">
      <div className="flex items-center gap-2 mb-6 px-2">
        <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
        <h2 className="font-semibold text-lg">Opal Documentation</h2>
        <Button variant="ghost" size="sm" onClick={() => left.setIsCollapsed(true)} className="ml-auto">
          <X />
        </Button>
      </div>
      <nav
        className="space-y-1"
        tabIndex={0}
        onBlur={(e) => {
          if (isMobile && !e.currentTarget.contains(e.relatedTarget as Node)) {
            left.setIsCollapsed(true);
          }
        }}
        ref={(el) => {
          if (isMobile) el?.focus();
        }}
      >
        {sections.map((section) => {
          const hasSubsections = section.subsections && section.subsections.length > 0;
          const isActive = isSectionOrSubsectionActive(section);

          return (
            <div key={section.id}>
              <button
                onClick={() => scrollToSection(section.id)}
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
              </button>

              {/* Subsections - Always expanded */}
              {hasSubsections && (
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
  const { cmdMap, commands } = useHomeSpotlightCommands();

  const isMobile = useIsMobileAgent();

  return (
    <>
      <div className="min-w-0 h-full flex w-full">
        <EditorSidebarLayout
          floatSidebar={isMobile}
          sidebar={<DocsSidebar />}
          main={
            <div className="h-full overflow-auto p-0 md:p-8">
              <DocsPageBody />
            </div>
          }
          rightPaneEnabled={false}
        />
      </div>
      <SpotlightSearch
        files={[]}
        commands={commands}
        cmdMap={cmdMap}
        placeholder="Spotlight Search..."
        useFilenameSearch={true}
      />
    </>
  );
}
