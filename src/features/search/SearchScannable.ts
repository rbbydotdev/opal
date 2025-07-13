import { type SearchResultData } from "@/features/search/SearchResults";
import { prettifyMarkdownSync } from "@/lib/markdown/prettifyMarkdown";
import { checkSum } from "../../lib/checkSum";

export interface Scannable<T> {
  scan(): AsyncGenerator<T>;
}

export type UnwrapScannable<T extends Scannable<unknown>> = T extends Scannable<infer U> ? U : never;

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class SearchTextScannable<MetaExtType extends object, Scanner extends Scannable<{ text: string } & object>> {
  constructor(
    private scanner: Scanner,
    private metaExt: MetaExtType & ValidateDisjoint<MetaExtType, Omit<UnwrapScannable<Scanner>, "text">>
  ) {}

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
      if (pos > lineBreaks[i]! && pos <= lineBreaks[i + 1]!) {
        return {
          lineStart: lineBreaks[i]! + 1,
          lineEnd: lineBreaks[i + 1]!,
          lineNumber: i + 1, // 1-based
        };
      }
    }
    if (pos === 0) {
      return {
        lineStart: 0,
        lineEnd: lineBreaks[1] ?? text.length,
        lineNumber: 1,
      };
    }
    return { lineStart: 0, lineEnd: text.length, lineNumber: 1 };
  }

  async *search(
    needle: string,
    options: {
      caseSensitive?: boolean;
      wholeWord?: boolean;
      regex?: boolean;
    } = { caseSensitive: false, wholeWord: false, regex: true }
  ): AsyncGenerator<{
    matches: SearchResultData[];
    meta: Omit<UnwrapScannable<Scanner>, "text"> & MetaExtType;
  }> {
    for await (const item of this.scanner.scan()) {
      const { text, ...rest } = item;
      const haystack = prettifyMarkdownSync(text.normalize("NFKD"));

      if (!haystack) continue;

      const lineBreaks = this.computeLineBreaks(haystack);
      const results: SearchResultData[] = [];

      let pattern = options.regex ? needle : escapeRegExp(needle);
      if (options.wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }

      let flags = "gs";
      if (!options.caseSensitive) {
        flags += "i";
      }

      const re = new RegExp(pattern, flags);
      let match: RegExpExecArray | null;

      while ((match = re.exec(haystack)) !== null) {
        if (match[0].length === 0) {
          re.lastIndex++;
          continue;
        }

        const matchStartIndex = match.index;
        const matchEndIndex = match.index + match[0].length;
        const startLineInfo = this.findLine(haystack, matchStartIndex, lineBreaks);
        const endLineInfo = this.findLine(haystack, matchEndIndex > 0 ? matchEndIndex - 1 : 0, lineBreaks);
        const linesSpanned = endLineInfo.lineNumber - startLineInfo.lineNumber;
        const relStart = matchStartIndex - startLineInfo.lineStart;
        const relEnd = Math.min(matchEndIndex, startLineInfo.lineEnd) - startLineInfo.lineStart;

        results.push({
          chsum: checkSum(haystack.slice(matchStartIndex, matchEndIndex)),
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
        // This is now fully type-safe without assertions.
        // `rest` has the correct type (e.g., { sourceFile: string })
        // and the constructor has guaranteed it doesn't conflict with `this.metaExt`.
        yield {
          matches: results,
          meta: { ...rest, ...this.metaExt } as Omit<UnwrapScannable<Scanner>, "text"> & MetaExtType,
        };
      }
    }
  }
}
