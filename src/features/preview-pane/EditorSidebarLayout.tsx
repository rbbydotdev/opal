import { Button } from "@/components/ui/button";
import useLocalStorage2 from "@/hooks/useLocalStorage2";
import { PanelLeft } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

// --- Configuration Constants ---
const MIN_RESIZABLE_WIDTH = 200;
const MAX_RESIZABLE_WIDTH = 600;
const DEFAULT_OPEN_WIDTH = 260;
const COLLAPSED_STATE_WIDTH = 0;

const MIN_RIGHT_PANE_WIDTH = 200;
const MAX_RIGHT_PANE_WIDTH = 1200;
const DEFAULT_RIGHT_PANE_WIDTH = 500;
const RIGHT_PANE_COLLAPSED_WIDTH = 0;

const SNAP_POINT_COLLAPSE_THRESHOLD = 100;
const RIGHT_PANE_SNAP_THRESHOLD = 100;

const LOCAL_STORAGE_KEY_OPEN_WIDTH = "resizableSidebarOpenWidth";
const LOCAL_STORAGE_KEY_IS_COLLAPSED = "resizableSidebarIsCollapsed";
const LOCAL_STORAGE_KEY_RIGHT_PANE_WIDTH = "resizableRightPaneOpenWidth";
const LOCAL_STORAGE_KEY_RIGHT_PANE_COLLAPSED = "resizableRightPaneIsCollapsed";

const PREVIEW_PANE_ID = "preview-pane-id";
export const getPreviewPaneElement = () => document.getElementById(PREVIEW_PANE_ID);

