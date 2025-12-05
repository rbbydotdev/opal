import { RemoteAuthAgent } from "@/data/RemoteAuthTypes";
import { isAbortError, unwrapError } from "@/lib/errors/errors";
import { CreateTypedEmitter } from "@/lib/events/TypeEmitter";
import { DeployBundle } from "@/services/deploy/DeployBundle";
import fuzzysort from "fuzzysort";

export const EMPTY_SEARCH_RESULT: Fuzzysort.KeyResults<any> = Object.assign([], {
  total: 0,
});

export const isFuzzyResult = <T = any>(result: unknown): result is Fuzzysort.KeyResult<T> => {
  return (result as Fuzzysort.KeyResult<T>).highlight !== undefined;
};

export interface RemoteAuthAgentSearchType<T = unknown> {
  hasUpdates(
    etag: string | null,
    options?: { signal?: AbortSignal }
  ): Promise<{ updated: boolean; newEtag: string | null }>;
  fetchAll(options?: { signal?: AbortSignal }): Promise<T[]>;
}

export interface RemoteAuthAgentDeployableFiles<
  TBundle extends DeployBundle<any>,
  TParams = unknown,
> extends RemoteAuthAgent {
  deployFiles(bundle: TBundle, params: TParams): Promise<unknown>;
}

type RemoteSearchEventMap<TResult = any> = {
  loading: boolean;
  results: Fuzzysort.KeyResults<TResult> | TResult[];
  error: string | null;
};

export class RemoteSearchFuzzyCache<TResult extends Record<string, any> = Record<string, any>> {
  private cache: {
    allItems: TResult[];
    etag: string | null;
    lastCheck: number;
  } = { allItems: [], etag: null, lastCheck: 0 };

  private initiallyLoaded = false;
  private enabled = false;
  private _loading = false;
  private _results: Fuzzysort.KeyResults<TResult> | TResult[] = EMPTY_SEARCH_RESULT;
  private _error: string | null = null;
  private _searchTerm = "";
  private agent: RemoteAuthAgentSearchType<TResult> | null = null;
  private controller: AbortController | null = null;
  private events = CreateTypedEmitter<RemoteSearchEventMap>();

  constructor(
    agent: RemoteAuthAgentSearchType<TResult> | null = null,
    private searchKey: Extract<keyof TResult, string>
  ) {
    this.agent = agent;
  }

  get loading(): boolean {
    return this._loading;
  }

  get results(): Fuzzysort.KeyResults<TResult> | TResult[] {
    return this._results;
  }

  get error(): string | null {
    return this._error;
  }

  get searchTerm(): string {
    return this._searchTerm;
  }

  // Event subscription methods following iframe pattern
  onLoading = (callback: (loading: boolean) => void) => {
    return this.events.listen("loading", callback);
  };

  getLoading = () => {
    return this._loading;
  };

  onResults = (callback: (results: Fuzzysort.KeyResults<TResult> | TResult[]) => void) => {
    return this.events.listen("results", callback);
  };

  getResults = () => {
    return this._results;
  };

  onError = (callback: (error: string | null) => void) => {
    return this.events.listen("error", callback);
  };

  getError = () => {
    return this._error;
  };

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    if (!enabled) {
      //cancel ongoing searches when disabled
      this.cancel();
    } else if (!this.initiallyLoaded) {
      //perform initial search when enabled
      this.initiallyLoaded = true;
      this.search();
    }

    return this;
  }
  setSearchTerm(searchTerm: string): this {
    this._searchTerm = (() => {
      try {
        return new URL(searchTerm).pathname.replace(/^\//, "");
      } catch (_e) {
        return searchTerm;
      }
    })();

    return this;
  }

  clearError(): this {
    if (this._error !== null) {
      this._error = null;
      this.events.emit("error", null);
    }
    return this;
  }

  search(): this {
    void this.performSearch();
    return this;
  }

  clearCache(): this {
    this.cache.allItems = [];
    this.cache.etag = null;
    this.cache.lastCheck = 0;
    return this;
  }

  reset(): this {
    this.controller?.abort();
    this.controller = null;
    this.setError(null);
    this.setLoading(false);
    this.setResults(EMPTY_SEARCH_RESULT);
    this._searchTerm = "";
    this.clearCache();
    return this;
  }

  private setLoading(loading: boolean): void {
    if (this._loading !== loading) {
      this._loading = loading;
      this.events.emit("loading", loading);
    }
  }

  private setResults(results: Fuzzysort.KeyResults<TResult> | TResult[]): void {
    // // Force a new reference to fix React identity crisis when cache is updated
    // this._results = Array.isArray(results) && !isFuzzyResult(results[0]) ? [...results] : results;
    // this.events.emit("results", this._results);
    this._results = results;
    this.events.emit("results", results);
  }

  private setError(error: string | null): void {
    if (this._error !== error) {
      this._error = error;
      this.events.emit("error", error);
    }
  }

  private async performSearch(): Promise<void> {
    if (!this.agent || !this.enabled) {
      this.setResults(EMPTY_SEARCH_RESULT);
      this.setLoading(false);
      this.setError(null);
      return;
    }

    this.controller?.abort();
    this.controller = new AbortController();

    try {
      // console.debug("Starting search, setting loading to true");
      this.setLoading(true);
      this.setError(null);

      let isStale = this.cache.allItems.length === 0;

      // Check for updates if we have cached data and it's been more than 10 seconds
      if (!isStale && Date.now() - this.cache.lastCheck > 5_000) {
        //
        this.setLoading(false); //stale while revalidating
        this.setResults(this.cache.allItems); //show cached while revalidating
        this.searchResults();
        //

        const { updated, newEtag } = await this.agent.hasUpdates(this.cache.etag, {
          signal: this.controller.signal,
        });
        isStale = updated;
        this.cache.etag = newEtag;
        this.cache.lastCheck = Date.now();
      }
      // Fetch fresh data if needed
      if (isStale) {
        this.cache.allItems = await this.agent.fetchAll({ signal: this.controller.signal });
      }

      // Only update results if this is still the current request
      // const searchResults = !this._searchTerm
      //   ? this.cache.allItems
      //   : fuzzysort.go(this._searchTerm, this.cache.allItems, { key: this.searchKey });
      // this.setResults(searchResults);

      this.searchResults();
      this.setLoading(false);
      this.setError(null);
    } catch (e: unknown) {
      if (!isAbortError(e)) {
        const message = unwrapError(e);
        this.setError(message);
        this.setResults(EMPTY_SEARCH_RESULT);
        console.error("Failed to search:", e);
      }
    } finally {
      this.setLoading(false);
    }
  }

  searchResults = (searchStr = this._searchTerm) => {
    const searchResults = !searchStr
      ? this.cache.allItems
      : fuzzysort.go(searchStr, this.cache.allItems, { key: this.searchKey });

    this.setResults(searchResults);
  };

  cancel = (): void => {
    this.controller?.abort();
    this.controller = null;
  };

  teardown(): void {
    this.controller?.abort();
    this.controller = null;
    fuzzysort.cleanup();
    this.events.removeAllListeners();
  }
}
