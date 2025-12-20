import { useWatchFileContents } from "@/context/useFileContents";
import { HistoryStore } from "@/data/dao/HistoryDAO";
import { HistoryDocRecord } from "@/data/dao/HistoryDocRecord";
import { ClientDb } from "@/data/instance";
import { useResource } from "@/hooks/useResource";
import { debounce } from "@/lib/debounce";
import { CreateSuperTypedEmitter } from "@/lib/events/TypeEmitter";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { Mutex } from "async-mutex";
import { liveQuery, Subscription } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useState, useSyncExternalStore } from "react";

export class HistoryPlugin3 {
  constructor({ documentId, workspaceId }: { documentId?: string; workspaceId?: string } = {}) {
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
  }>();

  private _edits: HistoryDocRecord[] = [];

  private documentId: string | null = null;

  private workspaceId: string | null = null;

  saveNewEdit = async (markdown: string) => {
    if (!this.documentId || !this.workspaceId) return null;
    return this.historyStore.saveEdit({
      documentId: this.documentId!,
      workspaceId: this.workspaceId!,
      markdown,
    });
  };

  getEdits = () => {
    return this._edits;
  };
  watchEdits = (cb: (edits: HistoryDocRecord[]) => void) => {
    return this.emitter.on("edits", cb);
  };

  setDocument({ documentId, workspaceId }: { documentId?: string | null; workspaceId?: string | null }) {
    if (!documentId || !workspaceId) {
      this._watchEditsUnsub();
      this._edits = [];
      return;
    }
    if (this.documentId === documentId && this.workspaceId == workspaceId) return;
    this.documentId = documentId;
    this.workspaceId = workspaceId;
    this._watchEditsUnsub();
    const watch = liveQuery(() => ClientDb.historyDocs.where("id").equals(documentId).sortBy("timestamp")).subscribe(
      (edits) => {
        this._edits = edits;
        this.emitter.emit("edits", edits);
      }
    );
    this._watchEditsUnsub = () => watch.unsubscribe();
  }

  onChangeDebounce = debounce(async (text: string) => {
    if (!this.documentId) return;
    const saveScore = await this.historyStore.getSaveThreshold(this.documentId, text);
    if (saveScore < this.saveThreshold) {
      return console.debug(`Skipping save for ${this.documentId} due to low score: ${saveScore}`);
    }
    return this.saveNewEdit(text);
  }, this.debounceMs);
  updatePreviewForEditId = this.historyStore.updatePreviewForEditId;

  getTextForEdit = this.historyStore.reconstructDocument;

  mute = () => (this.muteChange = true);

  unmute = () => (this.muteChange = false);

  tearDown = () => {
    this.historyStore.tearDown();
    this._watchEditsUnsub();
  };

  private async transaction(fn: () => void) {
    return this.mutex.runExclusive(async () => {
      this.muteChange = true;
      await fn();
      this.muteChange = false;
    });
  }
}

export function useHistoryEdits({ documentId }: { documentId: string }) {
  useLiveQuery(() => ClientDb.historyDocs.where("id").equals(documentId).sortBy("timestamp"), [documentId]);
}

const defaultDocHistory = {
  docHistory: new HistoryPlugin3(),
  historyEnabled: false,
  setHistoryEnabled: (enabled: boolean) => {},
};

const DocHistoryContext = createContext(defaultDocHistory);

export function DocHistoryProvider({ children }: { children: React.ReactNode }) {
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const docHistory = useResource(() => new HistoryPlugin3());
  const { path } = useWorkspaceRoute();
  const { currentWorkspace } = useWorkspaceContext();
  docHistory.setDocument({
    documentId: path,
    workspaceId: currentWorkspace.id,
  });
  useWatchFileContents({
    currentWorkspace,
    onChange: docHistory.onChangeDebounce,
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
  return useSyncExternalStore(docHistory.watchEdits, docHistory.getEdits);
}
