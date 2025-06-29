//same as searchText in searchPlugin.tsx
type ScanMatch = {
  lnStart: number;
  lnEnd: number;
  start: number;
  end: number;
  nlPos: number[];
};
export function* searchText(allText: string, searchQuery: string): Generator<ScanMatch> {
  if (searchQuery === null) return [];
  let startPos = 0;
  //the line number char is on
  const lnMap = [0];
  //the char number of a new line number
  const nlMap: number[] = [];
  let ln = 0;
  for (let i = 0; i < allText.length; i++) {
    lnMap[i] = ln;
    if (allText[i] === "\n") {
      ln++;
      nlMap[ln] = i;
    }
  }

  while (startPos < allText.length) {
    const index = allText.toLowerCase().indexOf(searchQuery.toLowerCase(), startPos);
    if (index === -1) break;
    const nlPos = [...new Set(lnMap.slice(index, index + searchQuery.length - 1))]
      .map((nl) => nlMap[nl])
      .filter(Boolean);
    yield {
      nlPos,
      lnStart: lnMap[index]!,
      lnEnd: lnMap[index + searchQuery.length - 1]!,
      start: index,
      end: index + searchQuery.length - 1,
    };
    startPos = index + searchQuery.length;
  }
}

function windowResult({ nlPos, lnStart, lnEnd, start, end }: ScanMatch, text: string, maxLength = 120) {
  const matchEnd = nlPos.length === 1 ? end : nlPos[1]!;
  const matchLine = text.slice(start, nlPos[1]!);
  const lineCount = nlPos.length;
  const offsetStart = start - nlPos[0]!;
  const offsetEnd = matchEnd - nlPos[0]!;
  const lineCount = nlPos.length;
  const matchLength = offsetEnd - offsetStart;
  const lineLength = matchLine.length;

  if (offsetStart === 0) {
    // ^Foobar...$
  } else if (offsetEnd === matchLength) {
    if (matchLength > maxLength) {
      return "..." + text.slice(start, end).slice(0, maxLength);
    }
    // ^...Foobar$
  } else {
  }

  /*
  ^Foobar...$
  ^...Foobar...$
  */
}
// ahhhhhhhfoo
// bar
// bizz
// bazz
/*

one
needle
three



*/
