import { DirectoryHandleIDB } from "./DirectoryHandleIDB";

interface DirectoryHandleRecord {
  diskId: string;
  directoryName: string;
  lastAccessed: Date;
}

export class DirectoryHandleStore {
  private static handleCache = new Map<string, FileSystemDirectoryHandle>();

  static async storeHandle(diskId: string, handle: FileSystemDirectoryHandle): Promise<void> {
    // Store in memory cache
    this.handleCache.set(diskId, handle);

    // Store handle and metadata in raw IndexedDB
    try {
      await DirectoryHandleIDB.storeHandle(diskId, handle);
    } catch (error) {
      console.warn("DirectoryHandleStore: Failed to store directory handle:", error);
    }
  }

  static async getHandle(diskId: string): Promise<FileSystemDirectoryHandle | null> {
    // Check memory cache first
    const cachedHandle = this.handleCache.get(diskId);
    if (cachedHandle) {
      return cachedHandle;
    }

    // Try to get handle from raw IndexedDB
    try {
      const handle = await DirectoryHandleIDB.getHandle(diskId);
      if (handle) {
        // Store back in memory cache
        this.handleCache.set(diskId, handle);
        return handle;
      }
    } catch (error) {
      console.warn("DirectoryHandleStore: Failed to get handle from IndexedDB:", error);
      // Only re-throw if this is NOT a "not found" error
      if (error instanceof Error && !error.message.includes('not found')) {
        throw error;
      }
    }

    return null;
  }

  static async removeHandle(diskId: string): Promise<void> {
    this.handleCache.delete(diskId);
    try {
      await DirectoryHandleIDB.removeHandle(diskId);
    } catch (error) {
      console.warn("DirectoryHandleStore: Failed to remove directory handle:", error);
    }
  }

  static async getStoredMetadata(diskId: string): Promise<DirectoryHandleRecord | undefined> {
    try {
      const metadata = await DirectoryHandleIDB.getMetadata(diskId);
      return metadata
        ? {
            diskId,
            directoryName: metadata.directoryName,
            lastAccessed: metadata.lastAccessed,
          }
        : undefined;
    } catch (error) {
      console.warn("DirectoryHandleStore: Failed to get directory handle metadata:", error);
      return undefined;
    }
  }

  static hasHandle(diskId: string): boolean {
    return this.handleCache.has(diskId);
  }
}