// Combined hook for managing both left and right pane states
export const useSidebarPanes = ({
  registerKeyboardListeners = false,
}: {
  registerKeyboardListeners?: boolean;
} = {}) => {
  // Left pane state
  const leftWidth = useLocalStorage2<number>(LOCAL_STORAGE_KEY_OPEN_WIDTH, DEFAULT_OPEN_WIDTH);
  const leftCollapsed = useLocalStorage2<boolean>(LOCAL_STORAGE_KEY_IS_COLLAPSED, false);

  // Right pane state
  const rightWidth = useLocalStorage2<number>(LOCAL_STORAGE_KEY_RIGHT_PANE_WIDTH, DEFAULT_RIGHT_PANE_WIDTH);
  const rightCollapsed = useLocalStorage2<boolean>(LOCAL_STORAGE_KEY_RIGHT_PANE_COLLAPSED, false);

  // Derived values for display
  const leftDisplayWidth = leftCollapsed.storedValue ? COLLAPSED_STATE_WIDTH : leftWidth.storedValue;
  const rightDisplayWidth = rightCollapsed.storedValue ? RIGHT_PANE_COLLAPSED_WIDTH : rightWidth.storedValue;

  const controls = {
    left: {
      width: leftWidth.storedValue,
      setWidth: leftWidth.setStoredValue,
      isCollapsed: leftCollapsed.storedValue,
      setIsCollapsed: leftCollapsed.setStoredValue,
      displayWidth: leftDisplayWidth,
    },
    right: {
      width: rightWidth.storedValue,
      setWidth: rightWidth.setStoredValue,
      isCollapsed: rightCollapsed.storedValue,
      setIsCollapsed: rightCollapsed.setStoredValue,
      displayWidth: rightDisplayWidth,
    },
  };

  const controlsRef = useRef(controls);

  useEffect(() => {
    if (!registerKeyboardListeners) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+B toggle left sidebar
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        controlsRef.current.left.setIsCollapsed((prev: boolean) => !prev);
      }
      // Cmd+\ roggle right pane
      else if ((e.metaKey || e.ctrlKey) && e.key === "\\" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        controlsRef.current.right.setIsCollapsed((prev: boolean) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controls.left, controls.right, registerKeyboardListeners]); // Empty dependency array is correct here

  return controls;
};

// Legacy hooks for backward compatibility
export function useLeftCollapsed() {
  return useLocalStorage2(LOCAL_STORAGE_KEY_IS_COLLAPSED, false);
}
export const useSidebarWidth = () => {
  const collapsed = useLeftCollapsed().setStoredValue;
  const width = useLocalStorage2(LOCAL_STORAGE_KEY_OPEN_WIDTH, DEFAULT_OPEN_WIDTH).storedValue;
  return { collapsed, width };
};
export const useLeftWidth = () => {
  return useLocalStorage2<number>(LOCAL_STORAGE_KEY_OPEN_WIDTH, DEFAULT_OPEN_WIDTH);
};

export const EditorSidebarLayout = ({
  sidebar,
  main,
  rightPane,
  // renderHiddenSidebar,
  rightPaneEnabled = true,
}: {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  rightPane?: React.ReactNode;
  // renderHiddenSidebar?: boolean;
  rightPaneEnabled?: boolean;
}) => {
  // --- Pane States (persisted) ---
  const panes = useSidebarPanes({ registerKeyboardListeners: true });

  // --- Local UI State ---
  const [isResizing, setIsResizing] = useState(false);
  const [rightPaneIsResizing, setRightPaneIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const rightPaneRef = useRef<HTMLElement>(null);

  // --- Derived Values ---
  const currentDisplayWidth = panes.left.displayWidth;
  const rightPaneCurrentWidth = panes.right.displayWidth;

  // --- Drag State ---
  const dragStartInfoRef = useRef<{
    startX: number;
    initialDisplayWidth: number;
  } | null>(null);

  const rightPaneDragStartInfoRef = useRef<{
    startX: number;
    initialDisplayWidth: number;
  } | null>(null);

  // --- Controls Ref (to avoid stale closures in event listeners) ---
  const controlsRef = useRef<any>({});
  controlsRef.current = {
    leftWidth: panes.left.width,
    setLeftWidth: panes.left.setWidth,
    leftIsCollapsed: panes.left.isCollapsed,
    setLeftIsCollapsed: panes.left.setIsCollapsed,
    rightWidth: panes.right.width,
    setRightWidth: panes.right.setWidth,
    rightIsCollapsed: panes.right.isCollapsed,
    setRightIsCollapsed: panes.right.setIsCollapsed,
    rightPaneEnabled,
  };

  // --- Mouse Down Handlers ---
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
    if (rightPaneEnabled && rightPaneRef.current) {
      rightPaneDragStartInfoRef.current = {
        startX: e.clientX,
        initialDisplayWidth: rightPaneRef.current.offsetWidth,
      };
      setRightPaneIsResizing(true);
    }
  };

  // --- Resize Logic ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const c = controlsRef.current;
      if (!c) return;

      // Left sidebar resize
      if (isResizing && dragStartInfoRef.current) {
        const { startX, initialDisplayWidth } = dragStartInfoRef.current;
        const dx = e.clientX - startX;
        const potentialNewWidth = initialDisplayWidth + dx;

        if (potentialNewWidth < SNAP_POINT_COLLAPSE_THRESHOLD) {
          c.setLeftIsCollapsed(true);
        } else {
          c.setLeftIsCollapsed(false);
          const newOpenWidth = Math.max(MIN_RESIZABLE_WIDTH, Math.min(potentialNewWidth, MAX_RESIZABLE_WIDTH));
          c.setLeftWidth(newOpenWidth);
        }
      }

      // Right pane resize
      if (c.rightPaneEnabled && rightPaneIsResizing && rightPaneDragStartInfoRef.current) {
        const { startX, initialDisplayWidth } = rightPaneDragStartInfoRef.current;
        const dx = startX - e.clientX;
        const potentialNewWidth = initialDisplayWidth + dx;

        if (potentialNewWidth < RIGHT_PANE_SNAP_THRESHOLD) {
          c.setRightIsCollapsed(true);
        } else {
          c.setRightIsCollapsed(false);
          const newWidth = Math.max(MIN_RIGHT_PANE_WIDTH, Math.min(potentialNewWidth, MAX_RIGHT_PANE_WIDTH));
          c.setRightWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setRightPaneIsResizing(false);
      dragStartInfoRef.current = null;
      rightPaneDragStartInfoRef.current = null;
      // Clean up body styles regardless of which pane was resizing
      document.body.classList.remove("select-none");
      document.body.style.cursor = "";
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
      // Ensure cleanup happens on unmount as well
      document.body.classList.remove("select-none");
      document.body.style.cursor = "";
    };
  }, [isResizing, rightPaneIsResizing, rightPaneEnabled]);

  return (
    <div className="flex h-screen w-full overflow-clip">
      <aside
        ref={sidebarRef}
        style={{ width: `${currentDisplayWidth}px` }}
        className="relative flex-shrink-0 overflow-y-auto"
      >
        {/* {currentDisplayWidth > 0 || COLLAPSED_STATE_WIDTH > 0 || renderHiddenSidebar === true ? sidebar : null} */}
        {sidebar}
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={currentDisplayWidth}
        aria-valuemin={COLLAPSED_STATE_WIDTH}
        aria-valuemax={MAX_RESIZABLE_WIDTH}
        onMouseDown={handleMouseDown}
        className="flex h-screen w-2 flex-shrink-0 cursor-col-resize items-center justify-center overflow-clip border-r-2 bg-sidebar hover:bg-sidebar-accent active:bg-sidebar-primary"
        title="Resize sidebar"
      ></div>

      <main className="relative min-w-0 flex-col flex flex-grow overflow-hidden">
        {panes.left.isCollapsed && (
          <div className="absolute top-0 left-0 pl-2 bg-card p-1 z-50 flex aspect-square h-12 w-12 items-center justify-center rounded-r-lg">
            <Button
              onClick={() => panes.left.setIsCollapsed(false)}
              title="Show sidebar (Cmd+B)"
              variant="outline"
              className="w-full"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
        {main}
      </main>

      {rightPaneEnabled && (
        <>
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
            className={`relative flex-shrink-0 ${rightPaneIsResizing ? "pointer-events-none" : ""}`}
          >
            {rightPaneCurrentWidth > 0 || RIGHT_PANE_COLLAPSED_WIDTH > 0
              ? rightPane || <div id={PREVIEW_PANE_ID} className="h-full w-full border-l border-border"></div>
              : null}
          </aside>
        </>
      )}
    </div>
  );
};
