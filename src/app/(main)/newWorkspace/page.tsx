"use client";
import { NewWorkspaceDialog } from "@/components/ui/NewWorkspaceDialog";
import { useState } from "react";

export default function NewWorkspacePage() {
  const [isOpen, setIsOpen] = useState(true);
  return <NewWorkspaceDialog isOpen={isOpen} setIsOpen={setIsOpen} />;
}
