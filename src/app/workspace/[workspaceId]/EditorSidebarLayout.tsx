"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

// --- Configuration Constants ---
// Widths for the sidebar states
const MIN_RESIZABLE_WIDTH = 200; // Minimum width when the sidebar is open and resizable
const MAX_RESIZABLE_WIDTH = 600; // Maximum width when the sidebar is open and resizable
const DEFAULT_OPEN_WIDTH = 260; // Initial width when the sidebar is open
const COLLAPSED_STATE_WIDTH = 0; // Width of the sidebar when it's fully collapsed (can be > 0 for an icon bar)

// Snap behavior thresholds
// If sidebar is open and dragged narrower than this, it will snap to COLLAPSED_STATE_WIDTH
const SNAP_POINT_COLLAPSE_THRESHOLD = 100;
// If sidebar is collapsed and dragged wider than this, it will snap open
// (to DEFAULT_OPEN_WIDTH or MIN_RESIZABLE_WIDTH)
const SNAP_POINT_OPEN_THRESHOLD = 50;

// localStorage keys
const LOCAL_STORAGE_KEY_OPEN_WIDTH = "resizableSidebarOpenWidth";
const LOCAL_STORAGE_KEY_IS_COLLAPSED = "resizableSidebarIsCollapsed";

export const EditorSidebarLayout = ({ sidebar, main }: { sidebar: React.ReactNode; main: React.ReactNode }) => {
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
    wasCollapsedAtDragStart: boolean; // Whether the sidebar was collapsed when dragging started
  } | null>(null);

  useEffect(() => {
    //make a cmd+b shortcut to toggle the sidebar collapse state
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (sidebarRef.current) {
        dragStartInfoRef.current = {
          startX: e.clientX,
          initialDisplayWidth: sidebarRef.current.offsetWidth,
          wasCollapsedAtDragStart: isCollapsed,
        };
        setIsResizing(true);
      }
    },
    [isCollapsed] // isCollapsed is crucial for `wasCollapsedAtDragStart`
  );

  // Effect for managing global mousemove and mouseup event listeners during resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !dragStartInfoRef.current) return;

      const { startX, initialDisplayWidth, wasCollapsedAtDragStart } = dragStartInfoRef.current;
      const dx = e.clientX - startX;
      const potentialNewWidth = initialDisplayWidth + dx;

      if (wasCollapsedAtDragStart) {
        // Dragging started from a collapsed state
        if (potentialNewWidth > SNAP_POINT_OPEN_THRESHOLD) {
          // Snap open
          setIsCollapsed(false);
          // Open to a sensible width: current drag, or persisted, constrained by min/max
          let openToWidth = Math.max(persistedOpenWidth, MIN_RESIZABLE_WIDTH); // Start with last known or min
          openToWidth = Math.max(openToWidth, potentialNewWidth); // Allow dragging to make it wider
          openToWidth = Math.min(openToWidth, MAX_RESIZABLE_WIDTH); // Cap at max

          setCurrentDisplayWidth(openToWidth);
          setPersistedOpenWidth(openToWidth); // Update the width for open state
        } else {
          // Not dragged far enough to open, keep it visually collapsed
          // (isCollapsed is still true, currentDisplayWidth remains COLLAPSED_STATE_WIDTH)
          // Optionally, provide visual feedback for dragging from collapsed state:
          // setCurrentDisplayWidth(Math.max(COLLAPSED_STATE_WIDTH, potentialNewWidth));
          // But this would require snapping back on mouseUp if threshold not met.
          // For simplicity, we'll keep it at COLLAPSED_STATE_WIDTH until snap.
        }
      } else {
        // Dragging started from an open state
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
    <div className="flex h-screen w-full overflow-hidden">
      <aside
        ref={sidebarRef}
        style={{ width: `${currentDisplayWidth}px` }}
        className="relative flex-shrink-0 overflow-y-auto " // Added transition for smoother snap
      >
        {/* Render sidebar content only if not fully collapsed to save resources, or always render if COLLAPSED_STATE_WIDTH > 0 */}
        {currentDisplayWidth > 0 || COLLAPSED_STATE_WIDTH > 0 ? sidebar : null}
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={currentDisplayWidth}
        aria-valuemin={COLLAPSED_STATE_WIDTH}
        aria-valuemax={MAX_RESIZABLE_WIDTH}
        onMouseDown={handleMouseDown}
        className="flex h-screen w-2 flex-shrink-0 cursor-col-resize items-center justify-center overflow-hidden bg-sidebar hover:bg-sidebar-accent active:bg-sidebar-primary"
        title="Resize sidebar"
      >
        {/* <div className="h-[30px] w-1 rounded-sm bg-sidebar-foreground/50" /> */}
      </div>

      <main className="min-w-0 flex-grow overflow-y-auto">{main}</main>
    </div>
  );
};
