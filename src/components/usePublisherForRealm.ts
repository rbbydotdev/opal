import { NodeRef, Realm } from "@mdxeditor/editor";
import { useCallback } from "react";

export function usePublisherForRealm<T>(node: NodeRef<T>, realm: Realm | undefined) {
  realm?.register(node);
  return useCallback(
    (value: T) => {
      realm?.pub(node, value);
    },
    [realm, node]
  );
}
