import React, { JSX } from "react";

export interface SearchResultData {
  lineNumber: number;
  lineStart: number;
  lineEnd: number;
  start: number; // Absolute start index in the full text
  end: number; // Absolute end index in the full text
  lineText: string; // Text of the first line of the match
  relStart: number; // Start index relative to the first line
  relEnd: number; // End index relative to the first line (clamped)
  linesSpanned: number; // Number of *additional* lines the match covers
}

// Class for highlighting and other helpers
export class SearchResult {
  startText: string;
  middleText: string;
  endText: string;
  constructor(
    public lineNumber: number,
    public lineStart: number,
    public lineEnd: number,
    public start: number,
    public end: number,
    public lineText: string,
    public relStart: number,
    public relEnd: number,
    public maxWidth: number = 90 // Default max width for display
  ) {
    // Calculate windowed start, middle, and end text, prioritizing the match (middle)
    const totalLen = this.lineText.length;
    const matchLen = this.relEnd - this.relStart;

    // If the line fits, no need to window
    if (totalLen <= maxWidth) {
      this.startText = this.lineText.slice(0, this.relStart);
      this.middleText = this.lineText.slice(this.relStart, this.relEnd);
      this.endText = this.lineText.slice(this.relEnd);
    } else {
      // Always show the match, window around it
      // Reserve at least 10 chars for start/end if possible
      const minSide = 10;
      const available = maxWidth - matchLen;
      let startLen = Math.max(minSide, Math.floor(available / 2));
      let endLen = available - startLen;

      // Adjust if match is near start or end
      if (this.relStart < startLen) {
        startLen = this.relStart;
        endLen = maxWidth - matchLen - startLen;
      } else if (totalLen - this.relEnd < endLen) {
        endLen = totalLen - this.relEnd;
        startLen = maxWidth - matchLen - endLen;
      }

      const startIdx = Math.max(0, this.relStart - startLen);
      // const endIdx = Math.min(totalLen, this.relEnd + endLen);
      this.startText = (startIdx > 0 ? "…" : "") + this.lineText.slice(startIdx, this.relStart);
      this.middleText = this.lineText.slice(this.relStart, this.relEnd);
      this.endText = this.lineText.slice(this.relEnd); //, endIdx) + (endIdx < totalLen ? "…" : "");
    }
  }

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
  static New(
    lineNumber: number,
    lineStart: number,
    lineEnd: number,
    start: number,
    end: number,
    lineText: string,
    relStart: number,
    relEnd: number,
    width: number = 90
  ): SearchResult {
    return new SearchResult(lineNumber, lineStart, lineEnd, start, end, lineText, relStart, relEnd, width);
  }

  // Highlight the match in the lineText
  usingComponent(HighlightComponent: JSX.ElementType) {
    return [
      this.startText,
      React.createElement(HighlightComponent, { key: "highlight" }, this.middleText),
      this.endText,
    ];
  }
}

export class SearchResults implements Iterable<SearchResult> {
  public readonly results: SearchResultData[];
  public readonly length: number;
  constructor(results: SearchResultData[]) {
    this.results = results;
    this.length = results.length;
  }
  [Symbol.iterator](): Iterator<SearchResult> {
    let index = 0;
    return {
      next: (): IteratorResult<SearchResult> => {
        if (index < this.results.length) {
          const data = this.results[index++];
          if (!data) {
            throw new Error("unexpected end of results");
          }
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
