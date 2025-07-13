import { useCellValueForRealm } from "@/components/useCellValueForRealm";
import { usePublisherForRealm } from "@/components/usePublisherForRealm";
import { NodeRef, Realm } from "@mdxeditor/editor";

export function useCellForRealm<T>(cell: NodeRef<T>, realm: Realm | undefined) {
  return [useCellValueForRealm(cell, realm), usePublisherForRealm<T>(cell, realm)] as const;
}
