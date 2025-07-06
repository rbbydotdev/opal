// hooks/useReactDragImage.ts
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A React 19-compatible hook to use a React component as the drag image.
 * It automatically centers the drag preview on the user's cursor.
 *
 * @returns An object containing:
 *  - `setDragImage`: A function to call in `onDragStart` to set the drag image.
 *  - `DragImagePortal`: A component to render at the top level of your app.
 */
export const useDragImage = () => {
  const [dragPreview, setDragPreview] = useState<ReactElement | null>(null);
  const eventRef = useRef<React.DragEvent | null>(null);
  const dragNodeRef = useRef<Element | null>(null);

  useEffect(() => {
    // This effect runs after the dragPreview state has been set and the
    // component has been rendered into the portal.
    if (dragPreview) {
      const event = eventRef.current;
      const dragImageNode = dragNodeRef.current;

      if (event && dragImageNode) {
        // --- NEW: Measure the component and calculate center offset ---
        const rect = dragImageNode.getBoundingClientRect();
        const offsetX = rect.width / 2;
        const offsetY = rect.height / 2;
        // --- End of New Logic ---

        event.dataTransfer.setDragImage(dragImageNode, offsetX, offsetY);

        // Schedule the cleanup to remove the temporary component from the DOM.
        setTimeout(() => {
          setDragPreview(null);
          eventRef.current = null;
        }, 0);
      }
    }
  }, [dragPreview]); // This effect depends only on the `dragPreview` state.

  /**
   * Sets the drag image to a React component. The hook will handle rendering it
   * and centering it on the cursor.
   * @param event The native React.DragEvent from `onDragStart`.
   * @param component The React component (JSX) to use as the image.
   */
  const setReactDragImage = (event: React.DragEvent, component: ReactElement) => {
    // Store the event for use in the useEffect.
    eventRef.current = event;

    // Clone the component to attach our persistent ref.
    const componentWithRef = React.cloneElement(component as React.ReactElement<{ ref: unknown }>, {
      ref: dragNodeRef,
    });

    // Set state to trigger the useEffect.
    setDragPreview(componentWithRef);
  };

  const DragImagePortal = dragPreview ? createPortal(dragPreview, document.body) : null;

  return { setReactDragImage, DragImagePortal };
};
