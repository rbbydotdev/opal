# Drag and Drop for Lexical Tree Reordering

## Implementation Overview
Added drag and drop functionality to TreeMenu.tsx for reordering MDXEditor lexical tree nodes.

## Key Components

### Drag Setup
- Added `draggable` attribute to `TreeViewMenuParent` and `TreeViewTreeMenuChild`
- `onDragStart` handler sets `node.lexicalNodeId` as drag data
- Uses `e.dataTransfer.setData("text/plain", node.lexicalNodeId)`

### Drop Zones
- Each menu item wrapped in drop zone div with handlers:
  - `onDragOver` - calculates drop position (before/after) based on mouse Y position
  - `onDrop` - performs the lexical tree manipulation
  - `onDragLeave` - cleans up visual indicators

### Visual Feedback
- State: `dragOverId` and `dropPosition` track current drag state
- CSS classes: `border-t-2 border-ring` (before) or `border-b-2 border-ring` (after)
- Position calculated: `y < rect.height / 2 ? 'before' : 'after'`

### Lexical Tree Manipulation
```tsx
editor.update(() => {
  const draggedNode = lexical.$getNodeByKey(draggedNodeId);
  const targetNode = lexical.$getNodeByKey(targetNodeId);
  
  if (draggedNode && targetNode) {
    draggedNode.remove();
    
    if (position === 'before') {
      targetNode.insertBefore(draggedNode);
    } else {
      targetNode.insertAfter(draggedNode);
    }
  }
});
```

## Critical Details
- **Use `lexical.$getNodeByKey()`** not `editor.getElementByKey()` (only works for DOM elements)
- **Pass lexical node IDs** as drag data, not display node IDs
- **Direct tree manipulation** - no markdown conversion needed
- **MDXEditor integration** via `useRemoteMDXEditorRealm()` and `rootEditor$`