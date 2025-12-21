import { useWatchFileContents } from "@/context/useFileContents";
import { HistoryStore } from "@/data/dao/HistoryDAO";
import { HistoryDocRecord } from "@/data/dao/HistoryDocRecord";
import { ClientDb } from "@/data/instance";
import { useResource } from "@/hooks/useResource";
import pDebounce from "p-debounce";

import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { useCurrentFilepath, useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { Mutex } from "async-mutex";
import { liveQuery, Subscription } from "dexie";
import { createContext, useContext, useState, useSyncExternalStore } from "react";

export class HistoryPlugin4 {
  private debounceMs = 2_000;

  historyStore = new HistoryStore();
  private emitter = CreateSuperTypedEmitter<{
    edits: HistoryDocRecord[];
    pending: boolean;
    mode: "edit" | "propose";
  }>();
  private mutex = new Mutex();

  private muteChange: boolean = false;
  private documentId: string | null = null;
  private workspaceId: string | null = null;
  private releaseLiveQuerySubscription: Subscription["unsubscribe"] = () => {};

  private _baseDoc: string | null = null;
  private _proposedDoc: string | null = null;

  private _edits: HistoryDocRecord[] = [];
  private _mode: "edit" | "propose" = "edit";
  private _pending: boolean = false;

  $watchEdits = (cb: (edits: HistoryDocRecord[]) => void) => {
    return this.emitter.on("edits", (e) => cb(e));
  };
  $getEdits = () => this._edits;

  $watchMode = (cb: (mode: "edit" | "propose") => void) => {
    return this.emitter.on("mode", (mode) => cb(mode));
  };
  $getMode = () => this._mode;

  $watchPending = (cb: (pending: boolean) => void) => {
    return this.emitter.on("pending", (pending) => cb(pending));
  };
  $getPending = () => this._pending;

  set $edits(edits: HistoryDocRecord[]) {
    this._edits = [...edits];
    this.emitter.emit("edits", edits);
  }

  set $mode(mode: "edit" | "propose") {
    this._mode = mode;
    this.emitter.emit("mode", mode);
  }
  get $mode() {
    return this._mode;
  }
  set $pending(pending: boolean) {
    this._pending = pending;
    this.emitter.emit("pending", pending);
  }
  get $pending() {
    return this._pending;
  }

  onEditorChange = async (markdown: string) => {
    if (this.muteChange) {
      return;
    }
    await this.transaction(async () => {
      this.$pending = true;
      await this.onChangeDebounce(markdown);
      this.$pending = false;
    });
  };

  private onChangeDebounce = pDebounce(async (markdown: string) => {
    if (!this.documentId || !this.workspaceId) return;
    const documentId = this.documentId;
    const workspaceId = this.workspaceId;
    return this.historyStore.saveEdit({
      documentId,
      workspaceId,
      markdown,
    });
  }, this.debounceMs);

  async transaction(fn: () => void) {
    await this.mutex.runExclusive(async () => {
      this.muteChange = true;
      await fn();
      this.muteChange = false;
    });
  }

  constructor({ documentId, workspaceId }: { documentId?: string | null; workspaceId?: string | null } = {}) {
    this.setDocument({ documentId, workspaceId });
  }

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
}

export class HistoryPlugin3 {
  constructor({ documentId, workspaceId }: { documentId?: string | null; workspaceId?: string | null } = {}) {
    this.setDocument({ documentId, workspaceId });
  }
  private debounceMs = 2_000;
  historyStore = new HistoryStore();
  mutex = new Mutex();
  private _watchEditsUnsub: Subscription["unsubscribe"] = () => {};

  private muteChange = false;

  private emitter = CreateSuperTypedEmitter<{
    edits: HistoryDocRecord[];
    change_incoming: boolean;
  }>();

  private _edits: HistoryDocRecord[] = [];
  private _changeIncoming = false;

  private documentId: string | null = null;

  private workspaceId: string | null = null;

  getEdits = () => this._edits;
  watchEdits = (cb: (edits: HistoryDocRecord[]) => void) => {
    return this.emitter.on("edits", (e) => cb(e));
  };

  set edits(edits: HistoryDocRecord[]) {
    this._edits = [...edits];
    console.log("emitting edits", edits.length);
    this.emitter.emit("edits", edits);
  }

  setDocument = ({ documentId, workspaceId }: { documentId?: string | null; workspaceId?: string | null }) => {
    if (!documentId || !workspaceId) {
      this._watchEditsUnsub();
      this._edits = [];
      return;
    }
    if (this.documentId === documentId && this.workspaceId == workspaceId) return;
    this.documentId = documentId;
    this.workspaceId = workspaceId;
    this._watchEditsUnsub();

    this._watchEditsUnsub = liveQuery(async () => {
      const r = await ClientDb.historyDocs.where("id").equals(documentId).reverse().sortBy("timestamp");
      return r;
    }).subscribe((edits) => {
      console.log("liveQuery emitted edits", edits.length);
      console.log(this.documentId, this.workspaceId);
      this.edits = edits;
    }).unsubscribe;
  };
  onChange = async (markdown: string) => {
    if (this.muteChange) {
      return;
    }
    await this.transaction(async () => {
      this.changeIncoming = true;
      await this.onChangeDebounce(markdown);
      this.changeIncoming = false;
    });
  };

  set changeIncoming(value: boolean) {
    this._changeIncoming = value;
    this.emitter.emit("change_incoming", value);
  }

  clearAll = async () => {
    if (!this.documentId) return;
    await this.historyStore.clearAllEdits(this.documentId);
  };

  getChangeIncoming = () => this._changeIncoming;
  onChangeIncoming = (cb: (change: boolean) => void) => {
    return this.emitter.on("change_incoming", cb);
  };

  private onChangeDebounce = pDebounce(async (markdown: string) => {
    if (!this.documentId || !this.workspaceId) return;
    const documentId = this.documentId;
    const workspaceId = this.workspaceId;
    return this.historyStore.saveEdit({
      documentId,
      workspaceId,
      markdown,
    });
  }, this.debounceMs);

  updatePreviewForEditId = this.historyStore.updatePreviewForEditId;

  getTextForEdit = this.historyStore.reconstructDocument;

  mute = () => (this.muteChange = true);

  unmute = () => (this.muteChange = false);

  isMuted = () => this.muteChange;

  tearDown = () => {
    this.historyStore.tearDown();
    this._watchEditsUnsub();
  };

  async transaction(fn: () => void) {
    await this.mutex.runExclusive(async () => {
      this.muteChange = true;
      await fn();
      this.muteChange = false;
    });
  }
}

const defaultDocHistory = {
  docHistory: new HistoryPlugin3(),
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
      new HistoryPlugin3({
        documentId: path,
        workspaceId: currentWorkspace.id,
      }),
    [path, currentWorkspace.id]
  );

  useWatchFileContents({
    currentWorkspace,
    onChange: docHistory.onChange,
    path,
  });

  if (!isMarkdown) return children;

  return (
    <DocHistoryContext.Provider
      value={{
        docHistory,
        historyEnabled,
        setHistoryEnabled,
      }}
    >
      {children}
    </DocHistoryContext.Provider>
  );
}

export function useDocHistory() {
  const context = useContext<typeof defaultDocHistory>(DocHistoryContext);
  if (!context) {
    throw new Error("useDocHistory must be used within a DocHistoryProvider");
  }
  return context;
}
export function useDocHistoryEdits() {
  const { docHistory } = useDocHistory();
  return useSyncExternalStore(docHistory.watchEdits, docHistory.getEdits);
}
