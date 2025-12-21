import { useWatchFileContents } from "@/context/useFileContents";
import { HistoryStore } from "@/data/dao/HistoryDAO";
import { HistoryDocRecord } from "@/data/dao/HistoryDocRecord";
import { ClientDb } from "@/data/instance";
import { useResource } from "@/hooks/useResource";
import { debouncePromise } from "@/lib/debounce";
import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { getMimeType } from "@/lib/mimeType";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { Mutex } from "async-mutex";
import { liveQuery, Subscription } from "dexie";
import { createContext, useContext, useState, useSyncExternalStore } from "react";

export class HistoryPlugin3 {
  constructor({ documentId, workspaceId }: { documentId?: string | null; workspaceId?: string | null } = {}) {
    this.setDocument({ documentId, workspaceId });
  }
  private debounceMs = 2_000;
  // private saveThreshold = 0.7;
  private saveThreshold = 0;
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

  // saveNewEdit = async (markdown: string) => {
  // if (!this.documentId || !this.workspaceId) return null;
  // };

  getEdits = () => {
    console.log("getEdits called", this._edits.length);
    return this._edits;
  };
  watchEdits = (cb: (edits: HistoryDocRecord[]) => void) => {
    return this.emitter.on("edits", (e) => {
      console.log("emitting edits to watcher", e.length);
      cb(e);
    });
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

  private onChangeDebounce = debouncePromise(async (markdown: string) => {
    if (!this.documentId || !this.workspaceId) return;
    const documentId = this.documentId;
    const workspaceId = this.workspaceId;
    const saveScore = await this.historyStore.getSaveThreshold(documentId, markdown);
    if (saveScore < this.saveThreshold) {
      return console.debug(`Skipping save for ${this.documentId} due to low score: ${saveScore}`);
    }
    console.log("saving edit for", this.documentId, "score:", saveScore);
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
  const { path } = useWorkspaceRoute();
  if (path === null || getMimeType(path) !== "text/markdown") return <>{children}</>;
  return <DocHistoryProviderInternal>{children}</DocHistoryProviderInternal>;
}
function DocHistoryProviderInternal({ children }: { children: React.ReactNode }) {
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  const docHistory = useResource(
    () =>
      new HistoryPlugin3({
        documentId: path,
        workspaceId: currentWorkspace.id,
      }),
    [path, currentWorkspace]
  );
  useWatchFileContents({
    currentWorkspace,
    onChange: docHistory.onChange,
    path,
  });

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
  const edits = useSyncExternalStore(docHistory.watchEdits, docHistory.getEdits);
  console.log(edits.length);
  return edits;
}
