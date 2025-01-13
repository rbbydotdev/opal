// function findCommonAncestor(node1: HTMLElement, node2: HTMLElement): HTMLElement | null {
//   const ancestors1: Set<HTMLElement> = new Set();
//   let current: HTMLElement | null = node1;

//   while (current) {
//     ancestors1.add(current);
//     current = current.parentElement;
//   }

//   current = node2;
//   while (current) {
//     if (ancestors1.has(current)) {
//       return current;
//     }
//     current = current.parentElement;
//   }

//   return null;
// }

// function collectNodesToAncestor(node: HTMLElement, ancestor: HTMLElement): HTMLElement[] {
//   const nodes: HTMLElement[] = [];
//   let current: HTMLElement | null = node;

//   while (current && current !== ancestor) {
//     if (current.hasAttribute("data-node")) {
//       nodes.push(current);
//     }
//     current = current.parentElement;
//   }

//   if (ancestor.hasAttribute("data-node")) {
//     nodes.push(ancestor);
//   }

//   return nodes;
// }

// function getRangeArray(node1: HTMLElement, node2: HTMLElement): HTMLElement[] {
//   const commonAncestor = findCommonAncestor(node1, node2);
//   if (!commonAncestor) {
//     return [];
//   }

//   const nodes1 = collectNodesToAncestor(node1, commonAncestor);
//   const nodes2 = collectNodesToAncestor(node2, commonAncestor);

//   return [...nodes1.reverse(), ...nodes2];
// }
