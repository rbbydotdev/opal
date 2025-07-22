"use client";
import { HistoryDocRecord, HistoryStorageInterface } from "@/Db/HistoryDAO";
import {
  Cell,
  debounceTime,
  filter,
  map,
  markdown$,
  markdownSourceEditorValue$,
  Realm,
  realmPlugin,
  setMarkdown$,
  Signal,
  withLatestFrom,
} from "@mdxeditor/editor";
import { Mutex } from "async-mutex";

export class HistoryPlugin {
  static edits$ = Cell<HistoryDocRecord[]>([]);
  static selectedEdit$ = Cell<HistoryDocRecord | null>(null, () => {}, false);
  static resetMd$ = Signal(() => {}, false);
  static clearAll$ = Signal(() => {}, false);
  static muteChange$ = Cell<boolean>(false);
  static latestMd$ = Cell<string>("");

  static selectedEditDoc$ = Cell<string | null>(null);

  static allMd$ = Cell("", (r) => {
    r.sub(markdown$, (md) => {
      r.pub(HistoryPlugin.allMd$, md);
    });
    r.sub(markdownSourceEditorValue$, (md) => {
      r.pub(HistoryPlugin.allMd$, md);
    });
  });

  private historyStorage: HistoryStorageInterface;
  private mutex = new Mutex();
  private id: string | null;
  constructor(
    private realm: Realm,
    {
      historyRoot,
      historyStorage,
      editHistoryId,
      saveFrequency = 1_000,
    }: { historyRoot: string; historyStorage: HistoryStorageInterface; editHistoryId: string; saveFrequency?: number }
  ) {
    this.historyStorage = historyStorage;
    this.id = editHistoryId;
    this.realm = realm;
    realm.pub(HistoryPlugin.latestMd$, historyRoot);

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
          const edits = await this.historyStorage.getEdits(this.id);
          if (!edits.length) {
            // If there are no edits yet, we can save the initial state as the first edit
            await this.historyStorage.saveEdit(this.id!, realm.getValue(HistoryPlugin.latestMd$));
          }
          realm.pub(HistoryPlugin.latestMd$, md);
          const latest = await this.historyStorage.getLatestEdit(this.id);
          // check if edit is redundant
          if (latest) {
            const latestDoc = await this.historyStorage.reconstructDocumentFromEdit(latest);
            if (latestDoc === md) {
              console.log("Skipping redundant edit save");
              return;
            }
          }
          await this.historyStorage.saveEdit(this.id!, md);
        }
      }
    );

    realm.sub(HistoryPlugin.resetMd$, () => this.resetToStartingMarkdown());
    realm.sub(HistoryPlugin.selectedEdit$, (edit: HistoryDocRecord | null) => {
      void this.transaction(async () => {
        if (edit) {
          const document = await this.historyStorage.reconstructDocumentFromEdit(edit);
          this.realm.pub(setMarkdown$, document);
          this.realm.pub(HistoryPlugin.selectedEditDoc$, document);
        } else {
          realm.pub(HistoryPlugin.selectedEditDoc$, null);
        }
      });
    });
    realm.sub(HistoryPlugin.clearAll$, () => this.clearAll());

    void historyStorage.getEdits(this.id).then(async (edits) => {
      // Initialize the edits Cell with the current edits
      this.realm.pub(HistoryPlugin.edits$, edits);
    });

    historyStorage.onUpdate(this.id, (edits) => {
      this.realm.pub(HistoryPlugin.edits$, edits);
    });
  }

  private clearAll() {
    void this.transaction(async () => {
      await this.historyStorage.clearAllEdits(this.id!);
      this.resetToStartingMarkdown();
    });
  }

  private resetToStartingMarkdown() {
    void this.transaction(() => {
      if (!this.realm) {
        return console.error("no realm for history plugin");
      }
      this.realm.pub(setMarkdown$, this.realm.getValue(HistoryPlugin.latestMd$));
    });
  }

  private async transaction(fn: (realm: Realm | null) => void) {
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
  init(realm: Realm, params?: { historyRoot: string; editHistoryId: string; historyStorage: HistoryStorageInterface }) {
    new HistoryPlugin(realm, {
      historyRoot: params!.historyRoot,
      editHistoryId: params!.editHistoryId,
      historyStorage: params!.historyStorage,
    });
  },
});
