import { HistoryDAO } from "@/data/dao/HistoryDOA";
import { ClientDb } from "@/data/db/DBInstance";
import { HistoryDB } from "@/editors/history/HistoryDB";
import { useResource } from "@/hooks/useResource";
import pDebounce from "p-debounce";

import { emitter, observeMultiple } from "@/lib/Observable";
import { useCurrentFilepath, useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { liveQuery } from "dexie";
import { createContext, useContext, useState, useSyncExternalStore } from "react";

export class HistoryPlugin {
  static defaultState = {
    editorDoc: null as string | null,
    baseDoc: null as string | null,
    proposedDoc: null as string | null,
    edit: null as HistoryDAO | null,
    edits: [] as HistoryDAO[],
    mode: "edit" as "edit" | "propose",
    pending: false,
  };

  private debounceMs = 2_000;

  editStorage = new HistoryDB();

  state = observeMultiple({ ...HistoryPlugin.defaultState }, {}, { batch: true });

  private documentId: string | null = null;
  private workspaceId: string | null = null;
  private unsubs: Array<() => void> = [];

  private setEditorMarkdown: (doc: string) => void = () => {};
  private writeMarkdown: (doc: string) => void = () => {};

  resetStore = ({ quiet = false }: { quiet?: boolean } = {}) => {
    Object.assign(this.state, HistoryPlugin.defaultState);
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
      if (this.state.baseDoc === null) this.state.baseDoc = markdownSync;

      // Don't sync editorDoc from external editor when in propose mode
      // This prevents the cycle where propose() -> setEditorMarkdown() -> hook() -> backoff()
      if (this.state.mode !== "propose" && this.state.editorDoc !== markdownSync) {
        this.state.editorDoc = markdownSync;
      }
    }
    if (setEditorMarkdown) this.setEditorMarkdown = setEditorMarkdown;
    if (writeMarkdown) this.writeMarkdown = writeMarkdown;
  };

  init() {
    if (!this.documentId || !this.workspaceId) return;
    this.editStorage = new HistoryDB();
    this.unsubs.push(
      ...[
        () => this.editStorage.tearDown(),
        liveQuery(() =>
          ClientDb.historyDocs
            .where({
              id: this.documentId,
              workspaceId: this.workspaceId,
            })
            .reverse()
            .sortBy("timestamp")
        ).subscribe((edits) => (this.state.edits = edits)).unsubscribe,
        emitter(this.state).on("editorDoc", () => {
          if (this.state.mode === "propose" && this.state.proposedDoc !== this.state.editorDoc) {
            this.backoff();
          }
        }),
        emitter(this.state).on("editorDoc", () => {
          if (this.state.mode === "edit") this.state.baseDoc = this.state.editorDoc;
        }),
      ]
    );
  }

  propose = async (edit: HistoryDAO) => {
    const editText = await this.getTextForEdit(edit);

    // Update state first, then sync to editor
    this.state.mode = "propose";
    this.state.proposedDoc = editText;
    this.state.editorDoc = editText; // Set our internal state
    this.state.edit = edit;

    // Then update the external editor
    this.setEditorMarkdown(editText);
  };
  accept = async () => {
    const proposedDoc = this.state.proposedDoc!;
    this.writeMarkdown(proposedDoc);
    this.state.mode = "edit";
    this.state.edit = null;
    this.state.baseDoc = proposedDoc;
    this.state.proposedDoc = null;
    this.state.editorDoc = proposedDoc;
  };
  restore = () => {
    const baseDoc = this.state.baseDoc!;
    this.setEditorMarkdown(baseDoc);
    this.state.mode = "edit";
    this.state.edit = null;
    this.state.proposedDoc = null;
    this.state.editorDoc = baseDoc;
  };
  backoff = () => {
    this.state.mode = "edit";
    this.state.edit = null;
    this.state.proposedDoc = null;
  };

  clearAll = () => {
    if (!this.documentId) return;
    return this.editStorage.clearAllEdits(this.documentId);
  };

  getTextForEdit = this.editStorage.reconstructDocument;

  saveEdit = async (markdown: string, prevMarkdown?: string | null) => {
    this.state.editorDoc = markdown;
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

  private onChange = async (markdown: string, prevMarkdown?: string | null) => {
    if (!this.documentId || !this.workspaceId) return;
    return this.editStorage.saveEdit({
      documentId: this.documentId,
      workspaceId: this.workspaceId,
      markdown,
      prevMarkdown,
    });
  };

  private onChangeDebounce = pDebounce(this.onChange, this.debounceMs);

  tearDown = () => {
    while (this.unsubs.length) this.unsubs.pop()?.();
  };
}

const defaultDocHistory = {
  DocHistory: new HistoryPlugin(),
  historyEnabled: false,
  setHistoryEnabled: (_enabled: boolean) => {},
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

  const edits = useSyncExternalStore(
    (callback) => emitter(DocHistory.state).on("edits", callback),
    () => DocHistory.state.edits
  );
  const pending = useSyncExternalStore(
    (callback) => emitter(DocHistory.state).on("pending", callback),
    () => DocHistory.state.pending
  );
  const mode = useSyncExternalStore(
    (callback) => emitter(DocHistory.state).on("mode", callback),
    () => DocHistory.state.mode
  );
  const edit = useSyncExternalStore(
    (callback) => emitter(DocHistory.state).on("edit", callback),
    () => DocHistory.state.edit
  );

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
