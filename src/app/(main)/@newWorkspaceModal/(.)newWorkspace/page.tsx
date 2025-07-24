"use client";

import { NewWorkspaceDialog } from "@/components/ui/NewWorkspaceDialog";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  useEffect(() => {
    if (pathname === "/newWorkspace") {
      setIsOpen(true);
    }
  }, [pathname]);
  return <NewWorkspaceDialog isOpen={isOpen} setIsOpen={setIsOpen} />;
}
