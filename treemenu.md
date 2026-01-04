# Tree Menu Drag and Drop Documentation

## Overview

The webeditor has a comprehensive drag and drop system for moving Lexical editor nodes within the tree view menu. This system allows users to reorder and restructure content by dragging nodes (paragraphs, headings, lists, images, etc.) to new positions.

## Key Components

### 1. Main Hook: `useFileTreeDragDrop` (`/src/hooks/useFileTreeDragDrop.tsx`)

This is the primary hook that handles both file tree drag/drop and serves as the foundation for the lexical tree drag/drop functionality. It provides:

- `handleDragStart`: Sets up drag operation with node data
- `handleDragOver`: Visual feedback during drag
- `handleDrop`: Processes the drop operation
- `handleDragEnter/handleDragLeave`: Additional drag state management

**Key features:**
- Supports external file drops (images, markdown, docx, text files)
- Internal node movement between directories
- Data transfer preparation with workspace context

### 2. Lexical Tree View Components

#### `TreeViewMenu.tsx` (`/src/components/sidebar/tree-view-section/TreeViewMenu.tsx`)

The main tree view component that implements Lexical-specific drag and drop logic:

**Core drag/drop functionality:**
- `handleDrop`: Sophisticated node movement with list-aware logic
- `handleDragOver`: Position calculation (before/after/inside)
- `getHierarchyAwareDropPosition`: Ensures valid structural movements
- `handleListAwareDrop`: Complex list manipulation logic

**Advanced features:**
- **List-aware operations**: Handles different combinations of dragging lists, list items, and regular nodes
- **Hierarchical structure preservation**: Maintains proper heading/section nesting
- **Position-sensitive dropping**: Calculates drop position based on mouse position within target element
- **Visual feedback**: Border indicators showing drop position (before/after/inside)

#### `TreeViewMenuParent` and `TreeViewTreeMenuChild` Components

These components make individual tree nodes draggable:

**TreeViewMenuParent** (for container nodes like sections/headings):
- `onDragStart`: Collects all child node IDs using `inorderWalk`
- Sets `draggable` attribute and handles drag events

**TreeViewTreeMenuChild** (for leaf nodes like paragraphs, images):
- `onDragStart`: Sets single node ID for transfer
- Simpler drag handling for individual content nodes

### 3. Drag Preview System

#### `FileTreeDragPreview.tsx` (`/src/components/filetree/FileTreeDragPreview.tsx`)

Creates visual preview during drag operation:
- **Solitaire effect**: Stacked cards with rotation and offset
- **Node-specific icons**: Different icons for folders, files, images
- **Count indicator**: Shows number of nodes being dragged
- **Visual styling**: Shadows and borders for depth perception

#### `useDragImage` hook (`/src/features/filetree-drag-and-drop/useDragImage.ts`)

React 19-compatible hook for custom drag images:
- Creates portal-rendered drag preview
- Centers drag image on cursor automatically
- Handles cleanup after drag operation

#### `DragPreviewNode.tsx` (`/src/features/filetree-drag-and-drop/DragPreviewNode.tsx`)

Base component for drag previews with positioning and styling.

### 4. Data Transfer System

#### `prepareNodeDataTransfer` (`/src/features/filetree-copy-paste/prepareNodeDataTransfer.ts`)

Handles data preparation for drag operations:
- Sets up dataTransfer object with node information
- Includes workspace context and action type
- Used by both copy/paste and drag/drop systems

## Drag and Drop Logic Flow

### 1. Drag Start
1. User begins dragging a tree node
2. `onDragStart` handler in `TreeViewMenuParent` or `TreeViewTreeMenuChild` fires
3. Node IDs are collected (single node or all children via `inorderWalk`)
4. Data is set in `dataTransfer` object
5. Visual drag preview is created using `useDragImage` and `FileTreeDragPreview`

### 2. Drag Over
1. `handleDragOver` calculates mouse position relative to target element
2. Determines intended drop position (before/after/inside) based on Y coordinate
3. `getHierarchyAwareDropPosition` validates position based on node types:
   - Sections can only contain deeper sections or content
   - Content can go inside sections but not before/after at section level
   - List items have special positioning rules

### 3. Drop Processing
1. `handleDrop` extracts dragged node IDs from dataTransfer
2. Editor update transaction begins
3. `handleListAwareDrop` processes movement based on node types:

**List-aware operations:**
- **List → List**: Merges lists together
- **List → List Item**: Merges list into parent list
- **List Item → List**: Moves item to list
- **List Item → List Item**: Repositions within list structure
- **List → Non-List**: Places list adjacent to target
- **List Item → Non-List**: Creates new list wrapper
- **Non-List → List context**: Wraps in list item
- **Non-List → Non-List**: Basic repositioning

4. `wrapNodeIfNeeded` handles node type compatibility (e.g., wrapping images in paragraphs)
5. Lexical operations performed (`insertBefore`, `insertAfter`, `append`, `remove`)

## Data Structures

### LexicalTreeViewNode
```typescript
interface LexicalTreeViewNode {
  id: string;              // Unique view ID
  type: string;            // Lexical node type
  depth?: number;          // Nesting level
  displayText?: string | React.ReactElement;
  children?: LexicalTreeViewNode[];
  lexicalNodeId: string;   // Lexical node key
  isContainer?: boolean;   // Can contain children
}
```

## Integration Points

### 1. File Tree Integration
The same `useFileTreeDragDrop` hook is used for both file operations and as a base for lexical operations, providing consistency.

### 2. Editor Integration
Direct integration with Lexical editor through:
- `$getNodeByKey()` for node retrieval
- Editor update transactions for modifications
- DOM node mapping for visual highlighting

### 3. Tree Expander Integration
Uses `useTreeExpanderContext` for managing collapsed/expanded state during drag operations.

## Technical Considerations

### Performance
- Uses `inorderWalk` to efficiently collect node hierarchies
- Debounced drag state updates to prevent excessive re-renders
- Portal-based drag previews to avoid DOM manipulation

### Accessibility
- Maintains tab order and focus management
- Provides clear visual feedback for drop zones
- Supports keyboard navigation alongside drag/drop

### Error Handling
- Validates node existence before operations
- Graceful fallbacks for unsupported drop combinations
- Console warnings for invalid operations

## Dependencies

- **Lexical Editor**: Core editing functionality
- **MDXEditor**: React integration layer
- **React DnD patterns**: Event handling and state management
- **Tailwind CSS**: Visual feedback styling
- **Lucide Icons**: Node type indicators

This system provides a robust, user-friendly way to restructure content within Lexical documents while maintaining proper document structure and list semantics.