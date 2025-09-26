import { DEFAULT_MIME_TYPE, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { Workspace } from "@/Db/Workspace";
import { useAsyncEffect } from "@/hooks/useAsyncEffect";
import { getMimeType } from "@/lib/mimeType";
import { AbsPath } from "@/lib/paths2";
import { useNavigate } from "@tanstack/react-router";
import EventEmitter from "events";
import { useEffect, useMemo, useRef, useState } from "react";

const ContentEvents = {
  UPDATE: "update",
} as const;

type ContentEventMap = {
  [ContentEvents.UPDATE]: [md: string];
};
class ContentEventEmitter extends EventEmitter {
  on<K extends keyof ContentEventMap>(event: K, callback: (...args: ContentEventMap[K]) => void): this {
    return super.on(event, callback);
  }
  listen<K extends keyof ContentEventMap>(event: K, callback: (...args: ContentEventMap[K]) => void): () => void {
    super.on(event, callback);
    return () => {
      this.off(event, callback);
    };
  }

  emit<K extends keyof ContentEventMap>(event: K, ...args: ContentEventMap[K]): boolean {
    return super.emit(event, ...args);
  }
}

export function useContentEmitter() {
  const emitter = useMemo(() => new ContentEventEmitter(), []);
  useEffect(() => {
    return () => {
      emitter.removeAllListeners();
    };
  }, [emitter]);
  return emitter;
}

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
  const [hotContents, setHotContents] = useState<string | null>("");
  const onContentChangeRef = useRef(onContentChange);
  const { path: currentRoutePath } = useWorkspaceRoute();
  const [contents, setInitialContents] = useState<Uint8Array<ArrayBufferLike> | string | null>(null);
  const [error, setError] = useState<null | Error>(null);
  const navigate = useNavigate();
  const contentEmitter = useContentEmitter();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(debounceRef.current!), []);

  const filePath = useMemo(() => {
    if (path) return path;
    if (currentRoutePath) return currentRoutePath;
    return null;
  }, [currentRoutePath, path]);

  const writeFileContents = (updates: string) => {
    if (filePath && currentWorkspace) {
      void currentWorkspace?.getDisk().writeFile(filePath, updates);
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
        setHotContents(content);
        writeFileContents(String(content));
      }
    }, debounceMs);
  };

  // Clear debounce when filePath changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [filePath]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useAsyncEffect(async (signal) => {
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
  }, [currentWorkspace, filePath, navigate]);

  useEffect(() => {
    return onContentChangeRef.current?.(String(contents ?? ""));
  }, [contents]);
  useEffect(() => {
    //hmmmmmmmmmmmmmmmmmmmmmmmm
    return contentEmitter.listen(ContentEvents.UPDATE, (c) => {
      if (c !== contents) {
        setHotContents(c.toString());
        onContentChangeRef.current?.(String(c ?? ""));
      }
    });
  });

  useEffect(() => {
    //Mount Local Listener
    if (filePath) {
      return currentWorkspace.getDisk().insideWriteListener(filePath, (c) => {
        setHotContents(c);
      });
    }
  }, [currentWorkspace, filePath]);

  useEffect(() => {
    //Mount Local Listener
    if (filePath) {
      return currentWorkspace.getDisk().outsideWriteListener(filePath, (c) => {
        setHotContents(c);
        setInitialContents(c);
      });
    }
  }, [currentWorkspace, filePath]);


  // contents will not reflect the latest changes via writeFileContents, the state must be tracked somewhere else
  // this avoids glitchy behavior in the editor et all
  // the editor should use contents as initialContents
  // the editor will track the contents state itself, writes using onUpdate WILL write to file
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
