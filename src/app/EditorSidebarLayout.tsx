import React, { useEffect, useRef, useState } from "react";

// --- Configuration Constants ---
// Left sidebar configuration
const MIN_RESIZABLE_WIDTH = 200; // Minimum width when the sidebar is open and resizable
const MAX_RESIZABLE_WIDTH = 600; // Maximum width when the sidebar is open and resizable
const DEFAULT_OPEN_WIDTH = 260; // Initial width when the sidebar is open
const COLLAPSED_STATE_WIDTH = 0; // Width of the sidebar when it's fully collapsed (can be > 0 for an icon bar)

// Right pane configuration
const MIN_RIGHT_PANE_WIDTH = 200; // Minimum width when the right pane is open and resizable
const MAX_RIGHT_PANE_WIDTH = 800; // Maximum width when the right pane is open and resizable
const DEFAULT_RIGHT_PANE_WIDTH = 500; // Initial width when the right pane is open
const RIGHT_PANE_COLLAPSED_WIDTH = 0; // Width of the right pane when it's fully collapsed

// Snap behavior thresholds
// If sidebar is open and dragged narrower than this, it will snap to COLLAPSED_STATE_WIDTH
const SNAP_POINT_COLLAPSE_THRESHOLD = 100;
const RIGHT_PANE_SNAP_THRESHOLD = 100; // If right pane is dragged narrower than this, it will snap closed

// localStorage keys
const LOCAL_STORAGE_KEY_OPEN_WIDTH = "resizableSidebarOpenWidth";
const LOCAL_STORAGE_KEY_IS_COLLAPSED = "resizableSidebarIsCollapsed";
const LOCAL_STORAGE_KEY_RIGHT_PANE_WIDTH = "resizableRightPaneOpenWidth";
const LOCAL_STORAGE_KEY_RIGHT_PANE_COLLAPSED = "resizableRightPaneIsCollapsed";
const PREVIEW_PANE_ID = "preview-pane-id"; // ID for the preview pane
export const getPreviewPaneElement = () => document.getElementById(PREVIEW_PANE_ID);

