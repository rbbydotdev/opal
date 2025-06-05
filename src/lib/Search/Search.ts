import { AbsPath } from "@/lib/paths2";

// Serializable result type
export interface SearchResultData {
  lineNumber: number; // 1-based line number
  lineStart: number;
  lineEnd: number;
  start: number;
  end: number;
  lineText: string; // Only the matching line
  relStart: number; // Start of match within lineText
  relEnd: number; // End of match within lineText
  filepath: string;
  workspace: string;
}

export class SearchResults implements Iterable<SearchResult> {
  private results: SearchResultData[];
  constructor(results: SearchResultData[]) {
    this.results = results;
  }
  [Symbol.iterator](): Iterator<SearchResult> {
    let index = 0;
    return {
      next: (): IteratorResult<SearchResult> => {
        if (index < this.results.length) {
          const data = this.results[index++];
          return {
            value: new SearchResult(
              data.lineNumber,
              data.lineStart,
              data.lineEnd,
              data.start,
              data.end,
              data.lineText,
              data.relStart,
              data.relEnd
            ),
            done: false,
          };
        } else {
          return { value: null, done: true };
        }
      },
    };
  }
  get length(): number {
    return this.results.length;
  }
  toJSON(): SearchResultData[] {
    return this.results;
  }
  static fromJSON(data: SearchResultData[]): SearchResults {
    return new SearchResults(data);
  }
  static fromIterable(iterable: Iterable<SearchResultData>): SearchResults {
    const results: SearchResultData[] = [];
    for (const item of iterable) {
      results.push(item);
    }
    return new SearchResults(results);
  }
}

// Class for highlighting and other helpers
export class SearchResult {
  constructor(
    public lineNumber: number,
    public lineStart: number,
    public lineEnd: number,
    public start: number,
    public end: number,
    public lineText: string,
    public relStart: number,
    public relEnd: number
  ) {}

  static fromJSON(data: SearchResultData): SearchResult {
    return new SearchResult(
      data.lineNumber,
      data.lineStart,
      data.lineEnd,
      data.start,
      data.end,
      data.lineText,
      data.relStart,
      data.relEnd
    );
  }

  // Highlight the match in the lineText
  getHighlightedLine(highlightStart = "\x1b[31m", highlightEnd = "\x1b[0m"): string {
    return (
      this.lineText.slice(0, this.relStart) +
      highlightStart +
      this.lineText.slice(this.relStart, this.relEnd) +
      highlightEnd +
      this.lineText.slice(this.relEnd)
    );
  }
}

// Search class
export class Search {
  private lineBreaks: number[];

  constructor(private workspace: string, private filepath: AbsPath, private text: string) {
    this.lineBreaks = this.computeLineBreaks();
  }

  private computeLineBreaks(): number[] {
    const breaks = [-1];
    for (let i = 0; i < this.text.length; i++) {
      if (this.text[i] === "\n") breaks.push(i);
    }
    breaks.push(this.text.length);
    return breaks;
  }

  private findLine(pos: number): { lineStart: number; lineEnd: number; lineNumber: number } {
    for (let i = 0; i < this.lineBreaks.length - 1; i++) {
      if (pos > this.lineBreaks[i] && pos <= this.lineBreaks[i + 1]) {
        return {
          lineStart: this.lineBreaks[i] + 1,
          lineEnd: this.lineBreaks[i + 1],
          lineNumber: i + 1, // 1-based
        };
      }
    }
    return { lineStart: 0, lineEnd: this.text.length, lineNumber: 1 };
  }

  /**
   * Returns an array of serializable result objects, each containing only the matching line.
   */
  public search(regex: string): SearchResultData[] {
    const results: SearchResultData[] = [];
    const re = new RegExp(regex, "g");
    let match: RegExpExecArray | null;

    while ((match = re.exec(this.text)) !== null) {
      const { lineStart, lineEnd, lineNumber } = this.findLine(match.index);
      const relStart = match.index - lineStart;
      const relEnd = match.index + match[0].length - lineStart;
      results.push({
        filepath: this.filepath,
        workspace: this.workspace,
        lineNumber,
        lineStart,
        lineEnd,
        start: match.index,
        end: match.index + match[0].length,
        lineText: this.text.slice(lineStart, lineEnd),
        relStart,
        relEnd,
      });
    }
    return results;
  }
}

/*

// Example usage (main thread):
const TEXT_1 = `

# Lorem ipsum dolor sit needle amet, consectetur adipiscing needle elit.

## Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

  - Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
  - Duis aute irure dolor in reprehenderit in needle voluptate velit esse cillum dolore eu fugiat nulla pariatur.
  - Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

`;

const searcher = new Search(TEXT_1);
const resultsData = searcher.search("need");

// Simulate sending resultsData via postMessage, then reconstructing:
const results = resultsData.map(SearchResult.fromJSON);

for (const result of results) {
  console.log(`${result.lineNumber}: ${result.getHighlightedLine()}`);
}

*/
