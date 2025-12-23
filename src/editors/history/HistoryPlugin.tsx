import { HistoryDAO } from "@/data/dao/HistoryDOA";
import { ClientDb } from "@/data/instance";
import { HistoryDB } from "@/editors/history/HistoryDB";
import { useResource } from "@/hooks/useResource";
import pDebounce from "p-debounce";

import { CreateScheduledEmitter } from "@/lib/events/CreateScheduledEmitterClass";
import { useCurrentFilepath, useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { liveQuery } from "dexie";
import { createContext, useContext, useState, useSyncExternalStore } from "react";

export class HistoryPlugin {
  static defaultState: {
    editorDoc: string | null;
    baseDoc: string | null;
    proposedDoc: string | null;
    edit: HistoryDAO | null;
    edits: HistoryDAO[];
    mode: "edit" | "propose";
    pending: boolean;
  } = {
    editorDoc: null,
    baseDoc: null,
    proposedDoc: null,
    edit: null,
    edits: [],
    mode: "edit",
    pending: false,
  };

  private debounceMs = 2_000;

  editStorage = new HistoryDB();

  private emitter = CreateScheduledEmitter<{
    editorDoc: string | null;
    edits: HistoryDAO[];
    pending: boolean;
    mode: "edit" | "propose";
    edit: HistoryDAO | null;
    baseDoc: string | null;
    proposedDoc: string | null;
  }>({
    defaultPriority: "idle",
  });

  private documentId: string | null = null;
  private workspaceId: string | null = null;
  private unsubs: Array<() => void> = [];

  private setEditorMarkdown: (doc: string) => void = () => {};
  private writeMarkdown: (doc: string) => void = () => {};
  private updates: (() => void)[] = [];
  private flushUpdates = () => {
    while (this.updates.length > 0) {
      const cb = this.updates.shift()!;
      cb();
    }
  };
  private isBatching = false;
  private scheduleUpdate = (cb: () => void) => {
    this.updates.push(cb);
    if (!this.isBatching) {
      this.isBatching = true;
      setTimeout(() => {
        this.isBatching = false;
        this.flushUpdates();
      }, 0);
    }
  };

  private state = HistoryPlugin.defaultState;

  resetStore = ({ quiet = false }: { quiet?: boolean } = {}) => {
    if (!quiet) {
      this.$$batchSet({ ...HistoryPlugin.defaultState });
    } else {
      this.state = { ...HistoryPlugin.defaultState };
    }
  };

  constructor({ documentId, workspaceId }: { documentId?: string | null; workspaceId?: string | null } = {}) {
    this.setDocument({ documentId, workspaceId });
  }

  hook = ({
    markdownSync,
    setEditorMarkdown,
    writeMarkdown,
  }: {
    markdownSync: string | null;
    setEditorMarkdown?: (doc: string) => void;
    writeMarkdown?: (doc: string) => void;
  }) => {
    if (typeof markdownSync === "string") {
      if (this.$baseDoc === null) this.$baseDoc = markdownSync;
      if (this.$editorMarkdown !== markdownSync) this.$editorMarkdown = markdownSync;
    }
    if (setEditorMarkdown) this.setEditorMarkdown = setEditorMarkdown;
    if (writeMarkdown) this.writeMarkdown = writeMarkdown;
  };

  $watchProposedDoc = (cb: (doc: string | null) => void) => {
    return this.emitter.on("proposedDoc", (doc) => cb(doc));
  };
  $getProposedDoc = () => this.state.proposedDoc;

  $watchEdits = (cb: (edits: HistoryDAO[]) => void) => {
    return this.emitter.on("edits", (e) => cb(e));
  };
  $getEdits = () => this.state.edits;

  $watchMode = (cb: (mode: "edit" | "propose") => void) => {
    return this.emitter.on("mode", (mode) => cb(mode));
  };
  $getMode = () => this.state.mode;

  $watchPending = (cb: (pending: boolean) => void) => {
    return this.emitter.on("pending", (pending) => cb(pending));
  };
  $getPending = () => this.state.pending;

  $watchEdit = (cb: (edit: HistoryDAO | null) => void) => {
    return this.emitter.on("edit", (edit) => cb(edit));
  };
  $getEdit = () => this.state.edit;

  $watchEditorMarkdown = (cb: (doc: string | null) => void) => {
    return this.emitter.on("editorDoc", (doc) => cb(doc));
  };
  $getEditorMarkdown = () => this.state.editorDoc;

  set $edit(edit: HistoryDAO | null) {
    this.state.edit = edit;
    this.scheduleUpdate(() => this.emitter.emit("edit", edit!));
  }
  get $edit() {
    return this.state.edit;
  }

  set $edits(edits: HistoryDAO[]) {
    this.state.edits = [...edits];
    this.scheduleUpdate(() => this.emitter.emit("edits", edits));
  }

  set $mode(mode: "edit" | "propose") {
    this.state.mode = mode;
    this.scheduleUpdate(() => this.emitter.emit("mode", mode));
  }
  get $mode() {
    return this.state.mode;
  }
  set $pending(pending: boolean) {
    this.state.pending = pending;
    this.scheduleUpdate(() => this.emitter.emit("pending", pending));
  }
  get $pending() {
    return this.state.pending;
  }

  set $proposedDoc(doc: string | null) {
    this.state.proposedDoc = doc;
    this.scheduleUpdate(() => this.emitter.emit("proposedDoc", doc!));
  }
  get $proposedDoc() {
    return this.state.proposedDoc;
  }
  get $editorMarkdown() {
    return this.state.editorDoc;
  }
  set $editorMarkdown(doc: string | null) {
    this.state.editorDoc = doc;
    this.scheduleUpdate(() => this.emitter.emit("editorDoc", doc!));
  }

  set $baseDoc(doc: string | null) {
    this.state.baseDoc = doc;
    this.scheduleUpdate(() => this.emitter.emit("baseDoc", doc!));
  }
  get $baseDoc() {
    return this.state.baseDoc;
  }

  //so that multiple state updates can be done without emitting multiple events out of order
  private $$batchSet = (updates: Partial<typeof HistoryPlugin.defaultState>) => {
    for (const key of Object.keys(updates)) {
      if (this.state[key as keyof typeof updates] !== updates[key as keyof typeof updates]) {
        (this.state as any)[key] = updates[key as keyof typeof updates];
      }
    }
    for (const key of Object.keys(updates)) {
      const value = (this.state as any)[key];
      this.emitter.emit(key as keyof typeof this.state, value);
    }
  };

  init() {
    if (!this.documentId || !this.workspaceId) return;
    this.editStorage = new HistoryDB();
    this.unsubs.push(
      ...[
        () => this.editStorage.tearDown(),
        //
        liveQuery(() =>
          ClientDb.historyDocs
            .where({
              id: this.documentId,
              workspaceId: this.workspaceId,
            })
            .reverse()
            .sortBy("timestamp")
        ).subscribe((edits) => (this.$edits = edits)).unsubscribe,
        //
        this.editStorage.initPreviewLFU({ workspaceId: this.workspaceId, documentId: this.documentId }),
        //
        this.$watchEditorMarkdown((doc) => {
          if (this.$mode === "propose" && this.$proposedDoc !== doc) this.backoff();
        }),
        //
        this.$watchEditorMarkdown((doc) => {
          if (this.$mode === "edit") this.$baseDoc = doc;
        }),
      ]
    );
  }

  propose = async (edit: HistoryDAO) => {
    const editText = await this.getTextForEdit(edit);
    this.setEditorMarkdown(editText);
    this.$mode = "propose";
    this.$proposedDoc = editText;
    this.$edit = edit;
  };
  accept = async () => {
    const proposedDoc = this.$proposedDoc!;
    this.writeMarkdown(proposedDoc);
    this.$mode = "edit";
    this.$edit = null;
    this.$baseDoc = proposedDoc;
    this.$proposedDoc = null;
    this.$editorMarkdown = proposedDoc;
  };
  restore = () => {
    const baseDoc = this.$baseDoc!;
    this.setEditorMarkdown(this.$baseDoc!);
    this.$mode = "edit";
    this.$edit = null;
    this.$proposedDoc = null;
    this.$editorMarkdown = baseDoc;
  };
  backoff = () => {
    this.$mode = "edit";
    this.$edit = null;
    this.$proposedDoc = null;
  };

  clearAll = () => {
    if (!this.documentId) return;
    return this.editStorage.clearAllEdits(this.documentId);
  };

  getTextForEdit = this.editStorage.reconstructDocument;

  saveEdit = async (markdown: string, prevMarkdown?: string | null) => {
    this.$editorMarkdown = markdown;
    await this.onChangeDebounce(markdown, prevMarkdown);
  };

  setDocument = ({ documentId, workspaceId }: { documentId?: string | null; workspaceId?: string | null }) => {
    this.tearDown();
    if (!documentId || !workspaceId) return;
    if (this.documentId === documentId && this.workspaceId == workspaceId) return;
    this.documentId = documentId;
    this.workspaceId = workspaceId;
    this.init();
  };

  private onChangeDebounce = pDebounce(async (markdown: string, prevMarkdown?: string | null) => {
    if (!this.documentId || !this.workspaceId) return;
    const documentId = this.documentId;
    const workspaceId = this.workspaceId;
    return this.editStorage.saveEdit({
      documentId,
      workspaceId,
      markdown,
      prevMarkdown,
    });
  }, this.debounceMs);

  tearDown = () => {
    while (this.unsubs.length) this.unsubs.pop()!();
  };
}

const defaultDocHistory = {
  DocHistory: new HistoryPlugin(),
  historyEnabled: false,
  setHistoryEnabled: (enabled: boolean) => {},
};

const DocHistoryContext = createContext(defaultDocHistory);

export function DocHistoryProvider({ children }: { children: React.ReactNode }) {
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const { path } = useWorkspaceRoute();
  const { isMarkdown } = useCurrentFilepath();
  const { currentWorkspace } = useWorkspaceContext();

  const docHistory = useResource(
    () =>
      new HistoryPlugin({
        documentId: path,
        workspaceId: currentWorkspace.id,
      }),
    [path, currentWorkspace.id]
  );

  if (!isMarkdown) return children;

  return (
    <DocHistoryContext.Provider
      value={{
        DocHistory: docHistory,
        historyEnabled,
        setHistoryEnabled,
      }}
    >
      {children}
    </DocHistoryContext.Provider>
  );
}
export function useDocHistory(
  {
    markdownSync,
    setEditorMarkdown,
    writeMarkdown,
  }: {
    markdownSync: string | null;
    setEditorMarkdown?: (doc: string) => void;
    writeMarkdown?: (doc: string) => void;
  } = { markdownSync: null }
) {
  const { DocHistory } = useDocHistoryContext();

  DocHistory.hook({
    markdownSync,
    setEditorMarkdown,
    writeMarkdown,
  });

  const edits = useSyncExternalStore(DocHistory.$watchEdits, DocHistory.$getEdits);
  const pending = useSyncExternalStore(DocHistory.$watchPending, DocHistory.$getPending);
  const mode = useSyncExternalStore(DocHistory.$watchMode, DocHistory.$getMode);
  const edit = useSyncExternalStore(DocHistory.$watchEdit, DocHistory.$getEdit);

  const { accept, propose, restore, backoff, clearAll } = DocHistory;

  return { DocHistory, accept, propose, restore, backoff, clearAll, edits, pending, mode, edit };
}

export function useDocHistoryContext() {
  const context = useContext<typeof defaultDocHistory>(DocHistoryContext);
  if (!context) {
    throw new Error("useDocHistory must be used within a DocHistoryProvider");
  }
  return context;
}
