// import { ClientComponent } from "@/app/sandbox/ClientComponent";
"use client";

// import { AppPanel } from "@/lib/ResizePanels";

// const ClientComponent = dynamic(import("@/app/sandbox/ClientComponent"), {
// ssr: false,
// });

import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";

const MIN_SIDEBAR_WIDTH = 150;
const MAX_SIDEBAR_WIDTH = 500;
const INITIAL_SIDEBAR_WIDTH = 250;
const LOCAL_STORAGE_KEY = "resizableSidebarWidth";

interface ResizableSidebarLayoutProps {
  sidebarContent?: ReactNode;
  mainContent?: ReactNode;
}

const ResizableSidebarLayout: React.FC<ResizableSidebarLayoutProps> = ({ sidebarContent, mainContent }) => {
  const [sidebarWidth, setSidebarWidth] = useState<number>(INITIAL_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const sidebarRef = useRef<HTMLElement>(null);
  // Stores startX and startWidth at the beginning of a resize operation
  const dragInfoRef = useRef<{ startX: number; startWidth: number } | null>(null);
  // Ref to store the latest sidebarWidth, useful for event handlers that might close over stale state
  const latestSidebarWidthRef = useRef<number>(sidebarWidth);

  // Effect to load stored sidebar width from localStorage on initial mount
  useEffect(() => {
    const storedWidth = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedWidth) {
      const numWidth = parseInt(storedWidth, 10);
      if (!isNaN(numWidth)) {
        const constrainedWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(numWidth, MAX_SIDEBAR_WIDTH));
        setSidebarWidth(constrainedWidth);
      }
    }
  }, []);

  // Effect to keep latestSidebarWidthRef updated
  useEffect(() => {
    latestSidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (sidebarRef.current) {
      dragInfoRef.current = {
        startX: e.clientX,
        startWidth: sidebarRef.current.offsetWidth,
      };
      setIsResizing(true); // This will trigger the effect to add global listeners
    }
  }, []); // No dependencies, sidebarRef is stable

  // Effect for managing global mousemove and mouseup event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragInfoRef.current) return; // Should be set if isResizing is true

      const dx = e.clientX - dragInfoRef.current.startX;
      let newWidth = dragInfoRef.current.startWidth + dx;

      newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(newWidth, MAX_SIDEBAR_WIDTH));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Use the ref for the latest width to avoid stale closures
      localStorage.setItem(LOCAL_STORAGE_KEY, latestSidebarWidthRef.current.toString());
      dragInfoRef.current = null;
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.classList.add("select-none"); // Prevent text selection globally
      document.body.style.cursor = "col-resize"; // Optional: global cursor
    }

    // Cleanup function
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove("select-none");
      document.body.style.cursor = "";
    };
  }, [isResizing]); // Re-run when isResizing changes

  const defaultSidebarContent = (
    <>
      <h2 className="mb-4 text-xl font-semibold">Sidebar</h2>
      <p className="mb-2 text-sm">This sidebar has a fixed initial width.</p>
      <p className="mb-2 text-sm">You can resize it by dragging the handle.</p>
      <p className="mb-4 text-sm">It will maintain its dragged width even if you resize the browser window.</p>
      <ul className="space-y-1 text-sm">
        {Array.from({ length: 15 }, (_, i) => (
          <li key={i}>Item {i + 1}</li>
        ))}
      </ul>
    </>
  );

  const defaultMainContent = (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Main Content Area</h1>
      <p className="mb-4">This is the main content area. It will adjust its width based on the sidebar.</p>
      <p className="mb-4">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore
        magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
        consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
        pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est
        laborum.
      </p>
      <p className="mb-4">
        Try resizing the browser window after you've resized the sidebar. The sidebar should keep its width!
      </p>
      <p className="mb-4">Another paragraph to make content scrollable if needed.</p>
      <p>Yet another one.</p>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <aside
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px` }}
        className="relative flex-shrink-0 overflow-y-auto bg-gray-100 p-5"
      >
        {sidebarContent || defaultSidebarContent}
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={sidebarWidth}
        aria-valuemin={MIN_SIDEBAR_WIDTH}
        aria-valuemax={MAX_SIDEBAR_WIDTH}
        onMouseDown={handleMouseDown}
        className="flex w-2 flex-shrink-0 cursor-col-resize items-center justify-center bg-gray-300 hover:bg-gray-400 active:bg-gray-500"
        title="Resize sidebar"
      >
        {/* Visual cue for the resizer */}
        <div className="h-[30px] w-0.5 rounded-sm bg-gray-600 group-hover:bg-gray-700" />
      </div>

      <main className="min-w-0 flex-grow overflow-y-auto bg-white p-5">{mainContent || defaultMainContent}</main>
    </div>
  );
};

// export default ;

// Example usage (typically in App.tsx or another component):
//
// import ResizableSidebarLayout from './ResizableSidebarLayout';
//
// function App() {
//   return (
//     <ResizableSidebarLayout />
//   );
// }
//
// export default App;
export default function Page() {
  return <ResizableSidebarLayout />;
}
