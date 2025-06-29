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
    public linesSpanned: number,
    public maxWidth: number = 90 // Default max width for display
  ) {
    // The goal of this constructor is to create a "windowed" view of the line
    // containing the search result. It splits the line into three parts:
    // `startText`: The text before the match.
    // `middleText`: The matched text itself (which will be highlighted).
    // `endText`: The text after the match.
    // This is done to ensure the result fits within a specified `maxWidth`.

    // Get the total character length of the original line of text.
    const totalLen = this.lineText.length;
    // Calculate the length of the matched text using its relative start/end positions.
    const matchLen = this.relEnd - this.relStart;

    // Check if the entire line is shorter than or equal to the maximum display width.
    if (totalLen <= maxWidth) {
      // If the line fits, no truncation is needed.
      // `startText` is everything from the beginning of the line up to the match.
      this.startText = this.lineText.slice(0, this.relStart);
      // `middleText` is the matched text itself.
      this.middleText = this.lineText.slice(this.relStart, this.relEnd);
      // `endText` is everything from the end of the match to the end of the line.
      this.endText = this.lineText.slice(this.relEnd);
    } else {
      // This block handles cases where the line is too long and must be truncated.
      // The logic prioritizes showing the full match (`middleText`) and then
      // showing as much context around it as possible.

      // Define a minimum desired length for the text shown before and after the match.
      const minSide = 10;
      // Calculate the total available character space for the text surrounding the match.
      const available = maxWidth - matchLen;
      // Tentatively assign half of the available space to the text before the match (`startLen`),
      // but ensure it's at least `minSide` characters long if possible.
      let startLen = Math.max(minSide, Math.floor(available / 2));
      // Assign the remaining available space to the text that will come after the match (`endLen`).
      let endLen = available - startLen;

      // This section adjusts the lengths if the match is too close to the start or end of the line.
      // Check if the match starts too close to the beginning of the line for the calculated `startLen`.
      if (this.relStart < startLen) {
        // If so, the actual length of the preceding text can only be what's available.
        startLen = this.relStart;
        // Recalculate `endLen` to give the extra space to the text after the match.
        endLen = maxWidth - matchLen - startLen;
      } else if (totalLen - this.relEnd < endLen) {
        // Check if the match ends too close to the end of the line for the calculated `endLen`.
        // If so, the actual length of the following text is just the number of characters left.
        endLen = totalLen - this.relEnd;
        // Recalculate `startLen` to give the extra space to the text before the match.
        startLen = maxWidth - matchLen - endLen;
      }

      // Calculate the index from which to start slicing the `startText`.
      // This is the match's start position minus the calculated space for the preceding text.
      // `Math.max` ensures the index is not negative.
      const startIdx = Math.max(0, this.relStart - startLen);
      // Create the `startText`. Prepend an ellipsis "…" if the text was truncated at the beginning (i.e., `startIdx` is not 0).
      this.startText = (startIdx > 0 ? "…" : "") + this.lineText.slice(startIdx, this.relStart);
      // The `middleText` is always the full, untruncated matched text.
      this.middleText = this.lineText.slice(this.relStart, this.relEnd);
      // The `endText` is assigned the rest of the line's text, from the end of the match onwards.
      // Note: This part is not truncated based on `endLen` and may cause the total displayed
      // text to exceed `maxWidth`. It should likely be truncated for a correct implementation.
      this.endText = this.lineText.slice(this.relEnd);
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
      data.relEnd,
      data.linesSpanned
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
              data.relEnd,
              data.linesSpanned
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
