import { useAsyncEffect2 } from "@/hooks/useAsyncEffect";
import { hasGitConflictMarkers } from "@/lib/gitConflictDetection";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath, isStringish } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { DEFAULT_MIME_TYPE, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { useNavigate } from "@tanstack/react-router";
import matter from "gray-matter";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Simplified hook for watching file content changes (read-only)
 * Ideal for preview contexts where you only need to display content
 * Does not require router context - accepts path as prop
 */
export function useLiveFileContent(currentWorkspace: Workspace, path: AbsPath | null) {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    if (!path || !currentWorkspace) return;

    // Initial load
    const loadContent = async () => {
      try {
        const fileContent = await currentWorkspace.readFile(path);
        setContent(String(fileContent || ""));
      } catch (error) {
        console.error("Error loading file:", error);
        setContent("");
      }
    };

    void loadContent();

    // Watch for file changes
    const unsubscribeInside = currentWorkspace.disk.insideWriteListener(path, (content) => {
      setContent(String(content));
    });

    const unsubscribeOutside = currentWorkspace.disk.outsideWriteListener(path, (content) => {
      setContent(String(content));
    });

    return () => {
      unsubscribeInside?.();
      unsubscribeOutside?.();
    };
  }, [currentWorkspace, path]);

  return content;
}

/**
 * Main hook for managing file content state with multiple update sources
 *
 * State Variables:
 * - hotContents: Current live content state (updated immediately from any source)
 * - contents: Initial file content from disk (only updated on file read or outside writes)
 * - flushingContentsRef: Tracks pending debounced content for cleanup on unmount
 *
 * Update Sources:
 * 1. INSIDE writes: Editor changes (debounced)
 * 2. OUTSIDE writes: Changes from other tabs/processes (immediate)
 * 3. Content emitter: Programmatic updates (immediate)
 */
