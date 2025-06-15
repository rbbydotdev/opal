import { SearchResultData } from "@/features/search/SearchResults";

interface Scannable<T> {
  scan(abortSignal?: AbortSignal): AsyncGenerator<T>;
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

  async *search(
    needle: string,
    options: {
      abortSignal?: AbortSignal;
      caseSensitive?: boolean;
      wholeWord?: boolean;
      regex?: boolean;
    } = { caseSensitive: false, wholeWord: false, regex: false }
  ): AsyncGenerator<{ matches: SearchResultData[]; meta: Omit<T, "text"> }> {
    for await (const item of this.scannable.scan()) {
      if (options.abortSignal?.aborted) {
        console.log("Search aborted in search");
        // throw new Error("Search aborted");
        return;
      }
      const { text: haystack, ...rest } = item;
      const lineBreaks = this.computeLineBreaks(haystack);
      const results: SearchResultData[] = [];
      const re = new RegExp(needle, "gi");
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
      yield { matches: results, meta: rest };
    }
  }
}
