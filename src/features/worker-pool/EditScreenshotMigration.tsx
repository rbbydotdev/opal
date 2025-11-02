/**
 * Drop-in replacement examples for the current iframe screenshot system
 */

import React, { useEffect, useState } from 'react';
import { EditScreenshotProvider, useEditScreenshots } from './EditScreenshotProvider';
import { HistoryDocRecord } from '@/data/HistoryTypes';
import { cn } from '@/lib/utils';

// =============================================
// CURRENT IFRAME USAGE (for reference)
// =============================================

/*
// Current iframe approach from EditViewImage.tsx:

function useIframeImagePooled({ edit, workspaceId, id }) {
  const { work, flush } = useSnapApiPool();
  const [imageUrl, setImageUrl] = useState(null);
  
  useEffect(() => {
    if (edit.preview === null) {
      let worker = NewComlinkSnapshotPoolWorker(
        { editId: edit.edit_id, workspaceId, id },
        async ({ blob }) => {
          setImageUrl(URL.createObjectURL(blob));
        }
      );
      work(worker);
      return () => {
        flush();
        worker = null;
      };
    } else {
      setImageUrl(URL.createObjectURL(edit.preview));
    }
  }, [edit, id, flush, work, workspaceId]);
  
  return imageUrl;
}
*/

// =============================================
// NEW WEB WORKER REPLACEMENT
// =============================================

// Drop-in replacement hook with same signature and behavior
function useWorkerImagePooled({ 
  edit, 
  workspaceId, 
  id 
}: { 
  edit: HistoryDocRecord; 
  workspaceId: string; 
  id: string;
}) {
  const { getScreenshotWithCallback, cleanup } = useEditScreenshots();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Handle cached preview (same as iframe version)
    if (edit.preview !== null) {
      setImageUrl(URL.createObjectURL(edit.preview));
      return;
    }

    // Generate new screenshot using worker pool
    getScreenshotWithCallback(
      {
        workspaceId,
        editId: edit.edit_id,
        filePath: '/preview-doc.md' // Default file path
      },
      ({ url }) => {
        setImageUrl(url);
      }
    );

    return () => {
      // Cleanup is handled by the provider, but you could call cleanup() here if needed
    };
  }, [edit, id, workspaceId, getScreenshotWithCallback]);

  // Clean up URL on unmount (same as iframe version)
  useEffect(() => {
    return () => {
      try {
        if (imageUrl) {
          URL.revokeObjectURL(imageUrl);
        }
      } catch (e) {
        console.error(e);
      }
    };
  }, [imageUrl]);

  return imageUrl;
}

// Alternative: Promise-based approach (cleaner API)
function useWorkerImagePromise({ 
  edit, 
  workspaceId, 
  id 
}: { 
  edit: HistoryDocRecord; 
  workspaceId: string; 
  id: string;
}) {
  const { getScreenshot } = useEditScreenshots();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (edit.preview !== null) {
      setImageUrl(URL.createObjectURL(edit.preview));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { url } = await getScreenshot({
          workspaceId,
          editId: edit.edit_id,
          filePath: '/preview-doc.md'
        });
        
        if (!cancelled) {
          setImageUrl(url);
        }
      } catch (error) {
        console.error('Screenshot generation failed:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [edit, id, workspaceId, getScreenshot]);

  useEffect(() => {
    return () => {
      try {
        if (imageUrl) {
          URL.revokeObjectURL(imageUrl);
        }
      } catch (e) {
        console.error(e);
      }
    };
  }, [imageUrl]);

  return imageUrl;
}

// Imperative worker version (replaces useIframeImagePooledImperitiveWorker)
export function useWorkerImagePooledImperative({ workspaceId }: { workspaceId: string }) {
  const { getScreenshotWithCallback } = useEditScreenshots();

  return function previewForEdit(edit: HistoryDocRecord) {
    getScreenshotWithCallback(
      {
        workspaceId,
        editId: edit.edit_id,
        filePath: '/preview-doc.md'
      },
      ({ url, blob }) => {
        // Handle the result - could store in cache, trigger UI updates, etc.
        console.log(`Screenshot generated for edit ${edit.edit_id}:`, url);
      }
    );
  };
}

// =============================================
// DROP-IN REPLACEMENT COMPONENTS
// =============================================

// Exact replacement for EditViewImage component
export const EditViewImageWorker = ({
  workspaceId,
  edit,
  className,
}: {
  workspaceId: string;
  edit: HistoryDocRecord;
  className?: string;
}) => {
  const imageUrl = useWorkerImagePooled({ 
    edit, 
    workspaceId, 
    id: `${workspaceId}/${edit.id}` 
  });

  return imageUrl !== null ? (
    <div className="w-48 h-48"> {/* Simplified - replace with your ImageFileHoverCard */}
      <img 
        src={imageUrl} 
        className={cn("object-contain border border-border bg-white", className)} 
        alt="" 
      />
    </div>
  ) : (
    <div className={cn("border border-border", className)}></div>
  );
};

// Alternative with promise-based hook
export const EditViewImageWorkerPromise = ({
  workspaceId,
  edit,
  className,
}: {
  workspaceId: string;
  edit: HistoryDocRecord;
  className?: string;
}) => {
  const imageUrl = useWorkerImagePromise({ 
    edit, 
    workspaceId, 
    id: `${workspaceId}/${edit.id}` 
  });

  return imageUrl !== null ? (
    <div className="w-48 h-48">
      <img 
        src={imageUrl} 
        className={cn("object-contain border border-border bg-white", className)} 
        alt="" 
      />
    </div>
  ) : (
    <div className={cn("border border-border", className)}></div>
  );
};

// =============================================
// USAGE EXAMPLE IN APP
// =============================================

export function AppWithWorkerScreenshots() {
  return (
    <EditScreenshotProvider>
      {/* Your app components that use screenshots */}
      <div>
        {/* Components can now use useEditScreenshots() */}
      </div>
    </EditScreenshotProvider>
  );
}

// =============================================
// MIGRATION NOTES
// =============================================

export const MIGRATION_NOTES = {
  steps: [
    "1. Wrap your app with <EditScreenshotProvider>",
    "2. Replace useSnapApiPool() with useEditScreenshots()",
    "3. Replace NewComlinkSnapshotPoolWorker() with getScreenshot() calls",
    "4. Implement your screenshot logic in edit-screenshot-worker.ts",
    "5. Update file paths as needed (currently defaults to '/preview-doc.md')"
  ],
  
  breaking_changes: [
    "Worker pool API is different (but abstracted away)",
    "File path parameter is now required",
    "URL management is handled by provider (less manual cleanup needed)"
  ],
  
  benefits: [
    "True parallel processing with web workers",
    "Automatic URL lifecycle management", 
    "Built-in caching and error handling",
    "Same callback patterns for easy migration",
    "Promise-based API available for modern usage"
  ]
};