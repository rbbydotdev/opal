import { DEFAULT_MIME_TYPE, useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { Workspace } from "@/Db/Workspace";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { getMimeType } from "@/lib/mimeType";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export function useFileContents({
  currentWorkspace,
  listenerCb,
  debounceMs = 250,
}: {
  currentWorkspace: Workspace;
  listenerCb?: (content: string | null) => void;
  debounceMs?: number;
}) {
  const listenerCbRef = useRef(listenerCb);
  const { path: filePath } = useWorkspaceRoute();
  const [initialContents, setInitialContents] = useState<Uint8Array<ArrayBufferLike> | string | null>(null);
  const [error, setError] = useState<null | Error>(null);
  const navigate = useNavigate();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(debounceRef.current!), []);

  const writeFileContents = (updates: string) => {
    if (filePath && currentWorkspace) {
      void currentWorkspace?.disk.writeFile(filePath, updates);
      //DO NOT EMIT THIS, IT MESSES UP THE EDITOR VIA TEXT-MD-TEXT TOMFOOLERY -> void currentWorkspace.disk.local.emit(DiskEvents.OUTSIDE_WRITE, {
      //   filePaths: [filePath],
      // });
      //USE INSIDE_WRITE INSTEAD SOMEWHERE ELSE
      //THIS HOOK IS INTEDED FOR OUT OF BAND UPDATES
    }
  };

  const updateDebounce = (content: string | null) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (content !== null) {
        writeFileContents(String(content));
      }
    }, debounceMs);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useAsyncEffect(async () => {
    if (currentWorkspace && filePath) {
      try {
        setInitialContents(await currentWorkspace.disk.readFile(filePath));
        setError(null);
      } catch (error) {
        setError(error as Error);
      }
    }
  }, [currentWorkspace, filePath, navigate]);

  useEffect(() => {
    //Mount Remote Listener
    if (filePath) {
      return currentWorkspace.disk.remoteUpdateListener(filePath, setInitialContents);
    }
  }, [currentWorkspace.disk, filePath]);

  useEffect(() => {
    //Mount Local Listener
    if (filePath) {
      return currentWorkspace.disk.outsideWriteListener(filePath, setInitialContents);
    }
  }, [currentWorkspace.disk, filePath]);

  useEffect(() => {
    //mount additional listener
    if (listenerCbRef.current && filePath) {
      return currentWorkspace.disk.outsideWriteListener(filePath, listenerCbRef.current);
    }
  }, [currentWorkspace, filePath]);

  // contents will not reflect the latest changes via writeFileContents, the state must be tracked somewhere else
  // this avoids glitchy behavior in the editor et all
  // the editor should use contents as initialContents
  // the editor will track the contents state itself, writes using onUpdate WILL write to file
  return {
    error,
    filePath,
    initialContents: initialContents !== null ? String(initialContents) : null,
    mimeType: getMimeType(filePath ?? "") ?? DEFAULT_MIME_TYPE,
    writeFileContents,
    updateDebounce,
  };
}
