"use client";
import { DocumentChange, historyDB } from "@/components/Editor/HistoryDB";
import {
  Cell,
  Realm,
  Signal,
  debounceTime,
  filter,
  map,
  markdown$,
  markdownSourceEditorValue$,
  realmPlugin,
  setMarkdown$,
  withLatestFrom,
} from "@mdxeditor/editor";
import { Mutex } from "async-mutex";

export class HistoryPlugin {
  static selectedEdit$ = Cell<DocumentChange | null>(null, () => {}, false);
  static resetMd$ = Signal(() => {}, false);
  static clearAll$ = Signal(() => {}, false);
  static muteChange$ = Cell<boolean>(false);
  static draftRootMd$ = Signal<string>(() => {}, false);
  static allMd$ = Cell("", (r) => {
    r.sub(markdown$, (md) => {
      r.pub(HistoryPlugin.allMd$, md);
    });
    r.sub(markdownSourceEditorValue$, (md) => {
      r.pub(HistoryPlugin.allMd$, md);
    });
  });

  private mutex = new Mutex();
  private startingMarkdown = "";
  private id: string | null;
  constructor(
    private realm: Realm,
    { editHistoryId, saveFrequency = 5_000 }: { editHistoryId: string; saveFrequency?: number }
  ) {
    this.id = editHistoryId;
    this.realm = realm;
    this.startingMarkdown = realm.getValue(markdown$);

    realm.sub(
      realm.pipe(
        HistoryPlugin.allMd$,
        withLatestFrom(HistoryPlugin.muteChange$),
        filter(([, muted]) => !muted),
        map(([value]) => value),
        debounceTime(saveFrequency)
      ),
      async (md) => {
        if (this.id !== null) {
          this.startingMarkdown = md;
          await historyDB.saveEdit(this.id!, md);
        }
      }
    );

    realm.sub(HistoryPlugin.resetMd$, () => this.resetToStartingMarkdown());
    realm.sub(HistoryPlugin.selectedEdit$, (edit: DocumentChange | null) => {
      if (edit) {
        void this.transaction(() => this.setMarkdownFromEdit(edit));
      }
    });
    realm.sub(HistoryPlugin.clearAll$, () => this.clearAll());
    realm.sub(HistoryPlugin.draftRootMd$, (md) => {
      this.startingMarkdown = md;
      realm.pub(HistoryPlugin.selectedEdit$, null);
    });
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
        return console.error("no realm for history plugin");
      }
      this.realm.pub(setMarkdown$, this.startingMarkdown);
    });
  }

  async setMarkdownFromEdit(selectedEdit: DocumentChange) {
    void this.transaction(async () => {
      const document = await historyDB.reconstructDocumentFromEdit(selectedEdit);
      if (this.realm) {
        this.realm.pub(setMarkdown$, document);
      } else {
        console.error("realm not set");
      }
    });
  }

  async transaction(fn: (realm: Realm | null) => void) {
    return this.mutex.runExclusive(async () => {
      if (this.realm === null) {
        console.error("realm not set");
        return;
      }
      this.realm.pub(HistoryPlugin.muteChange$, true);
      await fn(this.realm);
      this.realm.pub(HistoryPlugin.muteChange$, false);
    });
  }
}

export const historyPlugin = realmPlugin({
  init(realm: Realm, params?: { editHistoryId: string }) {
    new HistoryPlugin(realm, {
      editHistoryId: params!.editHistoryId,
    });
  },
});
