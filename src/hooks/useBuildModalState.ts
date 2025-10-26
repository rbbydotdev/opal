import { BuildStrategy } from "@/builder/builder-types";
import { BuildDAO } from "@/Db/BuildDAO";
import { Workspace } from "@/Db/Workspace";
import { useCallback, useRef, useState } from "react";

export interface BuildModalOptions {
  onCancel?: () => void;
  onComplete?: (buildDao?: BuildDAO) => void;
  currentWorkspace: Workspace;
}

export function useBuildModalState() {
  const [isOpen, setIsOpen] = useState(false);
  const [strategy, setStrategy] = useState<BuildStrategy>("freeform");
  const [buildCompleted, setBuildCompleted] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  const resolveRef = useRef<((value: "cancelled" | "completed") => void) | null>(null);
  const onCancelRef = useRef<(() => void) | null>(null);
  const onCompleteRef = useRef<((buildDao?: BuildDAO) => void) | null>(null);
  const optionsRef = useRef<BuildModalOptions | null>(null);

  const openModal = useCallback(async (options: BuildModalOptions): Promise<"cancelled" | "completed"> => {
    return new Promise<"cancelled" | "completed">((resolve) => {
      resolveRef.current = resolve;
      onCancelRef.current = options.onCancel || null;
      onCompleteRef.current = options.onComplete || null;
      optionsRef.current = options;

      setIsOpen(true);
      setBuildCompleted(false);
      setBuildError(null);
      setStrategy("freeform");
    });
  }, []);

  const closeModal = useCallback(() => {
    onCancelRef.current?.();
    resolveRef.current?.("cancelled");
    setIsOpen(false);
    setBuildCompleted(false);
    setBuildError(null);
  }, []);

  const completeModal = useCallback((buildDao?: BuildDAO) => {
    onCompleteRef.current?.(buildDao);
    resolveRef.current?.("completed");
    setBuildCompleted(true);
  }, []);

  const handleOkay = useCallback(() => {
    setIsOpen(false);
    setBuildCompleted(false);
    resolveRef.current?.("completed");
  }, []);

  return {
    // State
    isOpen,
    strategy,
    buildCompleted,
    buildError,

    // Refs
    optionsRef,

    // Actions
    setStrategy,
    setBuildError,
    openModal,
    closeModal,
    completeModal,
    handleOkay,
  };
}
