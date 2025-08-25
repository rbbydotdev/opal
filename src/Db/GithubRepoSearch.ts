import { useResource } from "@/hooks/useResource";
import { Octokit } from "@octokit/core";
import EventEmitter from "events";
import fuzzysort from "fuzzysort";

// --- 1. Core Interfaces and Types ---

/**
 * A minimal type definition for the repository data we care about.
 */
export interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
}

/**
 * Defines the contract for a paginated data source that supports
 * conditional requests to check for freshness.
 */
export interface Fetcher<T> {
  /**
   * Fetches the next page of results.
   */
  nextPage(): Promise<T[]>;

  /**
   * Indicates if there are more pages to fetch.
   */
  hasMore(): boolean;

  /**
   * Resets the fetcher's internal state to start fetching from the beginning.
   * This must also clear any cached freshness indicators (like an ETag).
   */
  reset(): void;

  /**
   * Checks if the remote data source has been updated since the last fetch.
   * @returns `true` if data is stale and needs a full refresh, `false` otherwise.
   */
  checkIfStale(): Promise<boolean>;
}

// --- 2. Concrete Fetcher Implementation for GitHub Repos ---

export class GitHubRepoFetcher implements Fetcher<Repo> {
  private page = 1;
  private perPage = 100; // Max allowed by GitHub API
  private _hasMore = true;
  private etag: string | null = null;
  private lastContactTime: number = 0;

  constructor(
    private octokit: Octokit,
    private username: string
  ) {}

  hasMore(): boolean {
    return this._hasMore;
  }

  reset(): void {
    this.page = 1;
    this._hasMore = true;
    this.etag = null; // Crucial: Clear the ETag on reset
  }

  async nextPage(): Promise<Repo[]> {
    if (!this._hasMore) {
      return [];
    }

    try {
      const response = await this.octokit.request("GET /user/repos", {
        page: this.page,
        per_page: 100,
        affiliation: "owner,collaborator", // repos you own OR can push to
        direction: "desc", // newest first
      });

      // IMPORTANT: Capture the ETag from the very first page request
      if (this.page === 1 && response.headers.etag) {
        this.etag = response.headers.etag;
        this.lastContactTime = Date.now();
        console.log(`Captured ETag for ${this.username}: ${this.etag}`);
      }

      if (response.data.length < this.perPage) {
        this._hasMore = false;
      }

      this.page++;
      return response.data as Repo[];
    } catch (error) {
      console.error(`Failed to fetch repos for ${this.username}`, error);
      this._hasMore = false;
      return [];
    }
  }

  async checkIfStale(): Promise<boolean> {
    if (Date.now() - this.lastContactTime < 2000) {
      console.log("Skipping staleness check to avoid rapid requests.");
      return false;
    }
    // If we've never fetched, we have no ETag, so it's "stale" by definition.
    if (!this.etag) {
      return true;
    }

    try {
      console.log(`Checking for staleness with ETag: ${this.etag}`);
      // Make a conditional request for the first page.

      const response = await this.octokit.request("GET /user/repos", {
        page: this.page,
        per_page: 100,
        affiliation: "owner,collaborator", // repos you own OR can push to
        direction: "desc", // newest first
        headers: { "If-None-Match": this.etag },
      });
      if (response.headers.etag !== this.etag) {
        console.log(`ETag changed from ${this.etag} to ${response.headers.etag}`);
        this.etag = response.headers.etag || null; // Update to new ETag
        this.lastContactTime = Date.now();
        return true;
      }
      if (response.status === 200) {
        console.log("ETag matched but received 200 OK. Data is stale.");
        return true;
      }
      if (response.status === 304) {
        console.log("ETag matched (304 Not Modified). Data is fresh.");
        return false;
      }
      console.log("ETag mismatch (200 OK). Data is stale.");
      return true;
    } catch (error: any) {
      // Octokit throws an error for a 304 Not Modified response.
      // This is the expected "not stale" case.
      if (error.status === 304) {
        console.log("ETag matched (304 Not Modified). Data is fresh.");
        return false;
      }
      // For any other error, it's safer to assume it's stale and try a refresh.
      console.error("Error during staleness check, assuming stale:", error);
      return true;
    }
  }
}

// --- 3. Generic Search Results Class ---

interface SearchResultsOptions {
  /** The key(s) in the objects to search against with fuzzysort. */
  searchKeys: string[];
}
const SearchEvents = {
  UPDATE: "update",
} as const;
type SearchResultEventMap = {
  [SearchEvents.UPDATE]: [];
};

class SearchResultEmitter extends EventEmitter {
  on<K extends keyof SearchResultEventMap>(event: K, callback: (...args: SearchResultEventMap[K]) => void): this {
    return super.on(event, callback);
  }
  listen<K extends keyof SearchResultEventMap>(
    event: K,
    callback: (...args: SearchResultEventMap[K]) => void
  ): () => void {
    super.on(event, callback);
    return () => {
      this.off(event, callback);
    };
  }

  emit<K extends keyof SearchResultEventMap>(event: K, ...args: SearchResultEventMap[K]): boolean {
    return super.emit(event, ...args);
  }
}

export function useSearchResults<T extends string | object>(fetcher: Fetcher<T>) {
  return useResource(() => new SearchResults<T>(fetcher, { searchKeys: ["full_name"] }), [fetcher]);
}

export class SearchResults<T extends string | object> {
  private fetcher: Fetcher<T>;
  private results: T[] = [];
  private searchKeys: string[];
  private fetchPromise: Promise<void> | null = null;
  private emitter = new SearchResultEmitter();

  constructor(fetcher: Fetcher<T>, options: SearchResultsOptions) {
    this.fetcher = fetcher;
    this.searchKeys = options.searchKeys;
    // this._fetchAllData(); // Start initial fetch immediately
  }

  onUpdate(callback: () => void): () => void {
    return this.emitter.listen(SearchEvents.UPDATE, callback);
  }
  tearDown() {
    this.emitter.removeAllListeners();
  }

  private fetchAllData(): Promise<void> {
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = (async () => {
      try {
        console.log("Starting full data fetch...");
        this.fetcher.reset(); // Reset pagination and clear old ETag
        const allResults: T[] = [];

        while (this.fetcher.hasMore()) {
          const pageResults = await this.fetcher.nextPage();
          allResults.push(...pageResults);
        }

        this.results = allResults;
        console.log(`Fetch complete. Loaded ${this.results.length} items.`);
      } catch (error) {
        console.error("An error occurred during full data fetch:", error);
      } finally {
        this.fetchPromise = null;
      }
    })();

    return this.fetchPromise;
  }

  private async ensureDataIsReady(): Promise<void> {
    if (this.fetchPromise) {
      await this.fetchPromise;
      return;
    }

    const isStale = await this.fetcher.checkIfStale();
    if (isStale) {
      await this.fetchAllData();
    }
  }

  public async search(searchTerm?: string): Promise<Fuzzysort.KeysResults<T>> {
    if (searchTerm === "" || !searchTerm) {
      const empty = [] as [] & { total: number };
      empty.total = 0;
      return empty;
    }
    await this.ensureDataIsReady();

    return fuzzysort.go(searchTerm, this.results, {
      keys: this.searchKeys,
      limit: 50,
    });
  }
}
