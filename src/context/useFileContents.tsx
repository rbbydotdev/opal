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
        writeFileContents(String(content));
      }
    }, debounceMs);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useAsyncEffect(async () => {
    if (currentWorkspace && filePath) {
      try {
        setInitialContents(await currentWorkspace.getDisk().readFile(filePath));
        setError(null);
      } catch (error) {
        setError(error as Error);
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
        onContentChangeRef.current?.(String(c ?? ""));
      }
    });
  });

  useEffect(() => {
    //Mount Local Listener
    if (filePath) {
      return currentWorkspace.getDisk().outsideWriteListener(filePath, setInitialContents);
    }
  }, [currentWorkspace, filePath]);

  useEffect(() => {
    if (filePath) {
      return currentWorkspace
        .getDisk()
        .outsideWriteListener(filePath, (content) => contentEmitter.emit(ContentEvents.UPDATE, content));
    }
  }, [contentEmitter, currentWorkspace, filePath]);

  // contents will not reflect the latest changes via writeFileContents, the state must be tracked somewhere else
  // this avoids glitchy behavior in the editor et all
  // the editor should use contents as initialContents
  // the editor will track the contents state itself, writes using onUpdate WILL write to file
  return {
    contentEmitter,
    error,
    filePath,
    contents: contents !== null ? String(contents) : null,
    mimeType: getMimeType(filePath ?? "") ?? DEFAULT_MIME_TYPE,
    writeFileContents,
    updateDebounce,
  };
}
