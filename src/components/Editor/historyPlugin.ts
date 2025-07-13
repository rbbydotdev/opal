"use client";
import { Cell, Realm, Signal, debounceTime, markdown$, realmPlugin } from "@mdxeditor/editor";
import { DocumentChange, historyDB } from "./HistoryDB";

// Signals$ assume a single editor
// if history plugin used for multiple editors, a different strategy is needed
export const HistoryState = {
  /* signals will be scoped to editor realm */
  selectedEdit$: Cell<DocumentChange | null>(null, () => {}, false),
  resetMd$: Signal(() => {}, false),
  clearAll$: Signal(() => {}, false),
  draftRootMd$: Signal<string>(() => {}, false),
  contentIn$: Signal<string>(() => {}, false),
  contentOut$: Signal<string>(() => {}, false),
  md$: Cell(""),
};

export class HistoryPlugin {
  private saveFrequency = 5_000;
  private startingMarkdown = "";
  private debounceTimeout: NodeJS.Timeout | null = null;
  private muteMdUpdates = false;
  private id: string;
  constructor(private realm: Realm, { editHistoryId }: { editHistoryId: string }) {
    this.id = editHistoryId;
    this.realm = realm;
    this.startingMarkdown = realm.getValue(markdown$);
    realm.sub(HistoryState.contentIn$, (md) => {
      realm.pub(HistoryState.md$, md);
    });
    realm.sub(realm.pipe(markdown$, debounceTime(1000)), (md) => {
      realm.pub(HistoryState.contentIn$, md);
    });

    realm.sub(HistoryState.resetMd$, () => this.resetToStartingMarkdown());
    realm.sub(HistoryState.selectedEdit$, (edit: DocumentChange | null) => {
      if (edit) {
        void this.setMarkdownFromEdit(edit);
        clearTimeout(this.debounceTimeout!);
      }
    });
    realm.sub(HistoryState.clearAll$, () => this.clearAll());
    realm.sub(HistoryState.draftRootMd$, (md) => {
      this.startingMarkdown = md;
      realm.pub(HistoryState.selectedEdit$, null);
    });

    this.submd(realm);
  }

  clearAll() {
    void this.transaction(async () => {
      await historyDB.clearAllEdits(this.id!);
      this.resetToStartingMarkdown();
    });
  }

  resetToStartingMarkdown() {
    void this.transaction(() => {
      if (!this.realm) {
        return console.error("no realm");
      }
      this.realm.pub(HistoryState.contentOut$, this.startingMarkdown);
    });
  }
  debounce(fn: () => void) {
    clearTimeout(this.debounceTimeout!);
    this.debounceTimeout = setTimeout(fn, this.saveFrequency);
  }

  async setMarkdownFromEdit(selectedEdit: DocumentChange) {
    void this.transaction(async () => {
      const document = await historyDB.reconstructDocumentFromEdit(selectedEdit);
      if (this.realm) {
        this.realm.pub(HistoryState.contentOut$, document);
      } else {
        console.error("realm not set");
      }
    });
  }

  async transaction(fn: (realm: Realm | null) => void) {
    if (this.realm === null) {
      console.error("realm not set");
      return;
    }
    this.muteMdUpdates = true;
    await fn(this.realm);
    this.muteMdUpdates = false;
  }

  submd = (realm: Realm) => {
    realm.sub(HistoryState.md$, async (md) => {
      if (!this.muteMdUpdates && this.id !== null) {
        this.startingMarkdown = md;
        await historyDB.saveEdit(this.id!, md);
      }
    });
  };
}

export const historyPlugin = realmPlugin({
  init(realm: Realm, params?: { editHistoryId: string }) {
    if (params) {
      new HistoryPlugin(realm, {
        editHistoryId: params.editHistoryId,
      });
    }
  },
});
