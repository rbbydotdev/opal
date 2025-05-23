"use client";

import { Workspace } from "@/Db/Workspace";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function useIsNavigatingWorkspace(delay = 1000) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const prevPath = useRef(pathname);
  const workspaceIdRef = useRef("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      const thisWorkspace = Workspace.parseWorkspacePath(pathname).workspaceId;
      if (workspaceIdRef.current !== thisWorkspace) setIsLoading(true);
      workspaceIdRef.current = thisWorkspace ?? "";
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, delay);
      prevPath.current = pathname;
    }
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname, delay]);

  return { isLoading };
}