export const EditorSidebarLayout = ({
  sidebar,
  main,
  rightPane,
  renderHiddenSidebar,
  rightPaneEnabled = true,
}: {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  rightPane?: React.ReactNode;
  renderHiddenSidebar?: boolean;
  rightPaneEnabled?: boolean;
}) => {
  // Left sidebar state
  const [persistedOpenWidth, setPersistedOpenWidth] = useState<number>(DEFAULT_OPEN_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [currentDisplayWidth, setCurrentDisplayWidth] = useState<number>(DEFAULT_OPEN_WIDTH);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Right pane state
  const [rightPanePersistedWidth, setRightPanePersistedWidth] = useState<number>(DEFAULT_RIGHT_PANE_WIDTH);
  const [rightPaneIsCollapsed, setRightPaneIsCollapsed] = useState<boolean>(false);
  const [rightPaneCurrentWidth, setRightPaneCurrentWidth] = useState<number>(DEFAULT_RIGHT_PANE_WIDTH);
  const [rightPaneIsResizing, setRightPaneIsResizing] = useState<boolean>(false);
  const rightPaneRef = useRef<HTMLElement>(null);

  // Stores information about the drag operation's start.
  const dragStartInfoRef = useRef<{
    startX: number; // Mouse X position at the start of the drag
    initialDisplayWidth: number; // The sidebar's display width when dragging started
  } | null>(null);

  const rightPaneDragStartInfoRef = useRef<{
    startX: number; // Mouse X position at the start of the drag
    initialDisplayWidth: number; // The right pane's display width when dragging started
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+B to toggle left sidebar
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setIsCollapsed((prev) => {
          const newCollapsed = !prev;
          localStorage.setItem(LOCAL_STORAGE_KEY_IS_COLLAPSED, newCollapsed.toString());
          setCurrentDisplayWidth(newCollapsed ? COLLAPSED_STATE_WIDTH : persistedOpenWidth);
          return newCollapsed;
        });
      }
      // Cmd+Shift+B to toggle right pane (only if enabled)
      else if (rightPaneEnabled && (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        e.stopPropagation();
        setRightPaneIsCollapsed((prev) => {
          const newCollapsed = !prev;
          localStorage.setItem(LOCAL_STORAGE_KEY_RIGHT_PANE_COLLAPSED, newCollapsed.toString());
          setRightPaneCurrentWidth(newCollapsed ? RIGHT_PANE_COLLAPSED_WIDTH : rightPanePersistedWidth);
          return newCollapsed;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [persistedOpenWidth, rightPanePersistedWidth, rightPaneEnabled]);

  // Effect to load stored sidebar and right pane state from localStorage on initial mount
  useEffect(() => {
    // Left sidebar initialization
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
    setCurrentDisplayWidth(initialLoadedIsCollapsed ? COLLAPSED_STATE_WIDTH : initialLoadedOpenWidth);

    // Right pane initialization (only if enabled)
    if (rightPaneEnabled) {
      let initialRightPaneWidth = DEFAULT_RIGHT_PANE_WIDTH;
      const storedRightPaneWidth = localStorage.getItem(LOCAL_STORAGE_KEY_RIGHT_PANE_WIDTH);
      if (storedRightPaneWidth) {
        const numWidth = parseInt(storedRightPaneWidth, 10);
        if (!isNaN(numWidth)) {
          initialRightPaneWidth = Math.max(MIN_RIGHT_PANE_WIDTH, Math.min(numWidth, MAX_RIGHT_PANE_WIDTH));
        }
      }
      setRightPanePersistedWidth(initialRightPaneWidth);

      let initialRightPaneCollapsed = false;
      const storedRightPaneCollapsed = localStorage.getItem(LOCAL_STORAGE_KEY_RIGHT_PANE_COLLAPSED);
      if (storedRightPaneCollapsed) {
        initialRightPaneCollapsed = storedRightPaneCollapsed === "true";
      }
      setRightPaneIsCollapsed(initialRightPaneCollapsed);
      setRightPaneCurrentWidth(initialRightPaneCollapsed ? RIGHT_PANE_COLLAPSED_WIDTH : initialRightPaneWidth);
    } else {
      // When disabled, ensure right pane is collapsed
      setRightPaneIsCollapsed(true);
      setRightPaneCurrentWidth(RIGHT_PANE_COLLAPSED_WIDTH);
    }
  }, [rightPaneEnabled]);

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

  const handleRightPaneMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (rightPaneRef.current) {
      rightPaneDragStartInfoRef.current = {
        startX: e.clientX,
        initialDisplayWidth: rightPaneRef.current.offsetWidth,
      };
      setRightPaneIsResizing(true);
    }
  };

  // Effect for managing global mousemove and mouseup event listeners during resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Handle left sidebar resize
      if (isResizing && dragStartInfoRef.current) {
        const { startX, initialDisplayWidth } = dragStartInfoRef.current;
        const dx = e.clientX - startX;
        const potentialNewWidth = initialDisplayWidth + dx;

        if (potentialNewWidth < SNAP_POINT_COLLAPSE_THRESHOLD) {
          setIsCollapsed(true);
          setCurrentDisplayWidth(COLLAPSED_STATE_WIDTH);
        } else {
          setIsCollapsed(false);
          const newOpenWidth = Math.max(MIN_RESIZABLE_WIDTH, Math.min(potentialNewWidth, MAX_RESIZABLE_WIDTH));
          setCurrentDisplayWidth(newOpenWidth);
          setPersistedOpenWidth(newOpenWidth);
        }
      }

      // Handle right pane resize
      if (rightPaneIsResizing && rightPaneDragStartInfoRef.current) {
        const { startX, initialDisplayWidth } = rightPaneDragStartInfoRef.current;
        const dx = startX - e.clientX; // Reversed direction for right pane
        const potentialNewWidth = initialDisplayWidth + dx;

        if (potentialNewWidth < RIGHT_PANE_SNAP_THRESHOLD) {
          setRightPaneIsCollapsed(true);
          setRightPaneCurrentWidth(RIGHT_PANE_COLLAPSED_WIDTH);
        } else {
          setRightPaneIsCollapsed(false);
          const newWidth = Math.max(MIN_RIGHT_PANE_WIDTH, Math.min(potentialNewWidth, MAX_RIGHT_PANE_WIDTH));
          setRightPaneCurrentWidth(newWidth);
          setRightPanePersistedWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem(LOCAL_STORAGE_KEY_OPEN_WIDTH, persistedOpenWidth.toString());
        localStorage.setItem(LOCAL_STORAGE_KEY_IS_COLLAPSED, isCollapsed.toString());
        dragStartInfoRef.current = null;
      }

      if (rightPaneIsResizing) {
        setRightPaneIsResizing(false);
        localStorage.setItem(LOCAL_STORAGE_KEY_RIGHT_PANE_WIDTH, rightPanePersistedWidth.toString());
        localStorage.setItem(LOCAL_STORAGE_KEY_RIGHT_PANE_COLLAPSED, rightPaneIsCollapsed.toString());
        rightPaneDragStartInfoRef.current = null;
      }

      if (isResizing || rightPaneIsResizing) {
        document.body.classList.remove("select-none");
        document.body.style.cursor = "";
      }
    };

    if (isResizing || rightPaneIsResizing) {
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
  }, [isResizing, rightPaneIsResizing, isCollapsed, persistedOpenWidth, rightPaneIsCollapsed, rightPanePersistedWidth]);

  return (
    <div className="flex h-screen w-full overflow-clip">
      <aside
        ref={sidebarRef}
        style={{ width: `${currentDisplayWidth}px` }}
        className="relative flex-shrink-0 overflow-y-auto"
      >
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

      <main className="relative min-w-0 flex-col flex flex-grow overflow-hidden">{main}</main>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={rightPaneCurrentWidth}
        aria-valuemin={RIGHT_PANE_COLLAPSED_WIDTH}
        aria-valuemax={MAX_RIGHT_PANE_WIDTH}
        onMouseDown={handleRightPaneMouseDown}
        className="flex h-screen w-2 flex-shrink-0 cursor-col-resize items-center justify-center overflow-clip bg-sidebar hover:bg-sidebar-accent active:bg-sidebar-primary"
        title="Resize right pane"
      ></div>

      <aside
        ref={rightPaneRef}
        style={{ width: `${rightPaneCurrentWidth}px` }}
        className={`relative flex-shrink-0 overflow-y-auto ${rightPaneIsResizing ? 'pointer-events-none' : ''}`}
      >
        {rightPaneCurrentWidth > 0 || RIGHT_PANE_COLLAPSED_WIDTH > 0 ? (
          rightPane || <div id={PREVIEW_PANE_ID} className="w-full h-full border-l border-border"></div>
        ) : null}
      </aside>
    </div>
  );
};
