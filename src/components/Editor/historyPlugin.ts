"use client";
import { Cell, NodeRef, Realm, Signal, markdown$, realmPlugin } from "@mdxeditor/editor";
import { DocumentChange, historyDB } from "./HistoryDB";

//Signals$ assume a single editor
//if history plugin used for multiple editors, a different strategy is needed
export class HistoryPlugin {
  static selectedEdit$ = Cell<DocumentChange | null>(null, () => {}, false);
  static resetMd$ = Signal(() => {}, false);
  static clearAll$ = Signal(() => {}, false);
  static draftRootMd$ = Signal<string>(() => {}, false);
  static contentIn$ = Signal<string>(() => {}, false);
  static contentOut$ = Signal<string>(() => {}, false);

  private saveFrequency = 5_000;
  private md$: NodeRef<string> = Cell("");
  private startingMarkdown = "";
  private debounceTimeout: NodeJS.Timeout | null = null;
  private muteMdUpdates = false;
  private id: string;
  constructor(private realm: Realm, { editHistoryId }: { editHistoryId: string }) {
    this.id = editHistoryId;
    this.realm = realm;
    this.startingMarkdown = realm.getValue(markdown$);
    realm.sub(HistoryPlugin.contentIn$, (md) => realm.pub(this.md$, md));

    realm.sub(HistoryPlugin.resetMd$, () => this.resetToStartingMarkdown());
    realm.sub(HistoryPlugin.selectedEdit$, (edit: DocumentChange | null) => {
      if (edit) {
        void this.setMarkdownFromEdit(edit);
        clearTimeout(this.debounceTimeout!);
      }
    });
    realm.sub(HistoryPlugin.clearAll$, () => this.clearAll());
    realm.sub(HistoryPlugin.draftRootMd$, (md) => {
      this.startingMarkdown = md;
      realm.pub(HistoryPlugin.selectedEdit$, null);
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
      this.realm.pub(HistoryPlugin.contentOut$, this.startingMarkdown);
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
        this.realm.pub(HistoryPlugin.contentOut$, document);
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
    realm.singletonSub(this.md$, (md) => {
      if (!this.muteMdUpdates && this.id !== null) {
        this.debounce(async () => {
          this.startingMarkdown = md;
          await historyDB.saveEdit(this.id!, md);
        });
      }
    });
  };
}
class HistoryRealmPlugin {
  history!: HistoryPlugin;
  init(realm: Realm, params?: { editHistoryId: string }) {
    this.history = new HistoryPlugin(realm, {
      editHistoryId: params!.editHistoryId,
    });
  }
}

export const historyPlugin = realmPlugin(new HistoryRealmPlugin());
