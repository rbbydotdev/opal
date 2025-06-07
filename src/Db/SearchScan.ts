import React, { JSX } from "react";

interface Scannable<T> {
  scan(): AsyncGenerator<T>;
}

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
  static FromJSON(data: SearchResultData[]): SearchResults {
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

  static FromJSON(data: SearchResultData): SearchResult {
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

  startMiddleEnd() {
    return {
      start: this.lineText.slice(0, this.relStart),
      middle: this.lineText.slice(this.relStart, this.relEnd),
      end: this.lineText.slice(this.relEnd),
    };
  }

  // Highlight the match in the lineText
  usingComponent(HighlightComponent: JSX.ElementType) {
    return [
      this.lineText.slice(0, this.relStart),
      React.createElement(HighlightComponent, { key: "highlight" }, this.lineText.slice(this.relStart, this.relEnd)),
      this.lineText.slice(this.relEnd),
    ];
  }
}

export class SearchScannable<T extends { text: string }> {
  constructor(private scannable: Scannable<T>) {}

  private computeLineBreaks(text: string): number[] {
    const breaks = [-1];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "\n") breaks.push(i);
    }
    breaks.push(text.length);
    return breaks;
  }

  private findLine(
    text: string,
    pos: number,
    lineBreaks: number[]
  ): { lineStart: number; lineEnd: number; lineNumber: number } {
    for (let i = 0; i < lineBreaks.length - 1; i++) {
      if (pos > lineBreaks[i] && pos <= lineBreaks[i + 1]) {
        return {
          lineStart: lineBreaks[i] + 1,
          lineEnd: lineBreaks[i + 1],
          lineNumber: i + 1, // 1-based
        };
      }
    }
    return { lineStart: 0, lineEnd: text.length, lineNumber: 1 };
  }

  async *search(needle: string): AsyncGenerator<{ results: SearchResultData[]; meta: Omit<T, "text"> }> {
    for await (const item of await this.scannable.scan()) {
      const { text: haystack, ...rest } = item;
      const lineBreaks = this.computeLineBreaks(haystack);
      const results: SearchResultData[] = [];
      const re = new RegExp(needle, "g");
      let match: RegExpExecArray | null;

      while ((match = re.exec(haystack)) !== null) {
        const { lineStart, lineEnd, lineNumber } = this.findLine(haystack, match.index, lineBreaks);
        const relStart = match.index - lineStart;
        const relEnd = match.index + match[0].length - lineStart;
        results.push({
          lineNumber,
          lineStart,
          lineEnd,
          start: match.index,
          end: match.index + match[0].length,
          lineText: haystack.slice(lineStart, lineEnd),
          relStart,
          relEnd,
        });
      }
      yield { results, meta: rest };
    }
  }
}
