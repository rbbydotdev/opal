export const isFuzzyResult = <T = any>(result: unknown): result is Fuzzysort.KeyResult<T> => {
  return (result as Fuzzysort.KeyResult<T>).highlight !== undefined;
};
export const EMPTY_SEARCH_RESULT: Fuzzysort.KeyResults<any> = Object.assign([], {
  total: 0,
});
