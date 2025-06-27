import { useState } from "react";

/**
 * A hook to manage a dynamic list of items from a fixed set of possible IDs.
 *
 * @param allPossibleIds A readonly array of all possible string IDs,
 *        or a function that returns one. Use `as const` for type safety.
 * @param onActiveIdsChange An optional callback that fires with the new
 *        array of active IDs whenever the list changes.
 */
export const useDndList = <const T extends readonly string[]>(
  allValues: T | (() => T),
  allPossibleIds: T | (() => T),
  onActiveIdsChange?: (ids: T[number][]) => void
) => {
  // `DndId` becomes a union of all possible string literals from the tuple `T`.
  // e.g., "publish" | "sync" | "export" | "trash" | "files"
  type DndId = T[number];

  // A helper to resolve the IDs, whether it's a value or a function.
  const getInitialIds = (): T => {
    return typeof allPossibleIds === "function" ? allPossibleIds() : allPossibleIds;
  };

  // The state `dnds` holds the current, active list of IDs.
  const [dnds, setDnds] = useState<DndId[]>([
    // Initialize with a mutable copy of the initial IDs.
    ...getInitialIds(),
  ]);

  const toggleDnd = (id: DndId) => {
    setDnds((prevDnds) => {
      const newDndsSet = new Set(prevDnds);
      if (newDndsSet.has(id)) {
        newDndsSet.delete(id);
      } else {
        newDndsSet.add(id);
      }
      const result = Array.from(newDndsSet);

      // Now, `result` (which is `DndId[]`) correctly matches the expected
      // parameter type of `onActiveIdsChange`. No `as` assertion needed!
      onActiveIdsChange?.(result);

      return result;
    });
  };

  // A public setter to allow replacing the entire list of active IDs.
  const setDndList = (newDnds: DndId[]) => {
    // Create a copy to ensure immutability and prevent state mutation bugs.
    const newDndsCopy = [...newDnds];
    setDnds(newDndsCopy);
    onActiveIdsChange?.(newDndsCopy);
  };

  // An identity function, useful for mapping and providing stable keys in React.
  const dndId = (id: DndId): DndId => id;

  return {
    allValues,
    /** The current, dynamic list of active DnD items. */
    dnds,
    /** The original, complete, and ordered list of all possible DnD items. */
    toggleDnd,
    /** A function to overwrite the entire list of active DnD items. */
    setDnds: setDndList,
    /** An identity function for convenience (e.g., `key={dndId(item)}`). */
    dndId,
  };
};
