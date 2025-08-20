import React, { useEffect, useRef, useState } from "react";

// --- Configuration Constants ---
// Widths for the sidebar states
const MIN_RESIZABLE_WIDTH = 200; // Minimum width when the sidebar is open and resizable
const MAX_RESIZABLE_WIDTH = 600; // Maximum width when the sidebar is open and resizable
const DEFAULT_OPEN_WIDTH = 260; // Initial width when the sidebar is open
const COLLAPSED_STATE_WIDTH = 0; // Width of the sidebar when it's fully collapsed (can be > 0 for an icon bar)

// Snap behavior thresholds
// If sidebar is open and dragged narrower than this, it will snap to COLLAPSED_STATE_WIDTH
const SNAP_POINT_COLLAPSE_THRESHOLD = 100;

// localStorage keys
const LOCAL_STORAGE_KEY_OPEN_WIDTH = "resizableSidebarOpenWidth";
const LOCAL_STORAGE_KEY_IS_COLLAPSED = "resizableSidebarIsCollapsed";
const PREVIEW_PANE_ID = "preview-pane-id"; // ID for the preview pane
export const getPreviewPaneElement = () => document.getElementById(PREVIEW_PANE_ID);

export const EditorSidebarLayout = ({
  sidebar,
  main,
  renderHiddenSidebar,
}: {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  renderHiddenSidebar?: boolean;
}) => {
  // `persistedOpenWidth` stores the width the sidebar should have when it's *not* collapsed.
  // This value is saved to localStorage and restored.
  const [persistedOpenWidth, setPersistedOpenWidth] = useState<number>(DEFAULT_OPEN_WIDTH);

  // `isCollapsed` tracks if the sidebar is currently snapped shut.
  // This is also saved to localStorage.
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // `currentDisplayWidth` is the actual width applied to the sidebar's style.
  // It's derived from `isCollapsed` and `persistedOpenWidth`, or live during a resize.
  const [currentDisplayWidth, setCurrentDisplayWidth] = useState<number>(DEFAULT_OPEN_WIDTH);

  const [isResizing, setIsResizing] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Stores information about the drag operation's start.
  const dragStartInfoRef = useRef<{
    startX: number; // Mouse X position at the start of the drag
    initialDisplayWidth: number; // The sidebar's display width when dragging started
  } | null>(null);

  useEffect(() => {
    //make a cmd+b shortcut to toggle the sidebar collapse state
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        // if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        e.stopPropagation();
        setIsCollapsed((prev) => {
          const newCollapsed = !prev;
          localStorage.setItem(LOCAL_STORAGE_KEY_IS_COLLAPSED, newCollapsed.toString());
          setCurrentDisplayWidth(newCollapsed ? COLLAPSED_STATE_WIDTH : persistedOpenWidth);
          return newCollapsed;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [persistedOpenWidth]);

  // Effect to load stored sidebar state from localStorage on initial mount
  useEffect(() => {
    let initialLoadedOpenWidth = DEFAULT_OPEN_WIDTH;
    const storedOpenWidth = localStorage.getItem(LOCAL_STORAGE_KEY_OPEN_WIDTH);
    if (storedOpenWidth) {
      const numWidth = parseInt(storedOpenWidth, 10);
      if (!isNaN(numWidth)) {
        initialLoadedOpenWidth = Math.max(MIN_RESIZABLE_WIDTH, Math.min(numWidth, MAX_RESIZABLE_WIDTH));
      }
    }
    setPersistedOpenWidth(initialLoadedOpenWidth);

    let initialLoadedIsCollapsed = false;
    const storedIsCollapsed = localStorage.getItem(LOCAL_STORAGE_KEY_IS_COLLAPSED);
    if (storedIsCollapsed) {
      initialLoadedIsCollapsed = storedIsCollapsed === "true";
    }
    setIsCollapsed(initialLoadedIsCollapsed);

    // Set the initial display width based on the loaded state
    setCurrentDisplayWidth(initialLoadedIsCollapsed ? COLLAPSED_STATE_WIDTH : initialLoadedOpenWidth);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (sidebarRef.current) {
      dragStartInfoRef.current = {
        startX: e.clientX,
        initialDisplayWidth: sidebarRef.current.offsetWidth,
      };
      setIsResizing(true);
    }
  };

  // Effect for managing global mousemove and mouseup event listeners during resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !dragStartInfoRef.current) return;

      const { startX, initialDisplayWidth } = dragStartInfoRef.current;
      const dx = e.clientX - startX;
      const potentialNewWidth = initialDisplayWidth + dx;

      if (potentialNewWidth < SNAP_POINT_COLLAPSE_THRESHOLD) {
        // Snap closed
        setIsCollapsed(true);
        setCurrentDisplayWidth(COLLAPSED_STATE_WIDTH);
        // `persistedOpenWidth` is intentionally not changed here;
        // it remembers the width for the next time it opens.
      } else {
        // Resize normally (still open)
        setIsCollapsed(false);
        const newOpenWidth = Math.max(MIN_RESIZABLE_WIDTH, Math.min(potentialNewWidth, MAX_RESIZABLE_WIDTH));
        setCurrentDisplayWidth(newOpenWidth);
        setPersistedOpenWidth(newOpenWidth); // Update the persisted open width
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        // Save the final state to localStorage
        // `persistedOpenWidth` and `isCollapsed` should be correctly set by handleMouseMove
        localStorage.setItem(LOCAL_STORAGE_KEY_OPEN_WIDTH, persistedOpenWidth.toString());
        localStorage.setItem(LOCAL_STORAGE_KEY_IS_COLLAPSED, isCollapsed.toString());
        dragStartInfoRef.current = null;

        document.body.classList.remove("select-none");
        document.body.style.cursor = "";
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.classList.add("select-none");
      document.body.style.cursor = "col-resize";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove("select-none");
      document.body.style.cursor = "";
    };
  }, [isResizing, isCollapsed, persistedOpenWidth]); // Add isCollapsed and persistedOpenWidth as they are used in handlers

  return (
    <div className="flex h-screen w-full overflow-clip">
      <aside
        ref={sidebarRef}
        style={{ width: `${currentDisplayWidth}px` }}
        className="relative flex-shrink-0 overflow-y-auto " // Added transition for smoother snap
      >
        {/* Render sidebar content only if not fully collapsed to save resources, or always render if COLLAPSED_STATE_WIDTH > 0 */}
        {currentDisplayWidth > 0 || COLLAPSED_STATE_WIDTH > 0 || renderHiddenSidebar === true ? sidebar : null}
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={currentDisplayWidth}
        aria-valuemin={COLLAPSED_STATE_WIDTH}
        aria-valuemax={MAX_RESIZABLE_WIDTH}
        onMouseDown={handleMouseDown}
        className="flex h-screen w-2 flex-shrink-0 cursor-col-resize items-center justify-center overflow-clip bg-sidebar hover:bg-sidebar-accent active:bg-sidebar-primary"
        title="Resize sidebar"
      ></div>

      <main className="relative min-w-0 flex-col flex flex-grow overflow-hidden ">{main}</main>
      <div id={PREVIEW_PANE_ID} className="border-l-4 border-black w-[500px] h-full"></div>
    </div>
  );
};