export function useFileContents({
  currentWorkspace,
  debounceMs = 250,
  path,
}: {
  currentWorkspace: Workspace;
  debounceMs?: number;
  path?: AbsPath | null;
}) {
  // Live content state - immediate updates from editor, shows current editor state
  const [hotContents, setHotContents] = useState<string | null>(null);

  const { path: currentRoutePath } = useWorkspaceRoute();

  // Baseline content from disk - only updated on file read or outside writes
  const [contents, setInitialContents] = useState<Uint8Array<ArrayBufferLike> | string | null>(null);
  const [error, setError] = useState<null | Error>(null);
  const navigate = useNavigate();

  // Simplified debounce management
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  const previousFilePathRef = useRef<AbsPath | null>(null);
  pendingContentRef.current = hotContents;

  // Determine current file path from props or route
  const filePath = useMemo(() => {
    if (path) return path;
    if (currentRoutePath) return currentRoutePath;
    return null;
  }, [currentRoutePath, path]);

  /**
   * Writes content to disk without triggering OUTSIDE_WRITE events
   * Used for: Editor changes, debounced updates, cleanup flushes
   * NOTE: Does NOT emit local OUTSIDE_WRITE to avoid editor text corruption
   * INSIDE_WRITE events are handled elsewhere in the editor chain
   */
  const writeFileContents = useCallback(
    (
      updates: string,
      {
        outsideWrite,
      }: {
        outsideWrite?: boolean;
      } = { outsideWrite: false }
    ) => {
      if (filePath && currentWorkspace) {
        return currentWorkspace.disk.writeFile(filePath, updates, {
          outsideWrite,
        });
        // LOCAL OUTSIDE_WRITE OPTIONAL, if writeFileContents is triggered by editor changes, could cause loops
        // INSIDE_WRITE events are emitted by the disk write operation itself
      }
    },
    [currentWorkspace, filePath]
  );

  /**
   * Debounces rapid content changes from the editor
   * Called by: Editor onChange events
   * Behavior: Updates hotContents immediately, debounces file writes
   * On timeout: Writes pending content to disk
   */
  const updateDebounce = (content: string | null) => {
    // Update UI immediately for responsive editing
    setHotContents(content);

    // Store pending content and debounce the file write
    pendingContentRef.current = content;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (pendingContentRef.current !== null) {
        void writeFileContents(String(pendingContentRef.current));
        pendingContentRef.current = null;
        debounceRef.current = null;
      }
    }, debounceMs);
  };

  /**
   * CLEANUP EFFECT: Flushes pending debounced changes when filePath changes
   * This ensures pending changes are saved to the file they originated from
   */
  useEffect(() => {
    // If filePath changed and we have pending changes, flush them to the previous file
    if (previousFilePathRef.current !== filePath && debounceRef.current && pendingContentRef.current !== null) {
      if (currentWorkspace && previousFilePathRef.current) {
        void currentWorkspace.disk.writeFile(previousFilePathRef.current, String(pendingContentRef.current));
      }
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      pendingContentRef.current = null;
    }

    // Update the previous filePath reference
    previousFilePathRef.current = filePath;
  }, [filePath, currentWorkspace]);

  /**
   * FINAL CLEANUP: Flush any remaining changes on unmount
   */
  useEffect(() => {
    return () => {
      if (
        debounceRef.current &&
        pendingContentRef.current !== null &&
        currentWorkspace &&
        previousFilePathRef.current
      ) {
        console.debug("FINAL CLEANUP - FLUSHING CHANGES");
        void currentWorkspace.disk.writeFile(previousFilePathRef.current, String(pendingContentRef.current));
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [currentWorkspace]);

  /**
   * FILE LOADING EFFECT: Reads file content from disk when filePath changes
   * Triggered by: filePath changes, workspace changes
   * Updates: Both hotContents (live state) and contents (baseline state)
   * Includes: Cancellation support for async operations
   */
  useAsyncEffect2(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    async (signal) => {
      if (currentWorkspace && filePath) {
        try {
          const fileContents = await currentWorkspace.disk.readFile(filePath);

          // Check if operation was cancelled
          if (signal.aborted) return;

          setHotContents(fileContents.toString());
          setInitialContents(fileContents);
          setError(null);
        } catch (error) {
          // Only set error if operation wasn't cancelled
          if (!signal.aborted) {
            setError(error as Error);
          }
        }
      }
    },
    [currentWorkspace, filePath, navigate]
  );

  /**
   * INSIDE WRITE LISTENER: Handles writes from within the current editor instance
   * Triggered by: Same-tab editor changes, internal writes
   * Updates: Only hotContents (live state) - does NOT update baseline contents
   * Purpose: Reflects editor changes without affecting the baseline state
   */
  useEffect(() => {
    if (filePath) {
      return currentWorkspace.disk.insideWriteListener(filePath, (c) => {
        setHotContents(c);
      });
    }
  }, [currentWorkspace, filePath]);

  /**
   * OUTSIDE WRITE LISTENER: Handles writes from external sources (other tabs, processes)
   * Triggered by: File changes from other tabs, external file modifications
   * Updates: Both hotContents (live state) AND contents (baseline state)
   * Purpose: Keeps editor in sync with external file changes
   */
  useEffect(() => {
    if (filePath) {
      return currentWorkspace.disk.outsideWriteListener(filePath, (c) => {
        setHotContents(c);
        setInitialContents(c);
      });
    }
  }, [currentWorkspace, filePath]);

  function updateImmediate(
    content: string,
    {
      outsideWrite = false,
    }: {
      outsideWrite?: boolean;
    } = { outsideWrite: false }
  ) {
    setHotContents(content);
    //rigamarole to keep sequencing consistent
    const promise = outsideWrite
      ? new Promise((rs) => {
          const unsub = currentWorkspace.disk.outsideWriteListener(filePath!, () => {
            rs(void 0);
            unsub();
          });
        })
      : Promise.resolve();
    return Promise.all([
      writeFileContents(content, {
        outsideWrite,
      }),
      promise,
    ]);
  }
  const { data: hotData, content: hotBody } = useMemo(() => {
    return matter(hotContents || "") as Record<string, any>;
  }, [hotContents]);

  const { data: contentsData, content: contentsBody } = useMemo(() => {
    return matter(contents !== null ? String(contents) : "") as Record<string, any>;
  }, [contents]);

  const hasConflicts = hasGitConflictMarkers(hotContents || "");

  /**
   * RETURN VALUES:
   * - contents: Baseline content from disk (for editor initialization)
   * - hotContents: Live content state (for display, includes unsaved changes)
   * - writeFileContents: Direct file write function (used by debounce)
   * - updateDebounce: Debounced write function (used by editor onChange)
   *
   * USAGE PATTERN:
   * - Editor initializes with 'contents'
   * - Editor displays 'hotContents'
   * - Editor calls 'updateDebounce' on changes
   */
  return {
    error,
    hasConflicts,
    hotContents,
    filePath,
    hotData,
    hotBody,
    contents: contents !== null ? String(contents) : null,
    contentsData,
    contentsBody,
    mimeType: getMimeType(filePath ?? "") ?? DEFAULT_MIME_TYPE,
    writeFileContents,
    updateDebounce,
    updateImmediate,
  };
}

export function useWatchTextFileContents({
  currentWorkspace,
  path,
  onChange,
}: {
  currentWorkspace: Workspace;
  path: AbsPath | null;
  onChange: (content: string) => void;
}) {
  useEffect(() => {
    if (!path || !currentWorkspace || !isStringish(path)) return;

    const unsubscribeInside = currentWorkspace.disk.insideWriteListener(path, (content) => {
      onChange(String(content));
    });

    const unsubscribeOutside = currentWorkspace.disk.outsideWriteListener(path, (content) => {
      onChange(String(content));
    });

    return () => {
      unsubscribeInside?.();
      unsubscribeOutside?.();
    };
  }, [currentWorkspace, onChange, path]);
}
