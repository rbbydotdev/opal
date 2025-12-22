import { HistoryDocRecord } from "@/data/dao/HistoryDocRecord";
import { ClientDb } from "@/data/instance";
import { EditStorage } from "@/editor/history/EditStorage";
import { useResource } from "@/hooks/useResource";
import pDebounce from "p-debounce";

import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { useCurrentFilepath, useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { Mutex } from "async-mutex";
import { liveQuery, Subscription } from "dexie";
import { createContext, useContext, useState, useSyncExternalStore } from "react";

export class HistoryPlugin {
  static defaultState: {
    editorDoc: string | null;
    baseDoc: string | null;
    proposedDoc: string | null;
    edit: HistoryDocRecord | null;
    edits: HistoryDocRecord[];
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

  editStorage = new EditStorage();
  private emitter = CreateSuperTypedEmitter<{
    editorDoc: string | null;
    edits: HistoryDocRecord[];
    pending: boolean;
    mode: "edit" | "propose";
    edit: HistoryDocRecord | null;
    baseDoc: string | null;
    proposedDoc: string | null;
  }>();
  private mutex = new Mutex();

  private muteChange: boolean = false;
  private documentId: string | null = null;
  private workspaceId: string | null = null;
  private releaseLiveQuerySubscription: Subscription["unsubscribe"] = () => {};
  private setEditorMarkdown: (doc: string) => void = () => {};
  private writeMarkdown: (doc: string) => void = () => {};

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
    editorMarkdown,
    setEditorMarkdown,
    writeMarkdown,
  }: {
    editorMarkdown: string | null;
    setEditorMarkdown?: (doc: string) => void;
    writeMarkdown?: (doc: string) => void;
  }) => {
    if (typeof editorMarkdown === "string") {
      if (this.$baseDoc === null) queueMicrotask(() => (this.$baseDoc = editorMarkdown));
      if (this.$editorMarkdown !== editorMarkdown) queueMicrotask(() => (this.$editorMarkdown = editorMarkdown));
    }
    if (setEditorMarkdown) this.setEditorMarkdown = setEditorMarkdown;
    if (writeMarkdown) this.writeMarkdown = writeMarkdown;
  };

  $watchProposedDoc = (cb: (doc: string | null) => void) => {
    return this.emitter.on("proposedDoc", (doc) => cb(doc));
  };
  $getProposedDoc = () => this.state.proposedDoc;

  $watchEdits = (cb: (edits: HistoryDocRecord[]) => void) => {
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

  $watchEdit = (cb: (edit: HistoryDocRecord | null) => void) => {
    return this.emitter.on("edit", (edit) => cb(edit));
  };
  $getEdit = () => this.state.edit;

  $watchEditorMarkdown = (cb: (doc: string | null) => void) => {
    return this.emitter.on("editorDoc", (doc) => cb(doc));
  };
  $getEditorMarkdown = () => this.state.editorDoc;

  set $edit(edit: HistoryDocRecord | null) {
    this.state.edit = edit;
    this.emitter.emit("edit", edit!);
  }
  get $edit() {
    return this.state.edit;
  }

  set $edits(edits: HistoryDocRecord[]) {
    this.state.edits = [...edits];
    this.emitter.emit("edits", edits);
  }

  set $mode(mode: "edit" | "propose") {
    this.state.mode = mode;
    this.emitter.emit("mode", mode);
  }
  get $mode() {
    return this.state.mode;
  }
  set $pending(pending: boolean) {
    this.state.pending = pending;
    this.emitter.emit("pending", pending);
  }
  get $pending() {
    return this.state.pending;
  }

  set $proposedDoc(doc: string | null) {
    this.state.proposedDoc = doc;
    this.emitter.emit("proposedDoc", doc!);
  }
  get $proposedDoc() {
    return this.state.proposedDoc;
  }

  set editorMarkdown(doc: string | null) {
    this.state.editorDoc = doc;
  }
  get $editorMarkdown() {
    return this.state.editorDoc;
  }
  set $editorMarkdown(doc: string | null) {
    this.state.editorDoc = doc;
    this.emitter.emit("editorDoc", doc!);
  }

  set $baseDoc(doc: string | null) {
    this.state.baseDoc = doc;
    this.emitter.emit("baseDoc", doc!);
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
    return this.$watchEditorMarkdown((doc) => {
      if (this.$mode === "propose" && this.$proposedDoc !== doc) this.backoff();
    });
  }

  propose = async (edit: HistoryDocRecord) => {
    const editText = await this.getTextForEdit(edit);
    this.setEditorMarkdown(editText);
    return this.$$batchSet({
      mode: "propose",
      proposedDoc: editText,
      edit: edit,
    });
  };
  accept = async () => {
    const proposedDoc = this.$proposedDoc!;
    this.writeMarkdown(proposedDoc);
    this.$$batchSet({
      mode: "edit",
      edit: null,
      baseDoc: proposedDoc,
      proposedDoc: null,
      editorDoc: proposedDoc,
    });
  };
  restore = () => {
    const baseDoc = this.$baseDoc!;
    this.setEditorMarkdown(this.$baseDoc!);
    return this.$$batchSet({
      mode: "edit",
      edit: null,
      proposedDoc: null,
      editorDoc: baseDoc,
    });
  };
  backoff = () => {
    return this.$$batchSet({
      mode: "edit",
      edit: null,
      proposedDoc: null,
    });
  };

  clearAll = () => {
    if (!this.documentId) return;
    return this.editStorage.clearAllEdits(this.documentId);
  };

  getTextForEdit = this.editStorage.reconstructDocument;

  saveEdit = async (markdown: string) => {
    this.$editorMarkdown = markdown;
    await this.onChangeDebounce(markdown);
  };

  setDocument = ({ documentId, workspaceId }: { documentId?: string | null; workspaceId?: string | null }) => {
    this.releaseLiveQuerySubscription();
    if (!documentId || !workspaceId) {
      this.$edits = [];
      return;
    }
    if (this.documentId === documentId && this.workspaceId == workspaceId) return;
    this.documentId = documentId;
    this.workspaceId = workspaceId;

    this.releaseLiveQuerySubscription = liveQuery(() =>
      ClientDb.historyDocs.where("id").equals(documentId).reverse().sortBy("timestamp")
    ).subscribe((edits) => (this.$edits = edits)).unsubscribe;
  };

  async transaction(fn: () => void) {
    await this.mutex.runExclusive(async () => {
      this.muteChange = true;
      await fn();
      this.muteChange = false;
    });
  }

  private onChangeDebounce = pDebounce(async (markdown: string) => {
    if (!this.documentId || !this.workspaceId) return;
    const documentId = this.documentId;
    const workspaceId = this.workspaceId;
    return this.editStorage.saveEdit({
      documentId,
      workspaceId,
      markdown,
    });
  }, this.debounceMs);

  tearDown = () => {
    this.editStorage.tearDown();
    this.releaseLiveQuerySubscription();
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

  // useWatchTextFileContents({
  //   currentWorkspace,
  //   onChange: docHistory.onEditorChange,
  //   path,
  // });

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
    editorMarkdown,
    setEditorMarkdown,
    writeMarkdown,
  }: {
    editorMarkdown: string | null;
    setEditorMarkdown?: (doc: string) => void;
    writeMarkdown?: (doc: string) => void;
  } = { editorMarkdown: null }
) {
  const { DocHistory } = useDocHistoryContext();

  DocHistory.hook({
    editorMarkdown,
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
