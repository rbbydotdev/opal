import { DEFAULT_MIME_TYPE, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { Workspace } from "@/data/Workspace";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath } from "@/lib/paths2";
import { CreateTypedEmitter } from "@/lib/TypeEmitter";
import { useNavigate } from "@tanstack/react-router";
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
    const unsubscribeInside = currentWorkspace.getDisk().insideWriteListener(path, (content) => {
      setContent(String(content));
    });

    const unsubscribeOutside = currentWorkspace.getDisk().outsideWriteListener(path, (content) => {
      setContent(String(content));
    });

    return () => {
      unsubscribeInside?.();
      unsubscribeOutside?.();
    };
  }, [currentWorkspace, path]);

  return content;
}

const ContentEvents = {
  UPDATE: "update",
} as const;

type ContentEventMap = {
  [ContentEvents.UPDATE]: string;
};

/**
 * Creates a singleton content emitter for programmatic content updates
 * Used when components need to push content changes without going through the editor
 * Cleanup: Removes all listeners on unmount to prevent memory leaks
 */
export function useContentEmitter() {
  const emitter = useMemo(() => CreateTypedEmitter<ContentEventMap>(), []);
  useEffect(() => {
    return () => {
      emitter.removeAllListeners();
    };
  }, [emitter]);
  return emitter;
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
  onContentChange,
  debounceMs = 250,
  path,
}: {
  currentWorkspace: Workspace;
  onContentChange?: (content: string) => void;
  debounceMs?: number;
  path?: AbsPath | null;
}) {
  // Live content state - immediate updates from editor, shows current editor state
  const [hotContents, setHotContents] = useState<string | null>("");

  const onContentChangeRef = useRef(onContentChange);
  const { path: currentRoutePath } = useWorkspaceRoute();

  // Baseline content from disk - only updated on file read or outside writes
  const [contents, setInitialContents] = useState<Uint8Array<ArrayBufferLike> | string | null>(null);
  const [error, setError] = useState<null | Error>(null);
  const navigate = useNavigate();
  const contentEmitter = useContentEmitter();

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
   * NOTE: Does NOT emit OUTSIDE_WRITE to avoid editor text corruption
   * INSIDE_WRITE events are handled elsewhere in the editor chain
   */
  const writeFileContents = useCallback(
    (updates: string) => {
      if (filePath && currentWorkspace) {
        void currentWorkspace?.getDisk().writeFile(filePath, updates);
        // DO NOT EMIT OUTSIDE_WRITE - causes text-md-text corruption in editor
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
        writeFileContents(String(pendingContentRef.current));
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
        void currentWorkspace.getDisk().writeFile(previousFilePathRef.current, String(pendingContentRef.current));
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
        console.log("FINAL CLEANUP - FLUSHING CHANGES");
        void currentWorkspace.getDisk().writeFile(previousFilePathRef.current, String(pendingContentRef.current));
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
  useAsyncEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    async (signal) => {
      if (currentWorkspace && filePath) {
        try {
          const fileContents = await currentWorkspace.getDisk().readFile(filePath);

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
   * CONTENT CHANGE CALLBACK: Notifies parent components when baseline content changes
   * Triggered by: contents state changes (file loads, outside writes)
   * Purpose: Allows parent components to react to content updates
   */
  useEffect(() => {
    return onContentChangeRef.current?.(String(contents ?? ""));
  }, [contents]);

  /**
   * CONTENT EMITTER LISTENER: Handles programmatic content updates
   * Triggered by: contentEmitter.emit(ContentEvents.UPDATE, content)
   * Updates: hotContents (immediate) and calls onContentChange callback
   * Used for: Components that need to programmatically update content
   */
  useEffect(() => {
    return contentEmitter.listen(ContentEvents.UPDATE, (c) => {
      if (c !== pendingContentRef.current) {
        setHotContents(c.toString());
        onContentChangeRef.current?.(String(c ?? ""));
      }
    });
  });

  /**
   * INSIDE WRITE LISTENER: Handles writes from within the current editor instance
   * Triggered by: Same-tab editor changes, internal writes
   * Updates: Only hotContents (live state) - does NOT update baseline contents
   * Purpose: Reflects editor changes without affecting the baseline state
   */
  useEffect(() => {
    if (filePath) {
      return currentWorkspace.getDisk().insideWriteListener(filePath, (c) => {
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
      return currentWorkspace.getDisk().outsideWriteListener(filePath, (c) => {
        setHotContents(c);
        setInitialContents(c);
      });
    }
  }, [currentWorkspace, filePath]);

  /**
   * RETURN VALUES:
   * - contents: Baseline content from disk (for editor initialization)
   * - hotContents: Live content state (for display, includes unsaved changes)
   * - writeFileContents: Direct file write function (used by debounce)
   * - updateDebounce: Debounced write function (used by editor onChange)
   * - contentEmitter: For programmatic content updates
   *
   * USAGE PATTERN:
   * - Editor initializes with 'contents'
   * - Editor displays 'hotContents'
   * - Editor calls 'updateDebounce' on changes
   * - External updates use 'contentEmitter'
   */
  return {
    contentEmitter,
    error,
    hotContents,
    filePath,
    contents: contents !== null ? String(contents) : null,
    mimeType: getMimeType(filePath ?? "") ?? DEFAULT_MIME_TYPE,
    writeFileContents,
    updateDebounce,
  };
}
