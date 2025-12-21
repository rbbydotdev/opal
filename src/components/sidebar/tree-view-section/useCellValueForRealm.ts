import { NodeRef, Realm } from "@mdxeditor/editor";
import React from "react";
export function useCellValueForRealm<T>(cell: NodeRef<T>, realm: Realm | undefined) {
  realm?.register(cell);

  const cb = React.useCallback((c: () => void) => realm?.sub(cell, c) || (() => {}), [realm, cell]);

  return React.useSyncExternalStore(
    cb,
    () => realm?.getValue(cell) ?? null,
    () => realm?.getValue(cell) ?? null
  );
}

export function usePublisherForRealm<T>(cell: NodeRef<T>, realm: Realm | undefined) {
  realm?.register(cell);
  return React.useCallback(
    (value: T) => {
      realm?.pub(cell, value);
    },
    [realm, cell]
  );
}
