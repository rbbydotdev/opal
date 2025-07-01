import { type SearchResultData } from "@/features/search/SearchResults";

interface Scannable<T> {
  scan(): AsyncGenerator<T>;
}
interface ScannableSlurp<T> {
  scanSlurp(): Promise<T>;
}

// Helper function to escape strings for literal regex matching
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class SearchScannable<T extends { text: string }, MetaExtType extends object> {
  constructor(private scannable: Scannable<T>, private metaExt: MetaExtType = {} as MetaExtType) {}

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
    // Use a binary search for performance on very large files, but for simplicity,
    // a linear scan is clear and often sufficient.
    for (let i = 0; i < lineBreaks.length - 1; i++) {
      if (pos > lineBreaks[i]! && pos <= lineBreaks[i + 1]!) {
        return {
          lineStart: lineBreaks[i]! + 1,
          lineEnd: lineBreaks[i + 1]!,
          lineNumber: i + 1, // 1-based
        };
      }
    }
    // Fallback for a position that might be the very start of the file
    if (pos === 0) {
      return {
        lineStart: 0,
        lineEnd: lineBreaks[1] ?? text.length,
        lineNumber: 1,
      };
    }
    // This should be unreachable if lineBreaks is computed correctly
    return { lineStart: 0, lineEnd: text.length, lineNumber: 1 };
  }

  async *search(
    needle: string,
    options: {
      caseSensitive?: boolean;
      wholeWord?: boolean;
      regex?: boolean;
    } = { caseSensitive: false, wholeWord: false, regex: true }
  ): AsyncGenerator<{ matches: SearchResultData[]; meta: Omit<T, "text"> & MetaExtType }> {
    for await (const item of this.scannable.scan()) {
      const { text: haystack, ...rest } = item;
      if (!haystack) continue;

      const lineBreaks = this.computeLineBreaks(haystack);
      const results: SearchResultData[] = [];

      let pattern = options.regex ? needle : escapeRegExp(needle);
      if (options.wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }

      // 'g' for global, 's' for dotAll (so '.' matches '\n')
      let flags = "gs";
      if (!options.caseSensitive) {
        flags += "i";
      }

      const re = new RegExp(pattern, flags);
      let match: RegExpExecArray | null;

      while ((match = re.exec(haystack)) !== null) {
        // An empty match would cause an infinite loop
        if (match[0].length === 0) {
          re.lastIndex++;
          continue;
        }

        const matchStartIndex = match.index;
        const matchEndIndex = match.index + match[0].length;

        // Find line information for the START of the match
        const startLineInfo = this.findLine(haystack, matchStartIndex, lineBreaks);

        // Find line information for the END of the match
        // Use matchEndIndex - 1 to get the line containing the last character
        const endLineInfo = this.findLine(haystack, matchEndIndex > 0 ? matchEndIndex - 1 : 0, lineBreaks);

        const linesSpanned = endLineInfo.lineNumber - startLineInfo.lineNumber;
        // The relative start is based on the first line
        const relStart = matchStartIndex - startLineInfo.lineStart;

        // The relative end is clamped to the end of the first line
        const relEnd = Math.min(matchEndIndex, startLineInfo.lineEnd) - startLineInfo.lineStart;

        results.push({
          lineNumber: startLineInfo.lineNumber,
          lineStart: startLineInfo.lineStart,
          lineEnd: startLineInfo.lineEnd,
          start: matchStartIndex,
          end: matchEndIndex,
          lineText: haystack.slice(startLineInfo.lineStart, startLineInfo.lineEnd),
          relStart,
          relEnd,
          linesSpanned,
        });
      }
      if (results.length > 0) {
        // ...this.meta,
        yield { matches: results, meta: { ...this.metaExt, ...rest } };
      }
    }
  }
}
