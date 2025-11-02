import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { WorkerPoolProvider, useWorkerPool } from './index';

// Worker API interface that you'll implement
interface EditScreenshotWorkerAPI {
  getEditScreenshot(params: {
    workspaceId: string;
    editId: number;
    filePath: string;
  }): Promise<Blob>;
}

// Screenshot result with managed URL
interface ScreenshotResult {
  url: string;
  blob: Blob;
}

// Context for URL management and caching
interface EditScreenshotContextValue {
  getScreenshot: (params: {
    workspaceId: string;
    editId: number; 
    filePath: string;
  }) => Promise<ScreenshotResult>;
  
  // For compatibility with current callback pattern
  getScreenshotWithCallback: (
    params: {
      workspaceId: string;
      editId: number;
      filePath: string;
    },
    callback: (result: ScreenshotResult) => void
  ) => void;
  
  cleanup: () => void;
}

const EditScreenshotContext = createContext<EditScreenshotContextValue | null>(null);

// Internal provider that wraps the worker pool
function EditScreenshotProviderInternal({ children }: { children: React.ReactNode }) {
  const { cmd } = useWorkerPool<EditScreenshotWorkerAPI>("edit-screenshot-worker");
  
  // URL management
  const urlCacheRef = useRef<Map<string, string>>(new Map());
  const [isReady, setIsReady] = useState(false);
  
  // Generate cache key
  const getCacheKey = useCallback((params: { workspaceId: string; editId: number; filePath: string }) => {
    return `${params.workspaceId}/${params.editId}/${params.filePath}`;
  }, []);
  
  // Main screenshot function
  const getScreenshot = useCallback(async (params: {
    workspaceId: string;
    editId: number;
    filePath: string;
  }): Promise<ScreenshotResult> => {
    const cacheKey = getCacheKey(params);
    
    // Check if we already have a URL for this screenshot
    const existingUrl = urlCacheRef.current.get(cacheKey);
    if (existingUrl) {
      // Return cached result (you might want to verify the blob still exists)
      return { url: existingUrl, blob: new Blob() }; // Placeholder blob
    }
    
    try {
      // Get screenshot from worker
      const blob = await cmd.getEditScreenshot(params);
      
      // Create object URL and cache it
      const url = URL.createObjectURL(blob);
      urlCacheRef.current.set(cacheKey, url);
      
      return { url, blob };
    } catch (error) {
      console.error('Screenshot generation failed:', error);
      throw error;
    }
  }, [cmd, getCacheKey]);
  
  // Callback-based version for compatibility with current pattern
  const getScreenshotWithCallback = useCallback((
    params: {
      workspaceId: string;
      editId: number;
      filePath: string;
    },
    callback: (result: ScreenshotResult) => void
  ) => {
    getScreenshot(params)
      .then(callback)
      .catch(error => {
        console.error('Screenshot callback failed:', error);
      });
  }, [getScreenshot]);
  
  // Cleanup function to revoke all URLs
  const cleanup = useCallback(() => {
    for (const url of urlCacheRef.current.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to revoke object URL:', error);
      }
    }
    urlCacheRef.current.clear();
  }, []);
  
  const contextValue: EditScreenshotContextValue = {
    getScreenshot,
    getScreenshotWithCallback,
    cleanup
  };
  
  return (
    <EditScreenshotContext.Provider value={contextValue}>
      {children}
    </EditScreenshotContext.Provider>
  );
}

// Combined provider that sets up both worker pool and screenshot management
export function EditScreenshotProvider({ children }: { children: React.ReactNode }) {
  return (
    <WorkerPoolProvider<EditScreenshotWorkerAPI>
      id="edit-screenshot-worker"
      src="/src/features/worker-pool/edit-screenshot-worker.ts"
      count={3}
    >
      <EditScreenshotProviderInternal>
        {children}
      </EditScreenshotProviderInternal>
    </WorkerPoolProvider>
  );
}

// Hook to use edit screenshots
export function useEditScreenshots(): EditScreenshotContextValue {
  const context = useContext(EditScreenshotContext);
  if (!context) {
    throw new Error('useEditScreenshots must be used within EditScreenshotProvider');
  }
  return context;
}